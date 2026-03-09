import hashlib
import os
import secrets
from datetime import datetime

from fastapi import Depends, FastAPI, Header, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from passlib.context import CryptContext
from sqlalchemy import String, case, cast, func, inspect, or_, select
from sqlalchemy.orm import Session, selectinload

from .db import Base, engine, get_db
from .models import (
    AuthSession,
    Aircraft,
    AppUser,
    AuditEvent,
    Hole,
    HolePart,
    HoleStep,
    LookupMdrOption,
    LookupStatusCode,
    MdrCase,
    MdrRemark,
    MdrRequestDetail,
    NdiReport,
    Panel,
)
from .schemas import (
    AuditEventOut,
    AuthMeOut,
    AuthMeUpdateIn,
    AppUserCreateIn,
    AppUserActiveUpdateIn,
    AppUserOut,
    AppUserRoleUpdateIn,
    AircraftCreateIn,
    CorrosionReportRowOut,
    GlobalSearchResultOut,
    HoleBatchCreateIn,
    MdrPowerpointInfoRowOut,
    HoleBatchCreateOut,
    HoleCreate,
    HoleOut,
    HolePartIn,
    HoleStepIn,
    HoleUpdate,
    LoginIn,
    LoginOut,
    LookupMdrOptionOut,
    LookupStatusCodeOut,
    LogoutOut,
    MdrCaseIn,
    MdrCaseOut,
    MdrRemarkIn,
    MdrRemarkOut,
    MdrRequestDetailIn,
    MdrRequestDetailOut,
    MdrStatusTransitionIn,
    HoleTrackerRowOut,
    InstallationTrackerRowOut,
    InspectionQueueRowOut,
    NdiQueueRowOut,
    NdiReportIn,
    NdiReportOut,
    NdiStatusTransitionIn,
    OrderingTrackerRowOut,
    PanelCreateIn,
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

ROLE_LEVEL = {"engineer": 1, "reviewer": 2, "admin": 3}
ALLOWED_USER_ROLES = {"engineer", "reviewer", "admin"}
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _has_text(value: str | None) -> bool:
    return bool(value and value.strip())


def _validate_mdr_case_fields(
    *,
    status: str,
    mdr_number: str | None,
    subject: str | None,
    submitted_by: str | None,
    request_date,
    need_date,
    approval_date,
    request_sent: bool,
    approved: bool,
) -> None:
    if status not in MDR_ALLOWED_STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid MDR status: {status}")

    if status in {"Request", "Submit", "Resubmit", "Submitted", "In Review", "Approved", "Rejected", "Closed"}:
        if not _has_text(mdr_number):
            raise HTTPException(status_code=400, detail="mdr_number is required for this status")
        if not _has_text(subject):
            raise HTTPException(status_code=400, detail="subject is required for this status")

    if status in {"Request", "Submit", "Resubmit", "Submitted", "In Review", "Approved", "Rejected", "Closed"} and request_date is None:
        raise HTTPException(status_code=400, detail="request_date is required for this status")

    if status in {"Submit", "Resubmit", "Submitted", "In Review", "Approved", "Rejected", "Closed"} and need_date is None:
        raise HTTPException(status_code=400, detail="need_date is required for this status")

    if status in {"Submit", "Submitted", "In Review", "Approved", "Rejected", "Closed"} and not _has_text(submitted_by):
        raise HTTPException(status_code=400, detail="submitted_by is required for this status")

    if status == "Approved" and approval_date is None:
        raise HTTPException(status_code=400, detail="approval_date is required for Approved status")

    if request_sent and request_date is None:
        raise HTTPException(status_code=400, detail="request_date is required when request_sent is true")

    if approved and approval_date is None:
        raise HTTPException(status_code=400, detail="approval_date is required when approved is true")


def _validate_mdr_case_payload(payload: MdrCaseIn):
    status = (payload.status or "Draft").strip()
    _validate_mdr_case_fields(
        status=status,
        mdr_number=payload.mdr_number,
        subject=payload.subject,
        submitted_by=payload.submitted_by,
        request_date=payload.request_date,
        need_date=payload.need_date,
        approval_date=payload.approval_date,
        request_sent=bool(payload.request_sent),
        approved=bool(payload.approved),
    )


def _token_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _require_user(authorization: str | None, db: Session) -> dict[str, str]:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid bearer token")
    token = authorization.split(" ", 1)[1].strip()
    session = db.execute(
        select(AuthSession).where(AuthSession.token_hash == _token_hash(token), AuthSession.revoked.is_(False))
    ).scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    db_user = db.execute(select(AppUser).where(AppUser.username == session.username, AppUser.is_active.is_(True))).scalar_one_or_none()
    if not db_user:
        raise HTTPException(status_code=401, detail="User not active")
    return {"username": db_user.username, "role": db_user.role, "token": token}


def current_user(authorization: str | None = Header(default=None), db: Session = Depends(get_db)):
    return _require_user(authorization, db)


def require_role(min_role: str):
    def _dep(user=Depends(current_user)):
        if ROLE_LEVEL.get(user["role"], 0) < ROLE_LEVEL.get(min_role, 99):
            raise HTTPException(status_code=403, detail=f"Requires role {min_role} or higher")
        return user

    return _dep


def require_any_roles(*roles: str):
    allowed = {r.strip().lower() for r in roles if r and r.strip()}

    def _dep(user=Depends(current_user)):
        if user["role"] not in allowed:
            raise HTTPException(status_code=403, detail=f"Requires one of roles: {', '.join(sorted(allowed))}")
        return user

    return _dep


def _audit(db: Session, action: str, entity: str, entity_id: int | None, username: str, details: str | None = None):
    db.add(AuditEvent(action=action, entity=entity, entity_id=entity_id, username=username, details=details))


def _validate_role_or_400(role: str) -> str:
    role_norm = (role or "").strip().lower()
    if role_norm not in ALLOWED_USER_ROLES:
        raise HTTPException(status_code=400, detail=f"Invalid role: {role}")
    return role_norm


def _active_admin_count(db: Session) -> int:
    return int(
        db.execute(
            select(func.count(AppUser.id)).where(AppUser.role == "admin", AppUser.is_active.is_(True))
        ).scalar_one()
        or 0
    )


@app.on_event("startup")
def startup():
    if os.getenv("AUTO_CREATE_SCHEMA", "false").lower() == "true":
        Base.metadata.create_all(bind=engine)

    if not inspect(engine).has_table("app_user"):
        return

    with Session(engine) as db:
        existing = db.execute(select(AppUser).limit(1)).scalar_one_or_none()
        if not existing:
            db.add_all(
                [
                    AppUser(username="engineer", password=pwd_context.hash("engineer"), role="engineer"),
                    AppUser(username="reviewer", password=pwd_context.hash("reviewer"), role="reviewer"),
                    AppUser(username="admin", password=pwd_context.hash("admin"), role="admin"),
                ]
            )
            db.commit()
        else:
            users = db.execute(select(AppUser)).scalars().all()
            changed = False
            for u in users:
                if not u.password.startswith("$2"):
                    u.password = pwd_context.hash(u.password)
                    changed = True
            if changed:
                db.commit()


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/api/v1/auth/login", response_model=LoginOut)
def login(payload: LoginIn, db: Session = Depends(get_db)):
    user = db.execute(
        select(AppUser).where(AppUser.username == payload.username, AppUser.is_active.is_(True))
    ).scalar_one_or_none()
    if not user or not pwd_context.verify(payload.password, user.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = secrets.token_urlsafe(32)
    db.add(AuthSession(token_hash=_token_hash(token), username=user.username, role=user.role, revoked=False))
    db.commit()
    return {"token": token, "username": user.username, "role": user.role}


@app.post("/api/v1/auth/logout", response_model=LogoutOut)
def logout(user=Depends(current_user), db: Session = Depends(get_db)):
    token_hash = _token_hash(user["token"])
    session = db.execute(select(AuthSession).where(AuthSession.token_hash == token_hash)).scalar_one_or_none()
    if session:
        session.revoked = True
        db.commit()
    return {"ok": True}


@app.get("/api/v1/auth/me")
def me(user=Depends(current_user)) -> AuthMeOut:
    return {"username": user["username"], "role": user["role"]}


@app.get("/api/v1/search", response_model=list[GlobalSearchResultOut])
def global_search(
    q: str = Query(..., min_length=1),
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    _user=Depends(current_user),
):
    query = q.strip()
    if not query:
        return []

    pattern = f"%{query}%"
    out: list[dict[str, str | None]] = []
    seen: set[tuple[str, str]] = set()

    aircraft_rows = (
        db.execute(select(Aircraft).where(or_(Aircraft.an.ilike(pattern), Aircraft.serial_number.ilike(pattern))).limit(limit)).scalars().all()
    )
    for a in aircraft_rows:
        route = f"/corrosion?aircraftId={a.id}"
        key = ("aircraft", route)
        if key in seen:
            continue
        seen.add(key)
        out.append(
            {
                "kind": "aircraft",
                "title": f"Aircraft {a.an}",
                "subtitle": f"Serial: {a.serial_number}" if a.serial_number else None,
                "route": route,
            }
        )

    panel_rows = (
        db.execute(
            select(Panel.id, Panel.panel_number, Panel.aircraft_id, Aircraft.an)
            .join(Aircraft, Aircraft.id == Panel.aircraft_id, isouter=True)
            .where(or_(cast(Panel.panel_number, String).ilike(pattern), Aircraft.an.ilike(pattern)))
            .limit(limit)
        )
        .all()
    )
    for r in panel_rows:
        route = f"/corrosion?aircraftId={r.aircraft_id}&panelId={r.id}"
        key = ("panel", route)
        if key in seen:
            continue
        seen.add(key)
        out.append(
            {
                "kind": "panel",
                "title": f"Panel {r.panel_number}",
                "subtitle": f"Aircraft: {r.an}" if r.an else None,
                "route": route,
            }
        )

    hole_rows = (
        db.execute(
            select(Hole.id, Hole.hole_number, Hole.mdr_code, Panel.panel_number, Aircraft.an)
            .join(Panel, Panel.id == Hole.panel_id, isouter=True)
            .join(Aircraft, Aircraft.id == Panel.aircraft_id, isouter=True)
            .where(
                or_(
                    cast(Hole.hole_number, String).ilike(pattern),
                    Hole.mdr_code.ilike(pattern),
                    Aircraft.an.ilike(pattern),
                    cast(Panel.panel_number, String).ilike(pattern),
                )
            )
            .limit(limit)
        )
        .all()
    )
    for r in hole_rows:
        route = f"/corrosion/{r.id}"
        key = ("hole", route)
        if key in seen:
            continue
        seen.add(key)
        subtitle_parts: list[str] = []
        if r.an:
            subtitle_parts.append(f"Aircraft {r.an}")
        if r.panel_number is not None:
            subtitle_parts.append(f"Panel {r.panel_number}")
        if r.mdr_code:
            subtitle_parts.append(f"MDR {r.mdr_code}")
        out.append(
            {
                "kind": "hole",
                "title": f"Hole #{r.hole_number}",
                "subtitle": " · ".join(subtitle_parts) if subtitle_parts else None,
                "route": route,
            }
        )

    mdr_rows = (
        db.execute(
            select(MdrCase.id, MdrCase.mdr_number, MdrCase.subject, MdrCase.status)
            .where(or_(MdrCase.mdr_number.ilike(pattern), MdrCase.subject.ilike(pattern), MdrCase.status.ilike(pattern)))
            .limit(limit)
        )
        .all()
    )
    for r in mdr_rows:
        route = f"/mdr?focusMdr={r.id}"
        key = ("mdr", route)
        if key in seen:
            continue
        seen.add(key)
        out.append(
            {
                "kind": "mdr",
                "title": f"MDR {r.mdr_number or f'#{r.id}'}",
                "subtitle": " · ".join([p for p in [r.subject, r.status] if p]) or None,
                "route": route,
            }
        )

    return out[:limit]


@app.put("/api/v1/auth/me", response_model=AuthMeOut)
def update_me(payload: AuthMeUpdateIn, user=Depends(current_user), db: Session = Depends(get_db)):
    db_user = db.execute(select(AppUser).where(AppUser.username == user["username"], AppUser.is_active.is_(True))).scalar_one_or_none()
    if not db_user:
        raise HTTPException(status_code=404, detail="Current user not found")

    if not payload.current_password or not pwd_context.verify(payload.current_password, db_user.password):
        raise HTTPException(status_code=401, detail="Current password is incorrect")

    new_username = (payload.new_username or "").strip()
    new_password = payload.new_password or ""
    if not new_username and not new_password:
        raise HTTPException(status_code=400, detail="Provide new_username and/or new_password")

    if new_username and new_username != db_user.username:
        existing = db.execute(select(AppUser).where(AppUser.username == new_username)).scalar_one_or_none()
        if existing:
            raise HTTPException(status_code=409, detail="Username already exists")
        old_username = db_user.username
        db_user.username = new_username
        sessions = db.execute(select(AuthSession).where(AuthSession.username == old_username, AuthSession.revoked.is_(False))).scalars().all()
        for session in sessions:
            session.username = new_username

    if new_password:
        if len(new_password) < 6:
            raise HTTPException(status_code=400, detail="new_password must be at least 6 characters")
        db_user.password = pwd_context.hash(new_password)

    change_parts: list[str] = []
    if new_username and new_username != user["username"]:
        change_parts.append(f"username:{user['username']}->{new_username}")
    if new_password:
        change_parts.append("password:changed")
    _audit(db, "update_self", "app_user", db_user.id, user["username"], details=", ".join(change_parts) or None)
    db.commit()
    return {"username": db_user.username, "role": db_user.role}


@app.get("/api/v1/users", response_model=list[AppUserOut])
def list_users(db: Session = Depends(get_db), _user=Depends(require_role("admin"))):
    return db.execute(select(AppUser).order_by(AppUser.username.asc())).scalars().all()


@app.get("/api/v1/users/audit-events", response_model=list[AuditEventOut])
def list_user_audit_events(
    db: Session = Depends(get_db),
    _user=Depends(require_role("admin")),
    limit: int = Query(default=100, ge=1, le=500),
    action: str | None = Query(default=None),
    username: str | None = Query(default=None),
    date_from: datetime | None = Query(default=None),
    date_to: datetime | None = Query(default=None),
):
    stmt = select(AuditEvent).where(AuditEvent.entity == "app_user")
    action_filter = (action or "").strip()
    username_filter = (username or "").strip()
    if action_filter:
        stmt = stmt.where(AuditEvent.action == action_filter)
    if username_filter:
        username_pattern = f"%{username_filter}%"
        target_username_pattern = f"%username:{username_filter}%"
        stmt = stmt.where(or_(AuditEvent.username.ilike(username_pattern), AuditEvent.details.ilike(target_username_pattern)))
    if date_from is not None:
        stmt = stmt.where(AuditEvent.created_at >= date_from)
    if date_to is not None:
        stmt = stmt.where(AuditEvent.created_at <= date_to)

    return db.execute(stmt.order_by(AuditEvent.created_at.desc(), AuditEvent.id.desc()).limit(limit)).scalars().all()


@app.post("/api/v1/users", response_model=AppUserOut, status_code=201)
def create_user(payload: AppUserCreateIn, db: Session = Depends(get_db), user=Depends(require_role("admin"))):
    username = (payload.username or "").strip()
    if not username:
        raise HTTPException(status_code=400, detail="username is required")
    if not payload.password:
        raise HTTPException(status_code=400, detail="password is required")

    role = _validate_role_or_400(payload.role)
    existing = db.execute(select(AppUser).where(AppUser.username == username)).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="Username already exists")

    row = AppUser(
        username=username,
        password=pwd_context.hash(payload.password),
        role=role,
        is_active=bool(payload.is_active),
    )
    db.add(row)
    db.flush()
    _audit(db, "create", "app_user", row.id, user["username"], details=f"username:{row.username}, role:{row.role}")
    db.commit()
    db.refresh(row)
    return row


@app.put("/api/v1/users/{user_id}/role", response_model=AppUserOut)
def update_user_role(user_id: int, payload: AppUserRoleUpdateIn, db: Session = Depends(get_db), user=Depends(require_role("admin"))):
    row = db.get(AppUser, user_id)
    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    if row.username == user["username"]:
        raise HTTPException(status_code=400, detail="Cannot change your own role from admin panel")

    previous_role = row.role
    next_role = _validate_role_or_400(payload.role)
    if previous_role == "admin" and next_role != "admin" and row.is_active and _active_admin_count(db) <= 1:
        raise HTTPException(status_code=400, detail="Cannot remove role of the last active admin")

    row.role = next_role
    _audit(db, "update_role", "app_user", row.id, user["username"], details=f"role:{previous_role}->{row.role}")
    db.commit()
    db.refresh(row)
    return row


@app.put("/api/v1/users/{user_id}/active", response_model=AppUserOut)
def update_user_active(
    user_id: int, payload: AppUserActiveUpdateIn, db: Session = Depends(get_db), user=Depends(require_role("admin"))
):
    row = db.get(AppUser, user_id)
    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    if row.username == user["username"] and not payload.is_active:
        raise HTTPException(status_code=400, detail="Cannot deactivate your own account")
    if row.role == "admin" and row.is_active and not payload.is_active and _active_admin_count(db) <= 1:
        raise HTTPException(status_code=400, detail="Cannot deactivate the last active admin")

    row.is_active = bool(payload.is_active)
    if not row.is_active:
        sessions = db.execute(select(AuthSession).where(AuthSession.username == row.username, AuthSession.revoked.is_(False))).scalars().all()
        for session in sessions:
            session.revoked = True
    _audit(db, "set_active", "app_user", row.id, user["username"], details=f"is_active:{row.is_active}")
    db.commit()
    db.refresh(row)
    return row


@app.delete("/api/v1/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db), user=Depends(require_role("admin"))):
    row = db.get(AppUser, user_id)
    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    if row.username == user["username"]:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    if row.role == "admin" and row.is_active and _active_admin_count(db) <= 1:
        raise HTTPException(status_code=400, detail="Cannot delete the last active admin")

    sessions = db.execute(select(AuthSession).where(AuthSession.username == row.username)).scalars().all()
    for session in sessions:
        session.revoked = True
    _audit(db, "delete", "app_user", row.id, user["username"], details=f"username:{row.username}, role:{row.role}")
    db.delete(row)
    db.commit()
    return {"deleted": True}


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


@app.post("/api/v1/aircraft", status_code=201)
def create_aircraft(payload: AircraftCreateIn, db: Session = Depends(get_db), user=Depends(require_role("admin"))):
    an = payload.an.strip()
    if not an:
        raise HTTPException(status_code=400, detail="an is required")

    existing = db.execute(select(Aircraft).where(Aircraft.an == an)).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="Aircraft AN already exists")

    row = Aircraft(an=an, serial_number=payload.serial_number)
    db.add(row)
    db.flush()
    _audit(db, "create", "aircraft", row.id, user["username"])
    db.commit()
    return {"id": row.id, "an": row.an, "serial_number": row.serial_number}


@app.post("/api/v1/panels", status_code=201)
def create_panel(payload: PanelCreateIn, db: Session = Depends(get_db), user=Depends(require_role("admin"))):
    aircraft = db.get(Aircraft, payload.aircraft_id)
    if not aircraft:
        raise HTTPException(status_code=404, detail="Aircraft not found")

    existing = db.execute(
        select(Panel).where(Panel.aircraft_id == payload.aircraft_id, Panel.panel_number == payload.panel_number)
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="Panel already exists for this aircraft")

    row = Panel(aircraft_id=payload.aircraft_id, panel_number=payload.panel_number)
    db.add(row)
    db.flush()
    _audit(db, "create", "panel", row.id, user["username"])
    db.commit()
    return {"id": row.id, "aircraft_id": row.aircraft_id, "panel_number": row.panel_number}


@app.get("/api/v1/lookups/status-codes", response_model=list[LookupStatusCodeOut])
def list_lookup_status_codes(db: Session = Depends(get_db), _user=Depends(current_user)):
    return db.execute(select(LookupStatusCode).order_by(LookupStatusCode.id.asc())).scalars().all()


@app.get("/api/v1/lookups/mdr-options", response_model=list[LookupMdrOptionOut])
def list_lookup_mdr_options(db: Session = Depends(get_db), _user=Depends(current_user)):
    return db.execute(select(LookupMdrOption).order_by(LookupMdrOption.id.asc())).scalars().all()


@app.get("/api/v1/reports/corrosion-tracker", response_model=list[CorrosionReportRowOut])
def corrosion_tracker_report(
    db: Session = Depends(get_db),
    _user=Depends(current_user),
    aircraft_id: int | None = None,
    panel_id: int | None = None,
    inspection_status: str | None = None,
    q: str | None = None,
    limit: int = Query(default=1000, ge=1, le=5000),
):
    stmt = (
        select(
            Hole.id.label("hole_id"),
            Aircraft.an.label("aircraft_an"),
            Panel.panel_number.label("panel_number"),
            Hole.hole_number.label("hole_number"),
            Hole.inspection_status.label("inspection_status"),
            Hole.mdr_code.label("mdr_code"),
            Hole.mdr_version.label("mdr_version"),
            Hole.ndi_finished.label("ndi_finished"),
            Hole.final_hole_size.label("final_hole_size"),
            Hole.max_bp_diameter.label("max_bp_diameter"),
            Hole.created_at.label("created_at"),
        )
        .join(Panel, Panel.id == Hole.panel_id)
        .outerjoin(Aircraft, Aircraft.id == Panel.aircraft_id)
    )

    if aircraft_id is not None:
        stmt = stmt.where(Panel.aircraft_id == aircraft_id)
    if panel_id is not None:
        stmt = stmt.where(Hole.panel_id == panel_id)
    if inspection_status:
        stmt = stmt.where(Hole.inspection_status == inspection_status)
    if q:
        like_q = f"%{q.strip()}%"
        stmt = stmt.where(
            or_(
                cast(Hole.hole_number, String).ilike(like_q),
                cast(Panel.panel_number, String).ilike(like_q),
                Aircraft.an.ilike(like_q),
                Hole.inspection_status.ilike(like_q),
                Hole.mdr_code.ilike(like_q),
            )
        )

    rows = db.execute(stmt.order_by(Panel.panel_number.asc(), Hole.hole_number.asc()).limit(limit)).all()

    return [
        {
            "hole_id": r.hole_id,
            "aircraft_an": r.aircraft_an,
            "panel_number": r.panel_number,
            "hole_number": r.hole_number,
            "inspection_status": r.inspection_status,
            "mdr_code": r.mdr_code,
            "mdr_version": r.mdr_version,
            "ndi_finished": bool(r.ndi_finished),
            "final_hole_size": r.final_hole_size,
            "max_bp_diameter": r.max_bp_diameter,
            "created_at": r.created_at,
        }
        for r in rows
    ]


@app.get("/api/v1/reports/mdr-powerpoint-info", response_model=list[MdrPowerpointInfoRowOut])
def mdr_powerpoint_info_report(
    db: Session = Depends(get_db),
    _user=Depends(current_user),
    aircraft_id: int | None = None,
    panel_id: int | None = None,
    status: str | None = None,
    q: str | None = None,
    limit: int = Query(default=1000, ge=1, le=5000),
):
    stmt = (
        select(
            MdrCase.id.label("mdr_case_id"),
            MdrCase.panel_id.label("panel_id"),
            Panel.panel_number.label("panel_number"),
            Aircraft.an.label("aircraft_an"),
            MdrCase.mdr_number.label("mdr_number"),
            MdrCase.mdr_version.label("mdr_version"),
            MdrCase.subject.label("subject"),
            MdrCase.status.label("status"),
            MdrCase.submitted_by.label("submitted_by"),
            MdrCase.request_date.label("request_date"),
            MdrCase.need_date.label("need_date"),
        )
        .outerjoin(Panel, Panel.id == MdrCase.panel_id)
        .outerjoin(Aircraft, Aircraft.id == Panel.aircraft_id)
    )

    if aircraft_id is not None:
        stmt = stmt.where(Panel.aircraft_id == aircraft_id)
    if panel_id is not None:
        stmt = stmt.where(MdrCase.panel_id == panel_id)
    if status:
        stmt = stmt.where(MdrCase.status == status)
    if q:
        like_q = f"%{q.strip()}%"
        stmt = stmt.where(
            or_(
                MdrCase.mdr_number.ilike(like_q),
                MdrCase.subject.ilike(like_q),
                MdrCase.status.ilike(like_q),
                Aircraft.an.ilike(like_q),
            )
        )

    rows = db.execute(stmt.order_by(MdrCase.id.desc()).limit(limit)).all()
    return [
        {
            "mdr_case_id": r.mdr_case_id,
            "panel_id": r.panel_id,
            "panel_number": r.panel_number,
            "aircraft_an": r.aircraft_an,
            "mdr_number": r.mdr_number,
            "mdr_version": r.mdr_version,
            "subject": r.subject,
            "status": r.status,
            "submitted_by": r.submitted_by,
            "request_date": r.request_date,
            "need_date": r.need_date,
        }
        for r in rows
    ]


@app.get("/api/v1/ordering-tracker", response_model=list[OrderingTrackerRowOut])
def list_ordering_tracker(
    db: Session = Depends(get_db),
    _user=Depends(current_user),
    aircraft_id: int | None = None,
    panel_id: int | None = None,
    queue: str = Query(default="all", pattern="^(all|ordering_overview|order_needed|order_status|delivery_status|created_holes)$"),
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

        created_hole = int(r.ordered_parts or 0) == 0 and int(r.delivered_parts or 0) == 0 and int(r.pending_parts or 0) == 0

        if queue == "order_needed" and not order_needed:
            continue
        if queue == "order_status" and not order_in_progress:
            continue
        if queue == "delivery_status" and not delivery_in_progress:
            continue
        if queue == "created_holes" and not created_hole:
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


def _ensure_panel_exists(db: Session, panel_id: int) -> None:
    panel = db.get(Panel, panel_id)
    if not panel:
        # temporary bootstrap convenience for early MVP testing
        panel = Panel(id=panel_id, panel_number=panel_id)
        db.add(panel)
        db.flush()


def _create_hole_row(db: Session, panel_id: int, payload: HoleCreate) -> Hole:
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
        mdr_resubmit=payload.mdr_resubmit,
        total_stackup_length=payload.total_stackup_length,
        stack_up=payload.stack_up,
        sleeve_bushings=payload.sleeve_bushings,
        countersinked=payload.countersinked,
        clean=payload.clean,
        cut_sleeve_bushing=payload.cut_sleeve_bushing,
        installed=payload.installed,
        primer=payload.primer,
        surface_corrosion=payload.surface_corrosion,
        nutplate_inspection=payload.nutplate_inspection,
        nutplate_surface_corrosion=payload.nutplate_surface_corrosion,
        total_structure_thickness=payload.total_structure_thickness,
        flexhone=payload.flexhone,
        flexndi=payload.flexndi,
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

    return hole


@app.post("/api/v1/panels/{panel_id}/holes", response_model=HoleOut, status_code=201)
def create_hole(panel_id: int, payload: HoleCreate, db: Session = Depends(get_db), user=Depends(require_any_roles("engineer", "admin"))):
    _ensure_panel_exists(db, panel_id)

    existing = db.execute(
        select(Hole).where(Hole.panel_id == panel_id, Hole.hole_number == payload.hole_number)
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="Hole already exists for this panel")

    hole = _create_hole_row(db, panel_id, payload)

    _audit(db, "create", "hole", hole.id, user["username"])
    db.commit()
    return _get_hole_or_404(db, hole.id)


@app.post("/api/v1/panels/{panel_id}/holes/batch", response_model=HoleBatchCreateOut, status_code=201)
def create_holes_batch(
    panel_id: int, payload: HoleBatchCreateIn, db: Session = Depends(get_db), user=Depends(require_any_roles("engineer", "admin"))
):
    _ensure_panel_exists(db, panel_id)

    existing_numbers = set(
        db.execute(select(Hole.hole_number).where(Hole.panel_id == panel_id)).scalars().all()
    )

    seen_in_payload: set[int] = set()
    created = 0
    skipped = 0
    errors = 0
    results = []

    for entry in payload.holes:
        hole_number = entry.hole_number

        if hole_number in seen_in_payload:
            skipped += 1
            results.append({"hole_number": hole_number, "status": "skipped", "detail": "Duplicate hole_number in payload"})
            continue
        seen_in_payload.add(hole_number)

        if hole_number in existing_numbers:
            skipped += 1
            results.append({"hole_number": hole_number, "status": "skipped", "detail": "Hole already exists for this panel"})
            continue

        step_nos = [s.step_no for s in entry.steps]
        if len(step_nos) != len(set(step_nos)):
            errors += 1
            results.append({"hole_number": hole_number, "status": "error", "detail": "Duplicate step_no values are not allowed"})
            continue

        slot_nos = [p.slot_no for p in entry.parts]
        if len(slot_nos) != len(set(slot_nos)):
            errors += 1
            results.append({"hole_number": hole_number, "status": "error", "detail": "Duplicate slot_no values are not allowed"})
            continue

        hole = _create_hole_row(db, panel_id, entry)
        existing_numbers.add(hole_number)
        created += 1
        _audit(db, "create", "hole", hole.id, user["username"])
        results.append({"hole_number": hole_number, "hole_id": hole.id, "status": "created"})

    db.commit()
    return {"created": created, "skipped": skipped, "errors": errors, "results": results}


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
def update_hole(hole_id: int, payload: HoleUpdate, db: Session = Depends(get_db), user=Depends(require_any_roles("engineer", "admin"))):
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
    hole.mdr_resubmit = payload.mdr_resubmit
    hole.total_stackup_length = payload.total_stackup_length
    hole.stack_up = payload.stack_up
    hole.sleeve_bushings = payload.sleeve_bushings
    hole.countersinked = payload.countersinked
    hole.clean = payload.clean
    hole.cut_sleeve_bushing = payload.cut_sleeve_bushing
    hole.installed = payload.installed
    hole.primer = payload.primer
    hole.surface_corrosion = payload.surface_corrosion
    hole.nutplate_inspection = payload.nutplate_inspection
    hole.nutplate_surface_corrosion = payload.nutplate_surface_corrosion
    hole.total_structure_thickness = payload.total_structure_thickness
    hole.flexhone = payload.flexhone
    hole.flexndi = payload.flexndi

    db.commit()
    return _get_hole_or_404(db, hole_id)


@app.put("/api/v1/holes/{hole_id}/steps", response_model=HoleOut)
def replace_hole_steps(
    hole_id: int, payload: list[HoleStepIn], db: Session = Depends(get_db), user=Depends(require_any_roles("engineer", "admin"))
):
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
def replace_hole_parts(
    hole_id: int, payload: list[HolePartIn], db: Session = Depends(get_db), user=Depends(require_any_roles("engineer", "admin"))
):
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
def create_mdr_case(payload: MdrCaseIn, db: Session = Depends(get_db), user=Depends(require_any_roles("engineer", "admin"))):
    _validate_mdr_case_payload(payload)
    row = MdrCase(**payload.model_dump())
    db.add(row)
    db.flush()
    _audit(db, "create", "mdr_case", row.id, user["username"])
    db.commit()
    db.refresh(row)
    return row


@app.put("/api/v1/mdr-cases/{mdr_case_id}", response_model=MdrCaseOut)
def update_mdr_case(
    mdr_case_id: int, payload: MdrCaseIn, db: Session = Depends(get_db), user=Depends(require_any_roles("engineer", "admin"))
):
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
def transition_mdr_case(
    mdr_case_id: int,
    payload: MdrStatusTransitionIn,
    db: Session = Depends(get_db),
    user=Depends(require_any_roles("reviewer", "admin")),
):
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

    _validate_mdr_case_fields(
        status=to_status,
        mdr_number=row.mdr_number,
        subject=row.subject,
        submitted_by=row.submitted_by,
        request_date=row.request_date,
        need_date=row.need_date,
        approval_date=row.approval_date,
        request_sent=bool(row.request_sent),
        approved=bool(row.approved),
    )

    row.status = to_status
    _audit(db, "transition", "mdr_case", row.id, user["username"])
    db.commit()
    db.refresh(row)
    return row


@app.get("/api/v1/mdr-cases/{mdr_case_id}/remarks", response_model=list[MdrRemarkOut])
def list_mdr_remarks(mdr_case_id: int, db: Session = Depends(get_db), _user=Depends(current_user)):
    if not db.get(MdrCase, mdr_case_id):
        raise HTTPException(status_code=404, detail="MDR case not found")
    return db.execute(
        select(MdrRemark)
        .where(MdrRemark.mdr_case_id == mdr_case_id)
        .order_by(MdrRemark.remark_index.asc(), MdrRemark.id.asc())
    ).scalars().all()


@app.post("/api/v1/mdr-cases/{mdr_case_id}/remarks", response_model=MdrRemarkOut, status_code=201)
def add_mdr_remark(
    mdr_case_id: int, payload: MdrRemarkIn, db: Session = Depends(get_db), user=Depends(require_any_roles("engineer", "admin"))
):
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


@app.get("/api/v1/installation-trackers", response_model=list[InstallationTrackerRowOut])
def list_installation_trackers(
    db: Session = Depends(get_db),
    _user=Depends(current_user),
    aircraft_id: int | None = None,
    panel_id: int | None = None,
    queue: str = Query(default="all", pattern="^(all|ready_for_installation|finished_installation)$"),
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
            func.coalesce(ordered_parts, 0).label("ordered_parts"),
            func.coalesce(delivered_parts, 0).label("delivered_parts"),
            func.coalesce(pending_parts, 0).label("pending_parts"),
        )
        .join(Panel, Panel.id == Hole.panel_id)
        .outerjoin(Aircraft, Aircraft.id == Panel.aircraft_id)
        .outerjoin(HolePart, HolePart.hole_id == Hole.id)
        .group_by(Hole.id, Hole.hole_number, Hole.panel_id, Panel.panel_number, Aircraft.id, Aircraft.an)
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
            )
        )

    rows = db.execute(stmt.order_by(Panel.panel_number.asc(), Hole.hole_number.asc()).limit(limit)).all()

    out = []
    for r in rows:
        ordered = int(r.ordered_parts or 0)
        delivered = int(r.delivered_parts or 0)
        pending = int(r.pending_parts or 0)

        installation_ready = ordered > 0 and delivered >= ordered
        queue_status = "finished_installation" if installation_ready else "ready_for_installation"

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
                "ordered_parts": ordered,
                "delivered_parts": delivered,
                "pending_parts": pending,
                "installation_ready": installation_ready,
                "queue_status": queue_status,
            }
        )

    return out


