import os

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import String, cast, func, or_, select
from sqlalchemy.orm import Session, selectinload

from .db import Base, engine, get_db
from .models import Hole, HolePart, HoleStep, MdrCase, MdrRemark, MdrRequestDetail, NdiReport, Panel
from .schemas import (
    HoleCreate,
    HoleOut,
    HolePartIn,
    HoleStepIn,
    HoleUpdate,
    MdrCaseIn,
    MdrCaseOut,
    MdrRemarkIn,
    MdrRemarkOut,
    MdrRequestDetailOut,
    NdiReportIn,
    NdiReportOut,
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


@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)


@app.get("/health")
def health():
    return {"ok": True}


@app.get("/api/v1/panels")
def list_panels(db: Session = Depends(get_db)):
    rows = db.execute(
        select(
            Panel.id.label("id"),
            Panel.panel_number.label("panel_number"),
            func.count(Hole.id).label("hole_count"),
        )
        .outerjoin(Hole, Hole.panel_id == Panel.id)
        .group_by(Panel.id, Panel.panel_number)
        .order_by(Panel.id.asc())
    ).all()

    return [
        {
            "id": r.id,
            "panel_number": r.panel_number,
            "hole_count": int(r.hole_count or 0),
        }
        for r in rows
    ]


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
def create_hole(panel_id: int, payload: HoleCreate, db: Session = Depends(get_db)):
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

    db.commit()
    return _get_hole_or_404(db, hole.id)


@app.get("/api/v1/panels/{panel_id}/holes", response_model=list[HoleOut])
def list_holes(
    panel_id: int,
    db: Session = Depends(get_db),
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
def get_hole(hole_id: int, db: Session = Depends(get_db)):
    return _get_hole_or_404(db, hole_id)


@app.put("/api/v1/holes/{hole_id}", response_model=HoleOut)
def update_hole(hole_id: int, payload: HoleUpdate, db: Session = Depends(get_db)):
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
def replace_hole_steps(hole_id: int, payload: list[HoleStepIn], db: Session = Depends(get_db)):
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
def replace_hole_parts(hole_id: int, payload: list[HolePartIn], db: Session = Depends(get_db)):
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
def list_mdr_cases(db: Session = Depends(get_db), panel_id: int | None = None, limit: int = 200):
    stmt = select(MdrCase).order_by(MdrCase.id.desc()).limit(limit)
    if panel_id is not None:
        stmt = stmt.where(MdrCase.panel_id == panel_id)
    return db.execute(stmt).scalars().all()


@app.post("/api/v1/mdr-cases", response_model=MdrCaseOut, status_code=201)
def create_mdr_case(payload: MdrCaseIn, db: Session = Depends(get_db)):
    row = MdrCase(**payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@app.put("/api/v1/mdr-cases/{mdr_case_id}", response_model=MdrCaseOut)
def update_mdr_case(mdr_case_id: int, payload: MdrCaseIn, db: Session = Depends(get_db)):
    row = db.get(MdrCase, mdr_case_id)
    if not row:
        raise HTTPException(status_code=404, detail="MDR case not found")
    for key, value in payload.model_dump().items():
        setattr(row, key, value)
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
def delete_mdr_case(mdr_case_id: int, db: Session = Depends(get_db)):
    row = db.get(MdrCase, mdr_case_id)
    if not row:
        raise HTTPException(status_code=404, detail="MDR case not found")
    db.delete(row)
    db.commit()
    return {"deleted": True}


@app.get("/api/v1/holes/{hole_id}/ndi-reports", response_model=list[NdiReportOut])
def list_ndi_reports(hole_id: int, db: Session = Depends(get_db)):
    return db.execute(select(NdiReport).where(NdiReport.hole_id == hole_id).order_by(NdiReport.id.desc())).scalars().all()


@app.post("/api/v1/holes/{hole_id}/ndi-reports", response_model=NdiReportOut, status_code=201)
def create_ndi_report(hole_id: int, payload: NdiReportIn, db: Session = Depends(get_db)):
    hole = _get_hole_or_404(db, hole_id)

    data = payload.model_dump(exclude={"hole_id"})
    row = NdiReport(**data)
    row.hole_id = hole_id
    if row.panel_id is None:
        row.panel_id = hole.panel_id

    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@app.delete("/api/v1/ndi-reports/{report_id}")
def delete_ndi_report(report_id: int, db: Session = Depends(get_db)):
    row = db.get(NdiReport, report_id)
    if not row:
        raise HTTPException(status_code=404, detail="NDI report not found")
    db.delete(row)
    db.commit()
    return {"deleted": True}


@app.get("/api/v1/panels/{panel_id}/mdr-request-details", response_model=list[MdrRequestDetailOut])
def list_mdr_request_details(panel_id: int, db: Session = Depends(get_db), limit: int = 200):
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
