#!/usr/bin/env python3
"""Import core corrosion data from Access (.accdb) into PostgreSQL MVP schema.

Scope v1:
- AircraftNrT -> aircraft
- PanelNrT -> panel
- HoleRepairT -> hole + hole_step + hole_part

Requires:
- mdbtools installed (`mdb-export` available in PATH)
- DATABASE_URL env var set (or defaults from app.db)
"""

from __future__ import annotations

import argparse
import csv
import io
import os
import subprocess
import sys
from datetime import datetime
from pathlib import Path
from typing import Any

from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

# Ensure backend root is importable when running as: python scripts/import_access.py
BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.db import SessionLocal
from app.models import Aircraft, Hole, HolePart, HoleStep, MdrCase, MdrRemark, MdrRequestDetail, NdiReport, Panel


def mdb_export_rows(db_path: str, table: str) -> list[dict[str, str]]:
    result = subprocess.run(
        ["mdb-export", db_path, table],
        check=True,
        capture_output=True,
        text=True,
    )
    reader = csv.DictReader(io.StringIO(result.stdout))
    return list(reader)


def to_int(value: str | None) -> int | None:
    if value is None:
        return None
    v = value.strip()
    if not v:
        return None
    try:
        return int(float(v))
    except ValueError:
        return None


def to_bool(value: str | None) -> bool | None:
    if value is None:
        return None
    v = value.strip().lower()
    if v in {"", "null"}:
        return None
    if v in {"1", "true", "yes", "y"}:
        return True
    if v in {"0", "false", "no", "n"}:
        return False
    return None


def to_text(value: str | None) -> str | None:
    if value is None:
        return None
    v = value.strip()
    return v if v else None


def to_dt(value: str | None) -> datetime | None:
    if value is None:
        return None
    v = value.strip()
    if not v:
        return None

    patterns = [
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d %H:%M",
        "%Y-%m-%d",
        "%d/%m/%Y %H:%M:%S",
        "%d/%m/%Y %H:%M",
        "%d/%m/%Y",
        "%m/%d/%Y %H:%M:%S",
        "%m/%d/%Y %H:%M",
        "%m/%d/%Y",
    ]

    for pattern in patterns:
        try:
            return datetime.strptime(v, pattern)
        except ValueError:
            pass

    try:
        return datetime.fromisoformat(v)
    except ValueError:
        return None


def import_aircraft(session: Session, db_path: str) -> dict[int, int]:
    rows = mdb_export_rows(db_path, "AircraftNrT")
    id_map: dict[int, int] = {}
    canonical_by_an: dict[str, int] = {}

    for row in rows:
        old_id = to_int(row.get("UAircraftID"))
        if old_id is None:
            continue

        an = to_text(row.get("AN")) or f"AN-{old_id}"
        serial_number = to_text(row.get("SerialNumber"))
        arrival_date = to_dt(row.get("ArrivalDate"))

        if an in canonical_by_an:
            # Duplicate AN in Access source: map this old aircraft id to canonical record.
            id_map[old_id] = canonical_by_an[an]
            continue

        aircraft = Aircraft(
            id=old_id,
            an=an,
            serial_number=serial_number,
            arrival_date=arrival_date,
        )
        session.merge(aircraft)
        canonical_by_an[an] = old_id
        id_map[old_id] = old_id

    return id_map


def import_panels(session: Session, db_path: str, aircraft_ids: dict[int, int]) -> dict[int, int]:
    rows = mdb_export_rows(db_path, "PanelNrT")
    id_map: dict[int, int] = {}

    for row in rows:
        panel_id = to_int(row.get("UPanelID"))
        if panel_id is None:
            continue

        aircraft_fk = to_int(row.get("AN"))
        aircraft_id = aircraft_ids.get(aircraft_fk) if aircraft_fk is not None else None

        panel = Panel(
            id=panel_id,
            aircraft_id=aircraft_id,
            panel_number=to_int(row.get("Panel Number")) or panel_id,
            surface=to_text(row.get("Upper/Lower")),
            start_inspection_date=to_dt(row.get("Start Inspection Date")),
        )
        session.merge(panel)
        id_map[panel_id] = panel_id

    return id_map


