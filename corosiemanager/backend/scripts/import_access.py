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

from sqlalchemy import delete, func, select, text
from sqlalchemy.orm import Session

# Ensure backend root is importable when running as: python scripts/import_access.py
BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.db import SessionLocal
from app.models import (
    Aircraft,
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
            mdr_resubmit=to_bool(row.get("MDRResubmit")) or False,
            total_stackup_length=to_text(row.get("TOTALStackUpLength")),
            stack_up=to_int(row.get("Stack up")),
            sleeve_bushings=to_text(row.get("Sleeve/Bushings")),
            countersinked=to_bool(row.get("COUNTERSINKED")) or False,
            clean=to_bool(row.get("CLEAN")) or False,
            cut_sleeve_bushing=to_bool(row.get("CUT SLEEVE/BUSHING")) or False,
            installed=to_bool(row.get("INSTALLED")) or False,
            primer=to_bool(row.get("PRIMER")) or False,
            surface_corrosion=to_bool(row.get("SURFACE CORROSION")) or False,
            nutplate_inspection=to_text(row.get("NutplateInspection")),
            nutplate_surface_corrosion=to_text(row.get("NutplateSurfaceCorrosion")),
            total_structure_thickness=to_text(row.get("TOTALStructureThickness")),
            flexhone=to_text(row.get("FlexHone")),
            flexndi=to_bool(row.get("FlexNDI")) or False,
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


def import_mdr(session: Session, db_path: str, aircraft_ids: dict[int, int], panel_ids: dict[int, int]) -> None:
    rows = mdb_export_rows(db_path, "MDRStatusT")
    for row in rows:
        mdr_id = to_int(row.get("MDRID"))
        if mdr_id is None:
            continue

        panel_key = to_int(row.get("UPanelID"))
        panel_id = panel_ids.get(panel_key) if panel_key is not None else None
        aircraft_key = to_int(row.get("UAircraftID"))
        aircraft_id = aircraft_ids.get(aircraft_key) if aircraft_key is not None else None

        if panel_id is None and panel_key is not None:
            panel_id = panel_key
            if session.get(Panel, panel_id) is None:
                session.add(Panel(id=panel_id, aircraft_id=None, panel_number=panel_id, surface=None, start_inspection_date=None))
            panel_ids[panel_key] = panel_id

        case = MdrCase(
            id=mdr_id,
            aircraft_id=aircraft_id,
            aircraft_an=to_text(row.get("AN")),
            aircraft_serial_number=to_text(row.get("SerialNumber")),
            aircraft_arrival_date=to_dt(row.get("ArrivalDate")),
            panel_id=panel_id,
            panel_number=to_int(row.get("PanelID")),
            hole_ids=to_text(row.get("HoleIDs")),
            resubmit=to_bool(row.get("Resubmit")) or False,
            request_sent=to_bool(row.get("RequestSent")) or False,
            mdr_number=to_text(row.get("MDRNumber")),
            mdr_version=to_text(row.get("MDRVersion")),
            ed_number=to_text(row.get("EDNumber")),
            subject=to_text(row.get("Subject")),
            status=to_text(row.get("Status")),
            dcm_check=to_text(row.get("DCM Check")),
            submitted_by=to_text(row.get("SubmittedBy")),
            submit_list_date=to_dt(row.get("SubmitListDate")),
            request_date=to_dt(row.get("RequestDate")),
            need_date=to_dt(row.get("NeedDate")),
            approval_date=to_dt(row.get("ApprovalDate")),
            approved=to_bool(row.get("Approved")) or False,
            tier2=to_bool(row.get("Tier2")) or False,
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
            panel_number=to_int(row.get("PanelID")),
            task_type=to_text(row.get("Task type")),
            fms_or_non_fms=to_text(row.get("FMS or Non-FMS")),
            releasability=to_text(row.get("Releasability")),
            technical_product_number=to_text(row.get("Technical Product Number")),
            technical_product_title=to_text(row.get("Technical Product Title")),
            submitter_name=to_text(row.get("Submitter Name")),
            location=to_text(row.get("Location")),
            mdr_type=to_text(row.get("MDR Type")),
            serial_number=to_text(row.get("Serial Number")),
            part_number=to_text(row.get("Part Number")),
            internal_reference_number=to_text(row.get("Internal Reference Number")),
            cr_ecp=to_text(row.get("CR/ECP")),
            discrepancy_type=to_text(row.get("Discrepancy Type")),
            cause_code_discrepant_work=to_text(row.get("Cause Code/Discrepant Work")),
            resubmit_reason=to_text(row.get("Resubmit Reason")),
            defect_code=to_text(row.get("Defect Code")),
            access_location=to_text(row.get("Access Location")),
            date_due_to_field=to_dt(row.get("Date Due to the Field")),
            lcn=to_text(row.get("LCN")),
            lcn_description=to_text(row.get("LCN Description")),
            inspection_criteria=to_text(row.get("Inspection Criteria")),
            mgi_required=to_text(row.get("MGI Required")),
            mgi_number=to_text(row.get("MGI Number")),
            discovered_during=to_text(row.get("Discovered During")),
            when_discovered=to_text(row.get("When Discovered")),
            problem_statement=to_text(row.get("Problem Statement")),
            technical_product_details_summary=to_text(row.get("Technical Product Details Summary")),
            tms=to_text(row.get("T/M/S")),
            email=to_text(row.get("Email")),
            confirm_email=to_text(row.get("Confirm Email")),
            discovered_by=to_text(row.get("Discovered By")),
            date_discovered=to_dt(row.get("Date Discovered")),
        )
        session.merge(row_obj)


def import_lookup_status_codes(session: Session, db_path: str) -> None:
    rows = mdb_export_rows(db_path, "MDRStatusDropDownT")
    for i, row in enumerate(rows, start=1):
        session.merge(
            LookupStatusCode(
                id=i,
                status_code=to_text(row.get("StatusCodes")),
                status_code_dcm=to_text(row.get("StatusCodesDCM")),
            )
        )


def import_lookup_mdr_options(session: Session, db_path: str) -> None:
    rows = mdb_export_rows(db_path, "MDRListDropDownOptionsT")
    for i, row in enumerate(rows, start=1):
        session.merge(
            LookupMdrOption(
                id=i,
                lcn=to_text(row.get("LCN")),
                discrepancy_type=to_text(row.get("Discrepancy Type")),
                cause_code_discrepant_work=to_text(row.get("Cause Code/Discrepant Work")),
                when_discovered=to_text(row.get("When Discovered")),
                discovered_by=to_text(row.get("Discovered By")),
            )
        )


def truncate_core(session: Session) -> None:
    session.execute(delete(LookupStatusCode))
    session.execute(delete(LookupMdrOption))
    session.execute(delete(MdrRemark))
    session.execute(delete(MdrCase))
    session.execute(delete(MdrRequestDetail))
    session.execute(delete(NdiReport))
    session.execute(delete(HoleStep))
    session.execute(delete(HolePart))
    session.execute(delete(Hole))
    session.execute(delete(Panel))
    session.execute(delete(Aircraft))


def reset_sequences(session: Session) -> None:
    # Imported rows preserve Access IDs, so PostgreSQL sequences can lag behind.
    # Resync sequences to avoid duplicate key errors on subsequent inserts.
    tables = [
        "aircraft",
        "panel",
        "hole",
        "hole_step",
        "hole_part",
        "mdr_case",
        "mdr_remark",
        "ndi_report",
        "mdr_request_detail",
        "lookup_status_code",
        "lookup_mdr_option",
    ]
    for table_name in tables:
        session.execute(
            text(
                """
                SELECT setval(
                    pg_get_serial_sequence(:table_name, 'id'),
                    COALESCE((SELECT MAX(id) FROM ONLY {table}), 1),
                    true
                )
                """.format(table=table_name)
            ),
            {"table_name": table_name},
        )


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
        import_mdr(session, args.accdb, aircraft_ids, panel_ids)
        import_ndi_reports(session, args.accdb, panel_ids)
        import_mdr_list(session, args.accdb, panel_ids)
        import_lookup_status_codes(session, args.accdb)
        import_lookup_mdr_options(session, args.accdb)
        reset_sequences(session)
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
        status_code_count = session.scalar(select(func.count()).select_from(LookupStatusCode))
        mdr_option_count = session.scalar(select(func.count()).select_from(LookupMdrOption))

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
        print(f"Status codes: {status_code_count}")
        print(f"MDR options:  {mdr_option_count}")


if __name__ == "__main__":
    main()