@app.get("/api/v1/hole-trackers", response_model=list[HoleTrackerRowOut])
def list_hole_trackers(
    db: Session = Depends(get_db),
    _user=Depends(current_user),
    aircraft_id: int | None = None,
    panel_id: int | None = None,
    queue: str = Query(default="all", pattern="^(all|max_bp|flexhone|reaming_steps)$"),
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
            Hole.max_bp_diameter.label("max_bp_diameter"),
            func.max(HoleStep.size_value).label("max_step_size"),
            func.sum(case((HoleStep.ream_flag.is_(True), 1), else_=0)).label("reaming_step_count"),
        )
        .join(Panel, Panel.id == Hole.panel_id)
        .outerjoin(Aircraft, Aircraft.id == Panel.aircraft_id)
        .outerjoin(HoleStep, HoleStep.hole_id == Hole.id)
        .group_by(Hole.id, Hole.hole_number, Hole.panel_id, Panel.panel_number, Aircraft.id, Aircraft.an, Hole.max_bp_diameter)
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
            )
        )

    rows = db.execute(stmt.order_by(Panel.panel_number.asc(), Hole.hole_number.asc()).limit(limit)).all()

    out = []
    for r in rows:
        max_bp = r.max_bp_diameter
        max_step_size = r.max_step_size
        reaming_step_count = int(r.reaming_step_count or 0)
        flexhone_needed = bool(max_bp is not None and max_step_size is not None and max_step_size > max_bp)

        queue_status = "max_bp"
        if reaming_step_count > 0:
            queue_status = "reaming_steps"
        elif flexhone_needed:
            queue_status = "flexhone"

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
                "max_bp_diameter": max_bp,
                "max_step_size": max_step_size,
                "flexhone_needed": flexhone_needed,
                "reaming_step_count": reaming_step_count,
                "queue_status": queue_status,
            }
        )

    return out


