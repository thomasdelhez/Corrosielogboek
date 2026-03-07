import os
import secrets

from fastapi import Depends, FastAPI, Header, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import String, case, cast, func, or_, select
from sqlalchemy.orm import Session, selectinload

from .db import Base, engine, get_db
from .models import Aircraft, AppUser, AuditEvent, Hole, HolePart, HoleStep, MdrCase, MdrRemark, MdrRequestDetail, NdiReport, Panel
from .schemas import (
    HoleCreate,
    HoleOut,
    HolePartIn,
    HoleStepIn,
    HoleUpdate,
    LoginIn,
    LoginOut,
    MdrCaseIn,
    MdrCaseOut,
    MdrRemarkIn,
    MdrRemarkOut,
    MdrRequestDetailOut,
    MdrStatusTransitionIn,
    NdiQueueRowOut,
    NdiReportIn,
    NdiReportOut,
    NdiStatusTransitionIn,
    OrderingTrackerRowOut,
)

app = FastAPI(title="F35 Corrosie Logboek API", version="0.2.1")

allowed_origins = [
    origin.strip()
    for origin in os.getenv("ALLOWED_ORIGINS", "http://127.0.0.1:4200,http://localhost:4200").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MDR_ALLOWED_STATUSES = {"Draft", "Awaiting Request", "Request", "Submit", "Resubmit", "In Review", "Approved", "Rejected", "Closed", "Submitted"}
MDR_TRANSITIONS: dict[str, set[str]] = {
    "Draft": {"Awaiting Request", "Request", "Submitted"},
    "Awaiting Request": {"Request", "Closed"},
    "Request": {"Submit", "Resubmit", "Closed"},
    "Submit": {"In Review", "Resubmit", "Closed"},
    "Resubmit": {"Submit", "In Review", "Closed"},
    "Submitted": {"In Review", "Resubmit", "Closed"},
    "In Review": {"Approved", "Rejected", "Resubmit", "Closed"},
    "Approved": {"Closed"},
    "Rejected": {"Resubmit", "Closed"},
    "Closed": set(),
}

TOKENS: dict[str, dict[str, str]] = {}
ROLE_LEVEL = {"engineer": 1, "reviewer": 2, "admin": 3}


def _validate_mdr_case_payload(payload: MdrCaseIn):
    status = (payload.status or "Draft").strip()
    if status not in MDR_ALLOWED_STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid MDR status: {status}")

    if status in {"Request", "Submit", "Resubmit", "Submitted", "In Review", "Approved", "Rejected", "Closed"}:
        if not payload.mdr_number:
            raise HTTPException(status_code=400, detail="mdr_number is required for this status")
        if not payload.subject:
            raise HTTPException(status_code=400, detail="subject is required for this status")

    if status in {"Submit", "Submitted", "In Review", "Approved", "Rejected", "Closed"} and not payload.submitted_by:
        raise HTTPException(status_code=400, detail="submitted_by is required for this status")


def _require_user(authorization: str | None, db: Session) -> dict[str, str]:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid bearer token")
    token = authorization.split(" ", 1)[1].strip()
    user = TOKENS.get(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    db_user = db.execute(select(AppUser).where(AppUser.username == user["username"], AppUser.is_active.is_(True))).scalar_one_or_none()
    if not db_user:
        raise HTTPException(status_code=401, detail="User not active")
    return {"username": db_user.username, "role": db_user.role}


def current_user(authorization: str | None = Header(default=None), db: Session = Depends(get_db)):
    return _require_user(authorization, db)


def require_role(min_role: str):
    def _dep(user=Depends(current_user)):
        if ROLE_LEVEL.get(user["role"], 0) < ROLE_LEVEL.get(min_role, 99):
            raise HTTPException(status_code=403, detail=f"Requires role {min_role} or higher")
        return user

    return _dep


def _audit(db: Session, action: str, entity: str, entity_id: int | None, username: str):
    db.add(AuditEvent(action=action, entity=entity, entity_id=entity_id, username=username))


@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)
    with Session(engine) as db:
        existing = db.execute(select(AppUser).limit(1)).scalar_one_or_none()
        if not existing:
            db.add_all(
                [
                    AppUser(username="engineer", password="engineer", role="engineer"),
                    AppUser(username="reviewer", password="reviewer", role="reviewer"),
                    AppUser(username="admin", password="admin", role="admin"),
                ]
            )
            db.commit()


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/api/v1/auth/login", response_model=LoginOut)
def login(payload: LoginIn, db: Session = Depends(get_db)):
    user = db.execute(
        select(AppUser).where(AppUser.username == payload.username, AppUser.password == payload.password, AppUser.is_active.is_(True))
    ).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = secrets.token_urlsafe(24)
    TOKENS[token] = {"username": user.username, "role": user.role}
    return {"token": token, "username": user.username, "role": user.role}


@app.get("/api/v1/auth/me")
def me(user=Depends(current_user)):
    return user


@app.get("/api/v1/aircraft")
def list_aircraft(db: Session = Depends(get_db), _user=Depends(current_user)):
    rows = db.execute(select(Aircraft).order_by(Aircraft.an.asc())).scalars().all()
    return [{"id": a.id, "an": a.an, "serial_number": a.serial_number} for a in rows]


@app.get("/api/v1/panels")
def list_panels(db: Session = Depends(get_db), aircraft_id: int | None = None, _user=Depends(current_user)):
    stmt = (
        select(
            Panel.id.label("id"),
            Panel.aircraft_id.label("aircraft_id"),
            Panel.panel_number.label("panel_number"),
            func.count(Hole.id).label("hole_count"),
        )
        .outerjoin(Hole, Hole.panel_id == Panel.id)
    )

    if aircraft_id is not None:
        stmt = stmt.where(Panel.aircraft_id == aircraft_id)

    rows = db.execute(stmt.group_by(Panel.id, Panel.aircraft_id, Panel.panel_number).order_by(Panel.id.asc())).all()

    return [
        {
            "id": r.id,
            "aircraft_id": r.aircraft_id,
            "panel_number": r.panel_number,
            "hole_count": int(r.hole_count or 0),
        }
        for r in rows
    ]


@app.get("/api/v1/ordering-tracker", response_model=list[OrderingTrackerRowOut])
def list_ordering_tracker(
    db: Session = Depends(get_db),
    _user=Depends(current_user),
    aircraft_id: int | None = None,
    panel_id: int | None = None,
    queue: str = Query(default="all", pattern="^(all|order_needed|order_status|delivery_status|created_holes)$"),
    q: str | None = None,
    limit: int = Query(default=300, ge=1, le=1000),
):
    ordered_parts = func.sum(case((HolePart.ordered_flag.is_(True), 1), else_=0))
    delivered_parts = func.sum(case((HolePart.delivered_flag.is_(True), 1), else_=0))
    pending_parts = func.sum(
        case((HolePart.part_number.is_not(None), case((HolePart.ordered_flag.is_(True), 0), else_=1)), else_=0)
    )

    stmt = (
        select(
            Hole.id.label("hole_id"),
            Hole.hole_number.label("hole_number"),
            Hole.panel_id.label("panel_id"),
            Panel.panel_number.label("panel_number"),
            Aircraft.id.label("aircraft_id"),
            Aircraft.an.label("aircraft_an"),
            Hole.inspection_status.label("inspection_status"),
            func.coalesce(ordered_parts, 0).label("ordered_parts"),
            func.coalesce(delivered_parts, 0).label("delivered_parts"),
            func.coalesce(pending_parts, 0).label("pending_parts"),
        )
        .join(Panel, Panel.id == Hole.panel_id)
        .outerjoin(Aircraft, Aircraft.id == Panel.aircraft_id)
        .outerjoin(HolePart, HolePart.hole_id == Hole.id)
        .group_by(Hole.id, Hole.hole_number, Hole.panel_id, Panel.panel_number, Aircraft.id, Aircraft.an, Hole.inspection_status)
    )

    if aircraft_id is not None:
        stmt = stmt.where(Panel.aircraft_id == aircraft_id)
    if panel_id is not None:
        stmt = stmt.where(Hole.panel_id == panel_id)
    if q:
        like_q = f"%{q.strip()}%"
        stmt = stmt.where(
            or_(
                cast(Hole.hole_number, String).ilike(like_q),
                cast(Panel.panel_number, String).ilike(like_q),
                Aircraft.an.ilike(like_q),
                Hole.inspection_status.ilike(like_q),
            )
        )

    rows = db.execute(stmt.order_by(Panel.panel_number.asc(), Hole.hole_number.asc()).limit(limit)).all()

    out = []
    for r in rows:
        order_needed = int(r.pending_parts or 0) > 0
        order_in_progress = int(r.ordered_parts or 0) > 0 and int(r.delivered_parts or 0) < int(r.ordered_parts or 0)
        delivery_in_progress = int(r.delivered_parts or 0) > 0 and int(r.delivered_parts or 0) < int(r.ordered_parts or 0)
        installation_ready = int(r.ordered_parts or 0) > 0 and int(r.delivered_parts or 0) >= int(r.ordered_parts or 0)

        if queue == "order_needed" and not order_needed:
            continue
        if queue == "order_status" and not order_in_progress:
            continue
        if queue == "delivery_status" and not delivery_in_progress:
            continue

        out.append(
            {
                "hole_id": r.hole_id,
                "hole_number": r.hole_number,
                "panel_id": r.panel_id,
                "panel_number": r.panel_number,
                "aircraft_id": r.aircraft_id,
                "aircraft_an": r.aircraft_an,
                "inspection_status": r.inspection_status,
                "ordered_parts": int(r.ordered_parts or 0),
                "delivered_parts": int(r.delivered_parts or 0),
                "pending_parts": int(r.pending_parts or 0),
                "order_needed": order_needed,
                "order_in_progress": order_in_progress,
                "delivery_in_progress": delivery_in_progress,
                "installation_ready": installation_ready,
            }
        )

    return out


def _get_hole_or_404(db: Session, hole_id: int) -> Hole:
    row = db.execute(
        select(Hole)
        .options(selectinload(Hole.steps), selectinload(Hole.parts))
        .where(Hole.id == hole_id)
    ).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Hole not found")
    return row


@app.post("/api/v1/panels/{panel_id}/holes", response_model=HoleOut, status_code=201)
def create_hole(panel_id: int, payload: HoleCreate, db: Session = Depends(get_db), user=Depends(require_role("engineer"))):
    panel = db.get(Panel, panel_id)
    if not panel:
        # temporary bootstrap convenience for early MVP testing
        panel = Panel(id=panel_id, panel_number=panel_id)
        db.add(panel)
        db.flush()

    existing = db.execute(
        select(Hole).where(Hole.panel_id == panel_id, Hole.hole_number == payload.hole_number)
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="Hole already exists for this panel")

    hole = Hole(
        panel_id=panel_id,
        hole_number=payload.hole_number,
        max_bp_diameter=payload.max_bp_diameter,
        final_hole_size=payload.final_hole_size,
        fit=payload.fit,
        mdr_code=payload.mdr_code,
        mdr_version=payload.mdr_version,
        ndi_name_initials=payload.ndi_name_initials,
        ndi_inspection_date=payload.ndi_inspection_date,
        ndi_finished=payload.ndi_finished,
        inspection_status=payload.inspection_status,
    )
    db.add(hole)
    db.flush()

    for step in payload.steps:
        db.add(
            HoleStep(
                hole_id=hole.id,
                step_no=step.step_no,
                size_value=step.size_value,
                visual_damage_check=step.visual_damage_check,
                ream_flag=step.ream_flag,
                mdr_flag=step.mdr_flag,
                ndi_flag=step.ndi_flag,
            )
        )

    for part in payload.parts:
        db.add(
            HolePart(
                hole_id=hole.id,
                slot_no=part.slot_no,
                part_number=part.part_number,
                part_length=part.part_length,
                bushing_type=part.bushing_type,
                standard_custom=part.standard_custom,
                ordered_flag=part.ordered_flag,
                delivered_flag=part.delivered_flag,
                status=part.status,
            )
        )

    _audit(db, "create", "hole", hole.id, user["username"])
    db.commit()
    return _get_hole_or_404(db, hole.id)


@app.get("/api/v1/panels/{panel_id}/holes", response_model=list[HoleOut])
def list_holes(
    panel_id: int,
    db: Session = Depends(get_db),
    _user=Depends(current_user),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    inspection_status: str | None = None,
    mdr_code: str | None = None,
    q: str | None = None,
):
    stmt = (
        select(Hole)
        .options(selectinload(Hole.steps), selectinload(Hole.parts))
        .where(Hole.panel_id == panel_id)
    )

    if inspection_status:
        stmt = stmt.where(Hole.inspection_status == inspection_status)
    if mdr_code:
        stmt = stmt.where(Hole.mdr_code == mdr_code)
    if q:
        like_q = f"%{q.strip()}%"
        stmt = stmt.where(
            or_(
                cast(Hole.hole_number, String).ilike(like_q),
                Hole.mdr_code.ilike(like_q),
                Hole.fit.ilike(like_q),
                Hole.inspection_status.ilike(like_q),
            )
        )

    rows = db.execute(stmt.order_by(Hole.hole_number.asc()).limit(limit).offset(offset)).scalars().all()
    return rows


@app.get("/api/v1/holes/{hole_id}", response_model=HoleOut)
def get_hole(hole_id: int, db: Session = Depends(get_db), _user=Depends(current_user)):
    return _get_hole_or_404(db, hole_id)


@app.put("/api/v1/holes/{hole_id}", response_model=HoleOut)
def update_hole(hole_id: int, payload: HoleUpdate, db: Session = Depends(get_db), user=Depends(require_role("engineer"))):
    hole = _get_hole_or_404(db, hole_id)

    hole.max_bp_diameter = payload.max_bp_diameter
    hole.final_hole_size = payload.final_hole_size
    hole.fit = payload.fit
    hole.mdr_code = payload.mdr_code
    hole.mdr_version = payload.mdr_version
    hole.ndi_name_initials = payload.ndi_name_initials
    hole.ndi_inspection_date = payload.ndi_inspection_date
    hole.ndi_finished = payload.ndi_finished
    hole.inspection_status = payload.inspection_status

    db.commit()
    return _get_hole_or_404(db, hole_id)


@app.put("/api/v1/holes/{hole_id}/steps", response_model=HoleOut)
def replace_hole_steps(hole_id: int, payload: list[HoleStepIn], db: Session = Depends(get_db), user=Depends(require_role("engineer"))):
    hole = _get_hole_or_404(db, hole_id)

    step_nos = [s.step_no for s in payload]
    if len(step_nos) != len(set(step_nos)):
        raise HTTPException(status_code=400, detail="Duplicate step_no values are not allowed")

    db.query(HoleStep).filter(HoleStep.hole_id == hole.id).delete()
    db.flush()

    for step in payload:
        db.add(
            HoleStep(
                hole_id=hole.id,
                step_no=step.step_no,
                size_value=step.size_value,
                visual_damage_check=step.visual_damage_check,
                ream_flag=step.ream_flag,
                mdr_flag=step.mdr_flag,
                ndi_flag=step.ndi_flag,
            )
        )

    db.commit()
    return _get_hole_or_404(db, hole_id)


@app.put("/api/v1/holes/{hole_id}/parts", response_model=HoleOut)
def replace_hole_parts(hole_id: int, payload: list[HolePartIn], db: Session = Depends(get_db), user=Depends(require_role("engineer"))):
    hole = _get_hole_or_404(db, hole_id)

    slot_nos = [p.slot_no for p in payload]
    if len(slot_nos) != len(set(slot_nos)):
        raise HTTPException(status_code=400, detail="Duplicate slot_no values are not allowed")

    db.query(HolePart).filter(HolePart.hole_id == hole.id).delete()
    db.flush()

    for part in payload:
        db.add(
            HolePart(
                hole_id=hole.id,
                slot_no=part.slot_no,
                part_number=part.part_number,
                part_length=part.part_length,
                bushing_type=part.bushing_type,
                standard_custom=part.standard_custom,
                ordered_flag=part.ordered_flag,
                delivered_flag=part.delivered_flag,
                status=part.status,
            )
        )

    db.commit()
    return _get_hole_or_404(db, hole_id)


@app.get("/api/v1/mdr-cases", response_model=list[MdrCaseOut])
def list_mdr_cases(db: Session = Depends(get_db), panel_id: int | None = None, limit: int = 200, _user=Depends(current_user)):
    stmt = select(MdrCase).order_by(MdrCase.id.desc()).limit(limit)
    if panel_id is not None:
        stmt = stmt.where(MdrCase.panel_id == panel_id)
    return db.execute(stmt).scalars().all()


@app.post("/api/v1/mdr-cases", response_model=MdrCaseOut, status_code=201)
def create_mdr_case(payload: MdrCaseIn, db: Session = Depends(get_db), user=Depends(require_role("engineer"))):
    _validate_mdr_case_payload(payload)
    row = MdrCase(**payload.model_dump())
    db.add(row)
    db.flush()
    _audit(db, "create", "mdr_case", row.id, user["username"])
    db.commit()
    db.refresh(row)
    return row


@app.put("/api/v1/mdr-cases/{mdr_case_id}", response_model=MdrCaseOut)
def update_mdr_case(mdr_case_id: int, payload: MdrCaseIn, db: Session = Depends(get_db), user=Depends(require_role("engineer"))):
    _validate_mdr_case_payload(payload)
    row = db.get(MdrCase, mdr_case_id)
    if not row:
        raise HTTPException(status_code=404, detail="MDR case not found")
    for key, value in payload.model_dump().items():
        setattr(row, key, value)
    _audit(db, "update", "mdr_case", row.id, user["username"])
    db.commit()
    db.refresh(row)
    return row


@app.post("/api/v1/mdr-cases/{mdr_case_id}/transition", response_model=MdrCaseOut)
def transition_mdr_case(mdr_case_id: int, payload: MdrStatusTransitionIn, db: Session = Depends(get_db), user=Depends(require_role("reviewer"))):
    row = db.get(MdrCase, mdr_case_id)
    if not row:
        raise HTTPException(status_code=404, detail="MDR case not found")

    from_status = (row.status or "Draft").strip()
    to_status = (payload.to_status or "").strip()

    if to_status not in MDR_ALLOWED_STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid target status: {to_status}")

    allowed = MDR_TRANSITIONS.get(from_status, set())
    if to_status not in allowed:
        raise HTTPException(status_code=400, detail=f"Transition not allowed: {from_status} -> {to_status}")

    if to_status in {"Request", "Submit", "Resubmit", "Submitted", "In Review", "Approved", "Rejected", "Closed"}:
        if not row.mdr_number or not row.subject:
            raise HTTPException(status_code=400, detail="mdr_number and subject are required before this transition")
    if to_status in {"Submit", "Submitted", "In Review", "Approved", "Rejected", "Closed"} and not row.submitted_by:
        raise HTTPException(status_code=400, detail="submitted_by is required before this transition")

    row.status = to_status
    _audit(db, "transition", "mdr_case", row.id, user["username"])
    db.commit()
    db.refresh(row)
    return row


@app.post("/api/v1/mdr-cases/{mdr_case_id}/remarks", response_model=MdrRemarkOut, status_code=201)
def add_mdr_remark(mdr_case_id: int, payload: MdrRemarkIn, db: Session = Depends(get_db)):
    if not db.get(MdrCase, mdr_case_id):
        raise HTTPException(status_code=404, detail="MDR case not found")
    row = MdrRemark(mdr_case_id=mdr_case_id, **payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@app.delete("/api/v1/mdr-cases/{mdr_case_id}")
def delete_mdr_case(mdr_case_id: int, db: Session = Depends(get_db), user=Depends(require_role("admin"))):
    row = db.get(MdrCase, mdr_case_id)
    if not row:
        raise HTTPException(status_code=404, detail="MDR case not found")
    _audit(db, "delete", "mdr_case", row.id, user["username"])
    db.delete(row)
    db.commit()
    return {"deleted": True}


@app.get("/api/v1/ndi-dashboard", response_model=list[NdiQueueRowOut])
def list_ndi_dashboard(
    db: Session = Depends(get_db),
    _user=Depends(current_user),
    aircraft_id: int | None = None,
    panel_id: int | None = None,
    queue: str = Query(default="all", pattern="^(all|check_tracker|action_needed|report_needed|finished)$"),
    q: str | None = None,
    limit: int = Query(default=300, ge=1, le=1000),
):
    stmt = (
        select(
            Hole.id.label("hole_id"),
            Hole.hole_number.label("hole_number"),
            Hole.panel_id.label("panel_id"),
            Panel.panel_number.label("panel_number"),
            Aircraft.id.label("aircraft_id"),
            Aircraft.an.label("aircraft_an"),
            Hole.inspection_status.label("inspection_status"),
            Hole.ndi_name_initials.label("ndi_name_initials"),
            Hole.ndi_inspection_date.label("ndi_inspection_date"),
            Hole.ndi_finished.label("ndi_finished"),
        )
        .join(Panel, Panel.id == Hole.panel_id)
        .outerjoin(Aircraft, Aircraft.id == Panel.aircraft_id)
    )

    if aircraft_id is not None:
        stmt = stmt.where(Panel.aircraft_id == aircraft_id)
    if panel_id is not None:
        stmt = stmt.where(Hole.panel_id == panel_id)
    if q:
        like_q = f"%{q.strip()}%"
        stmt = stmt.where(
            or_(
                cast(Hole.hole_number, String).ilike(like_q),
                cast(Panel.panel_number, String).ilike(like_q),
                Aircraft.an.ilike(like_q),
                Hole.inspection_status.ilike(like_q),
            )
        )

    base_rows = db.execute(stmt.order_by(Panel.panel_number.asc(), Hole.hole_number.asc()).limit(limit)).all()

    out = []
    for r in base_rows:
        latest_report = db.execute(
            select(NdiReport)
            .where(NdiReport.hole_id == r.hole_id)
            .order_by(NdiReport.id.desc())
            .limit(1)
        ).scalar_one_or_none()

        inspection = (r.inspection_status or "").strip().lower()
        action_needed = inspection in {"corroded", "rifled", "markedascorroded", "markedasrifled"}
        finished = bool(r.ndi_finished)

        if finished:
            queue_status = "finished"
        elif action_needed:
            queue_status = "action_needed"
        elif r.ndi_name_initials or latest_report:
            queue_status = "report_needed"
        else:
            queue_status = "check_tracker"

        if queue != "all" and queue_status != queue:
            continue

        out.append(
            {
                "hole_id": r.hole_id,
                "hole_number": r.hole_number,
                "panel_id": r.panel_id,
                "panel_number": r.panel_number,
                "aircraft_id": r.aircraft_id,
                "aircraft_an": r.aircraft_an,
                "inspection_status": r.inspection_status,
                "ndi_name_initials": r.ndi_name_initials,
                "ndi_inspection_date": r.ndi_inspection_date,
                "latest_report_id": latest_report.id if latest_report else None,
                "latest_report_method": latest_report.method if latest_report else None,
                "latest_report_tools": latest_report.tools if latest_report else None,
                "queue_status": queue_status,
            }
        )

    return out


@app.post("/api/v1/holes/{hole_id}/ndi-status", response_model=HoleOut)
def transition_ndi_status(hole_id: int, payload: NdiStatusTransitionIn, db: Session = Depends(get_db), user=Depends(require_role("reviewer"))):
    hole = _get_hole_or_404(db, hole_id)
    to_status = (payload.to_status or "").strip()
    allowed = {"check_tracker", "action_needed", "report_needed", "finished"}
    if to_status not in allowed:
        raise HTTPException(status_code=400, detail=f"Invalid NDI target status: {to_status}")

    if to_status == "finished":
        latest_report = db.execute(
            select(NdiReport)
            .where(NdiReport.hole_id == hole_id)
            .order_by(NdiReport.id.desc())
            .limit(1)
        ).scalar_one_or_none()
        if not hole.ndi_name_initials or not hole.ndi_inspection_date:
            raise HTTPException(status_code=400, detail="ndi_name_initials and ndi_inspection_date are required before finishing")
        if not latest_report or not latest_report.method:
            raise HTTPException(status_code=400, detail="A report with method is required before finishing")
        hole.ndi_finished = True
    else:
        hole.ndi_finished = False

    _audit(db, "transition", "ndi_status", hole.id, user["username"])
    db.commit()
    return _get_hole_or_404(db, hole_id)


@app.get("/api/v1/holes/{hole_id}/ndi-reports", response_model=list[NdiReportOut])
def list_ndi_reports(hole_id: int, db: Session = Depends(get_db), _user=Depends(current_user)):
    return db.execute(select(NdiReport).where(NdiReport.hole_id == hole_id).order_by(NdiReport.id.desc())).scalars().all()


@app.post("/api/v1/holes/{hole_id}/ndi-reports", response_model=NdiReportOut, status_code=201)
def create_ndi_report(hole_id: int, payload: NdiReportIn, db: Session = Depends(get_db), user=Depends(require_role("engineer"))):
    hole = _get_hole_or_404(db, hole_id)

    data = payload.model_dump(exclude={"hole_id"})
    row = NdiReport(**data)
    row.hole_id = hole_id
    if row.panel_id is None:
        row.panel_id = hole.panel_id

    db.add(row)
    db.flush()
    _audit(db, "create", "ndi_report", row.id, user["username"])
    db.commit()
    db.refresh(row)
    return row


@app.delete("/api/v1/ndi-reports/{report_id}")
def delete_ndi_report(report_id: int, db: Session = Depends(get_db), user=Depends(require_role("admin"))):
    row = db.get(NdiReport, report_id)
    if not row:
        raise HTTPException(status_code=404, detail="NDI report not found")
    _audit(db, "delete", "ndi_report", row.id, user["username"])
    db.delete(row)
    db.commit()
    return {"deleted": True}


@app.get("/api/v1/panels/{panel_id}/mdr-request-details", response_model=list[MdrRequestDetailOut])
def list_mdr_request_details(panel_id: int, db: Session = Depends(get_db), limit: int = 200, _user=Depends(current_user)):
    return (
        db.execute(
            select(MdrRequestDetail)
            .where(MdrRequestDetail.panel_id == panel_id)
            .order_by(MdrRequestDetail.id.desc())
            .limit(limit)
        )
        .scalars()
        .all()
    )
