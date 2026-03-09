#!/usr/bin/env python3
"""Quick verification report: Access table counts vs PostgreSQL target counts."""

from __future__ import annotations

import argparse
import csv
import io
import subprocess
import sys
from pathlib import Path

from sqlalchemy import func, select

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.db import SessionLocal
from app.models import Aircraft, Hole, HolePart, HoleStep, LookupMdrOption, LookupStatusCode, MdrCase, MdrRequestDetail, NdiReport, Panel


def mdb_export_count(accdb: str, table: str) -> int:
    """Count rows via mdb-export parsed as CSV, consistent with import script semantics."""
    out = subprocess.check_output(["mdb-export", accdb, table], text=True)
    reader = csv.DictReader(io.StringIO(out))
    return sum(1 for _ in reader)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--accdb", required=True)
    args = parser.parse_args()

    src = {
        "AircraftNrT": mdb_export_count(args.accdb, "AircraftNrT"),
        "PanelNrT": mdb_export_count(args.accdb, "PanelNrT"),
        "HoleRepairT": mdb_export_count(args.accdb, "HoleRepairT"),
        "MDRStatusT": mdb_export_count(args.accdb, "MDRStatusT"),
        "NDIReportT": mdb_export_count(args.accdb, "NDIReportT"),
        "MDRListT": mdb_export_count(args.accdb, "MDRListT"),
        "MDRStatusDropDownT": mdb_export_count(args.accdb, "MDRStatusDropDownT"),
        "MDRListDropDownOptionsT": mdb_export_count(args.accdb, "MDRListDropDownOptionsT"),
    }

    with SessionLocal() as s:
        dst = {
            "aircraft": s.scalar(select(func.count()).select_from(Aircraft)),
            "panel": s.scalar(select(func.count()).select_from(Panel)),
            "hole": s.scalar(select(func.count()).select_from(Hole)),
            "hole_step": s.scalar(select(func.count()).select_from(HoleStep)),
            "hole_part": s.scalar(select(func.count()).select_from(HolePart)),
            "mdr_case": s.scalar(select(func.count()).select_from(MdrCase)),
            "ndi_report": s.scalar(select(func.count()).select_from(NdiReport)),
            "mdr_request_detail": s.scalar(select(func.count()).select_from(MdrRequestDetail)),
            "lookup_status_code": s.scalar(select(func.count()).select_from(LookupStatusCode)),
            "lookup_mdr_option": s.scalar(select(func.count()).select_from(LookupMdrOption)),
        }

    print("=== ACCESS SOURCE COUNTS ===")
    for k, v in src.items():
        print(f"{k:12} {v}")

    print("\n=== POSTGRES TARGET COUNTS ===")
    for k, v in dst.items():
        print(f"{k:16} {v}")

    print("\nNotes:")
    print("- aircraft can be lower in target due to AN deduplication")
    print("- panel can differ due to placeholder panel creation")
    print("- source counts use mdb-export CSV row parsing (same basis as import script)")
    print("- hole_step/hole_part are normalized expansions of HoleRepairT")


if __name__ == "__main__":
    main()