@app.get("/api/v1/inspection-dashboard", response_model=list[InspectionQueueRowOut])
def list_inspection_dashboard(
    db: Session = Depends(get_db),
    _user=Depends(current_user),
    aircraft_id: int | None = None,
    panel_id: int | None = None,
    queue: str = Query(default="all", pattern="^(all|to_be_inspected|marked_as_corroded|marked_as_rifled|marked_as_clean)$"),
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

    rows = db.execute(stmt.order_by(Panel.panel_number.asc(), Hole.hole_number.asc()).limit(limit)).all()

    out = []
    for r in rows:
        status = (r.inspection_status or "").strip().lower()
        if status in {"corroded", "markedascorroded", "marked as corroded"}:
            queue_status = "marked_as_corroded"
        elif status in {"rifled", "markedasrifled", "marked as rifled"}:
            queue_status = "marked_as_rifled"
        elif status in {"clean", "markedasclean", "marked as clean"}:
            queue_status = "marked_as_clean"
        else:
            queue_status = "to_be_inspected"

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
                "queue_status": queue_status,
            }
        )

    return out


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
def transition_ndi_status(
    hole_id: int, payload: NdiStatusTransitionIn, db: Session = Depends(get_db), user=Depends(require_any_roles("reviewer", "admin"))
):
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
def create_ndi_report(
    hole_id: int, payload: NdiReportIn, db: Session = Depends(get_db), user=Depends(require_any_roles("engineer", "admin"))
):
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


