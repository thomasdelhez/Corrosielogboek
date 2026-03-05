from fastapi import Depends, FastAPI, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from .db import Base, engine, get_db
from .models import Hole, HolePart, HoleStep, Panel
from .schemas import HoleCreate, HoleOut

app = FastAPI(title="F35 Corrosie Logboek API", version="0.1.0")


@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)


@app.get("/health")
def health():
    return {"ok": True}


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

    created = db.execute(
        select(Hole)
        .options(selectinload(Hole.steps), selectinload(Hole.parts))
        .where(Hole.id == hole.id)
    ).scalar_one()
    return created


@app.get("/api/v1/panels/{panel_id}/holes", response_model=list[HoleOut])
def list_holes(panel_id: int, db: Session = Depends(get_db), limit: int = 100, offset: int = 0):
    rows = db.execute(
        select(Hole)
        .options(selectinload(Hole.steps), selectinload(Hole.parts))
        .where(Hole.panel_id == panel_id)
        .order_by(Hole.hole_number.asc())
        .limit(limit)
        .offset(offset)
    ).scalars().all()
    return rows


@app.get("/api/v1/holes/{hole_id}", response_model=HoleOut)
def get_hole(hole_id: int, db: Session = Depends(get_db)):
    row = db.execute(
        select(Hole)
        .options(selectinload(Hole.steps), selectinload(Hole.parts))
        .where(Hole.id == hole_id)
    ).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Hole not found")
    return row
