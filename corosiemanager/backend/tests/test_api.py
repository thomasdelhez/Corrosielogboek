from __future__ import annotations

import hashlib
import os
import sys
import tempfile
import unittest
from datetime import UTC, datetime, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

DB_FILE = Path(tempfile.gettempdir()) / "corrosiemanager_test.sqlite3"
if DB_FILE.exists():
    DB_FILE.unlink()

os.environ["DATABASE_URL"] = f"sqlite:///{DB_FILE}"
os.environ["SEED_DEMO_USERS"] = "false"
os.environ["ALLOWED_ORIGINS"] = "http://localhost:4200"

from app.db import Base, SessionLocal, engine
from app.models import Aircraft, AppUser, AuthSession, Hole, NdiReport, Panel
from app.main import _require_user, health, list_ndi_dashboard, pwd_context, ready


def token_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def utcnow() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)


class ApiTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        Base.metadata.create_all(bind=engine)

    @classmethod
    def tearDownClass(cls) -> None:
        engine.dispose()
        if DB_FILE.exists():
            DB_FILE.unlink()

    def setUp(self) -> None:
        Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)

    def test_health_and_ready(self) -> None:
        self.assertTrue(health()["ok"])
        with SessionLocal() as session:
            readiness = ready(db=session)
        self.assertEqual(readiness["database"], "ready")

    def test_expired_token_is_rejected(self) -> None:
        with SessionLocal() as session:
            session.add(AppUser(username="engineer", password=pwd_context.hash("secret123"), role="engineer"))
            session.add(
                AuthSession(
                    token_hash=token_hash("expired-token"),
                    username="engineer",
                    role="engineer",
                    revoked=False,
                    expires_at=utcnow() - timedelta(hours=1),
                )
            )
            session.commit()

            with self.assertRaises(Exception) as ctx:
                _require_user("Bearer expired-token", session)

        self.assertEqual(getattr(ctx.exception, "status_code", None), 401)
        self.assertEqual(getattr(ctx.exception, "detail", None), "Invalid or expired token")

    def test_ndi_dashboard_returns_latest_report(self) -> None:
        with SessionLocal() as session:
            session.add(AppUser(username="reviewer", password=pwd_context.hash("secret123"), role="reviewer"))
            aircraft = Aircraft(id=1, an="AN-1")
            panel = Panel(id=10, aircraft_id=1, panel_number=190)
            hole = Hole(id=100, panel_id=10, hole_number=7, ndi_name_initials="TD")
            session.add_all([aircraft, panel, hole])
            session.flush()
            session.add_all(
                [
                    NdiReport(id=501, panel_id=10, hole_id=100, method="ET", tools="tool-a"),
                    NdiReport(id=502, panel_id=10, hole_id=100, method="UT", tools="tool-b"),
                    AuthSession(
                        token_hash=token_hash("live-token"),
                        username="reviewer",
                        role="reviewer",
                        revoked=False,
                        expires_at=utcnow() + timedelta(hours=2),
                    ),
                ]
            )
            session.commit()

            rows = list_ndi_dashboard(
                db=session,
                _user={"username": "reviewer", "role": "reviewer"},
                aircraft_id=None,
                panel_id=None,
                queue="all",
                q=None,
                limit=300,
            )

        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["latest_report_id"], 502)
        self.assertEqual(rows[0]["latest_report_method"], "UT")


if __name__ == "__main__":
    unittest.main()