@app.post("/api/v1/panels/{panel_id}/mdr-request-details", response_model=MdrRequestDetailOut, status_code=201)
def create_mdr_request_detail(
    panel_id: int, payload: MdrRequestDetailIn, db: Session = Depends(get_db), user=Depends(require_any_roles("engineer", "admin"))
):
    panel = db.get(Panel, panel_id)
    if not panel:
        raise HTTPException(status_code=404, detail="Panel not found")
    data = payload.model_dump()
    data["panel_id"] = panel_id
    row = MdrRequestDetail(**data)
    db.add(row)
    db.flush()
    _audit(db, "create", "mdr_request_detail", row.id, user["username"])
    db.commit()
    db.refresh(row)
    return row


@app.put("/api/v1/mdr-request-details/{detail_id}", response_model=MdrRequestDetailOut)
def update_mdr_request_detail(
    detail_id: int, payload: MdrRequestDetailIn, db: Session = Depends(get_db), user=Depends(require_any_roles("engineer", "admin"))
):
    row = db.get(MdrRequestDetail, detail_id)
    if not row:
        raise HTTPException(status_code=404, detail="MDR request detail not found")
    for key, value in payload.model_dump().items():
        setattr(row, key, value)
    _audit(db, "update", "mdr_request_detail", row.id, user["username"])
    db.commit()
    db.refresh(row)
    return row


@app.delete("/api/v1/mdr-request-details/{detail_id}")
def delete_mdr_request_detail(detail_id: int, db: Session = Depends(get_db), user=Depends(require_role("admin"))):
    row = db.get(MdrRequestDetail, detail_id)
    if not row:
        raise HTTPException(status_code=404, detail="MDR request detail not found")
    _audit(db, "delete", "mdr_request_detail", row.id, user["username"])
    db.delete(row)
    db.commit()
    return {"deleted": True}