def import_holes(session: Session, db_path: str, panel_ids: dict[int, int]) -> None:
    rows = mdb_export_rows(db_path, "HoleRepairT")

    # Pass 1: guarantee that every referenced panel exists.
    referenced_panel_keys: set[int] = set()
    for row in rows:
        panel_key = to_int(row.get("PanelID"))
        if panel_key is not None:
            referenced_panel_keys.add(panel_key)

    for panel_key in sorted(referenced_panel_keys):
        panel_id = panel_ids.get(panel_key)
        if panel_id is None:
            panel_id = panel_key
            existing_panel = session.get(Panel, panel_id)
            if existing_panel is None:
                session.add(
                    Panel(
                        id=panel_id,
                        aircraft_id=None,
                        panel_number=panel_id,
                        surface=None,
                        start_inspection_date=None,
                    )
                )
            panel_ids[panel_key] = panel_id

    session.flush()

    # Pass 2: insert holes and child data.
    for row in rows:
        hole_id = to_int(row.get("UHoleID"))
        panel_key = to_int(row.get("PanelID"))
        hole_no = to_int(row.get("HoleID"))

        if hole_id is None or panel_key is None or hole_no is None:
            continue

        panel_id = panel_ids.get(panel_key)
        if panel_id is None:
            continue

        hole = Hole(
            id=hole_id,
            panel_id=panel_id,
            hole_number=hole_no,
            max_bp_diameter=to_int(row.get("MaxBPDiameter")),
            final_hole_size=to_int(row.get("FinalHoleSize")),
            fit=to_text(row.get("FIT")),
            mdr_code=to_text(row.get("MDRCode")),
            mdr_version=to_text(row.get("MDRVersion")),
            ndi_name_initials=to_text(row.get("NDINameInitials")),
            ndi_inspection_date=to_dt(row.get("NDIInspectionDate")),
            ndi_finished=to_bool(row.get("NDIFinished")) or False,
            inspection_status=to_text(row.get("InspectionStatus")),
        )
        session.merge(hole)

        # Step 0 (max bp)
        session.merge(
            HoleStep(
                hole_id=hole_id,
                step_no=0,
                size_value=to_int(row.get("MaxBPDiameter")),
                visual_damage_check=to_text(row.get("Visual Damage Check")),
                ream_flag=to_bool(row.get("REAM MAX B/P")),
                mdr_flag=to_bool(row.get("MDRmaxBP")),
                ndi_flag=to_bool(row.get("NDImaxBP")),
            )
        )

        # Steps 1..10
        for n in range(1, 11):
            size_v = to_int(row.get(f"Size ({n})"))
            visual_v = to_text(row.get(f"Visual Damage Check ({n})"))
            mdr_v = to_bool(row.get(f"MDR{n}"))
            ndi_v = to_bool(row.get(f"NDI{n}"))
            if size_v is None and visual_v is None and mdr_v is None and ndi_v is None:
                continue

            session.merge(
                HoleStep(
                    hole_id=hole_id,
                    step_no=n,
                    size_value=size_v,
                    visual_damage_check=visual_v,
                    ream_flag=None,
                    mdr_flag=mdr_v,
                    ndi_flag=ndi_v,
                )
            )

        # Parts 1..4
        for n in range(1, 5):
            part_number = to_text(row.get(f"Part Number {n}"))
            part_length = to_int(row.get(f"Length Part {n}"))
            bushing = to_text(row.get(f"SB/CS{n}"))
            std_cst = to_text(row.get(f"Std/Cst{n}"))
            ordered = to_bool(row.get(f"Ordered Item {n}"))
            delivered = to_bool(row.get(f"Delivered Item {n}"))
            status = to_text(row.get(f"PartStatus{n}"))

            if all(v is None for v in [part_number, part_length, bushing, std_cst, ordered, delivered, status]):
                continue

            session.merge(
                HolePart(
                    hole_id=hole_id,
                    slot_no=n,
                    part_number=part_number,
                    part_length=part_length,
                    bushing_type=bushing,
                    standard_custom=std_cst,
                    ordered_flag=ordered,
                    delivered_flag=delivered,
                    status=status,
                )
            )


def import_mdr(session: Session, db_path: str, panel_ids: dict[int, int]) -> None:
    rows = mdb_export_rows(db_path, "MDRStatusT")
    for row in rows:
        mdr_id = to_int(row.get("MDRID"))
        if mdr_id is None:
            continue

        panel_key = to_int(row.get("UPanelID"))
        panel_id = panel_ids.get(panel_key) if panel_key is not None else None

        if panel_id is None and panel_key is not None:
            panel_id = panel_key
            if session.get(Panel, panel_id) is None:
                session.add(Panel(id=panel_id, aircraft_id=None, panel_number=panel_id, surface=None, start_inspection_date=None))
            panel_ids[panel_key] = panel_id

        case = MdrCase(
            id=mdr_id,
            panel_id=panel_id,
            mdr_number=to_text(row.get("MDRNumber")),
            mdr_version=to_text(row.get("MDRVersion")),
            subject=to_text(row.get("Subject")),
            status=to_text(row.get("Status")),
            submitted_by=to_text(row.get("SubmittedBy")),
            request_date=to_dt(row.get("RequestDate")),
            need_date=to_dt(row.get("NeedDate")),
            approved=to_bool(row.get("Approved")) or False,
        )
        session.merge(case)

        for i in range(1, 6):
            text_v = to_text(row.get(f"RemarksV{i}"))
            if not text_v:
                continue
            dt_v = to_dt(row.get(f"RemarkDateV{i}")) or to_dt(row.get(f"RemarkTimeV{i}"))
            session.merge(
                MdrRemark(
                    mdr_case_id=mdr_id,
                    remark_index=i,
                    remark_text=text_v,
                    remark_datetime=dt_v,
                )
            )


