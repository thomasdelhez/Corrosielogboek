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
from app.models import Aircraft, Hole, HolePart, HoleStep, MdrCase, MdrRequestDetail, NdiReport, Panel


def mdb_count(accdb: str, table: str) -> int:
    out = subprocess.check_output(["mdb-count", accdb, table], text=True).strip()
    return int(out)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--accdb", required=True)
    args = parser.parse_args()

    src = {
        "AircraftNrT": mdb_count(args.accdb, "AircraftNrT"),
        "PanelNrT": mdb_count(args.accdb, "PanelNrT"),
        "HoleRepairT": mdb_count(args.accdb, "HoleRepairT"),
        "MDRStatusT": mdb_count(args.accdb, "MDRStatusT"),
        "NDIReportT": mdb_count(args.accdb, "NDIReportT"),
        "MDRListT": mdb_count(args.accdb, "MDRListT"),
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
    print("- hole_step/hole_part are normalized expansions of HoleRepairT")


if __name__ == "__main__":
    main()