def import_ndi_reports(session: Session, db_path: str, panel_ids: dict[int, int]) -> None:
    rows = mdb_export_rows(db_path, "NDIReportT")
    for row in rows:
        report_id = to_int(row.get("KeyNDIReport"))
        if report_id is None:
            continue

        panel_key = to_int(row.get("KeyPanelID"))
        panel_id = panel_ids.get(panel_key) if panel_key is not None else None
        if panel_id is None and panel_key is not None:
            panel_id = panel_key
            if session.get(Panel, panel_id) is None:
                session.add(Panel(id=panel_id, aircraft_id=None, panel_number=panel_id, surface=None, start_inspection_date=None))
            panel_ids[panel_key] = panel_id

        row_obj = NdiReport(
            id=report_id,
            panel_id=panel_id,
            hole_id=to_int(row.get("UHoleID")),
            name_initials=to_text(row.get("NameInitials")),
            inspection_date=to_dt(row.get("InspectionDate")),
            method=to_text(row.get("Method")),
            tools=to_text(row.get("Tools")),
            corrosion_position=to_text(row.get("CorroPos")),
        )
        session.merge(row_obj)


def import_mdr_list(session: Session, db_path: str, panel_ids: dict[int, int]) -> None:
    rows = mdb_export_rows(db_path, "MDRListT")
    for row in rows:
        detail_id = to_int(row.get("KeyMDRID"))
        if detail_id is None:
            continue

        panel_key = to_int(row.get("UPanelID"))
        panel_id = panel_ids.get(panel_key) if panel_key is not None else None

        row_obj = MdrRequestDetail(
            id=detail_id,
            panel_id=panel_id,
            tve=to_text(row.get("TVE")),
            mdr_type=to_text(row.get("MDR Type")),
            serial_number=to_text(row.get("Serial Number")),
            part_number=to_text(row.get("Part Number")),
            defect_code=to_text(row.get("Defect Code")),
            problem_statement=to_text(row.get("Problem Statement")),
            discovered_by=to_text(row.get("Discovered By")),
            date_discovered=to_dt(row.get("Date Discovered")),
        )
        session.merge(row_obj)


def truncate_core(session: Session) -> None:
    session.execute(delete(MdrRemark))
    session.execute(delete(MdrCase))
    session.execute(delete(MdrRequestDetail))
    session.execute(delete(NdiReport))
    session.execute(delete(HoleStep))
    session.execute(delete(HolePart))
    session.execute(delete(Hole))
    session.execute(delete(Panel))
    session.execute(delete(Aircraft))


def main() -> None:
    parser = argparse.ArgumentParser(description="Import Access corrosion data into PostgreSQL")
    parser.add_argument("--accdb", required=True, help="Path to .accdb file")
    parser.add_argument("--append", action="store_true", help="Do not truncate core tables before import")
    args = parser.parse_args()

    if not os.path.exists(args.accdb):
        raise SystemExit(f"ACCDB not found: {args.accdb}")

    with SessionLocal() as session:
        if not args.append:
            truncate_core(session)
            session.commit()

        aircraft_ids = import_aircraft(session, args.accdb)
        panel_ids = import_panels(session, args.accdb, aircraft_ids)
        session.commit()  # persist parent tables first

        import_holes(session, args.accdb, panel_ids)
        import_mdr(session, args.accdb, panel_ids)
        import_ndi_reports(session, args.accdb, panel_ids)
        import_mdr_list(session, args.accdb, panel_ids)
        session.commit()

        aircraft_count = session.scalar(select(func.count()).select_from(Aircraft))
        panel_count = session.scalar(select(func.count()).select_from(Panel))
        hole_count = session.scalar(select(func.count()).select_from(Hole))
        step_count = session.scalar(select(func.count()).select_from(HoleStep))
        part_count = session.scalar(select(func.count()).select_from(HolePart))
        mdr_count = session.scalar(select(func.count()).select_from(MdrCase))
        remark_count = session.scalar(select(func.count()).select_from(MdrRemark))
        ndi_count = session.scalar(select(func.count()).select_from(NdiReport))
        mdr_detail_count = session.scalar(select(func.count()).select_from(MdrRequestDetail))

        print("Import complete")
        print(f"Aircraft:     {aircraft_count}")
        print(f"Panels:       {panel_count}")
        print(f"Holes:        {hole_count}")
        print(f"Steps:        {step_count}")
        print(f"Parts:        {part_count}")
        print(f"MDR cases:    {mdr_count}")
        print(f"MDR remarks:  {remark_count}")
        print(f"NDI reports:  {ndi_count}")
        print(f"MDR details:  {mdr_detail_count}")


if __name__ == "__main__":
    main()
