from __future__ import annotations

import os
from dataclasses import dataclass


def _get_bool(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _get_int(name: str, default: int) -> int:
    value = os.getenv(name)
    if value is None:
        return default
    return int(value)


@dataclass(frozen=True)
class Settings:
    app_name: str = "F35 Corrosie Logboek API"
    app_version: str = "0.3.0"
    database_url: str = "postgresql+psycopg://corrosie:corrosie@localhost:5432/corrosie"
    allowed_origins_raw: str = "http://127.0.0.1:4200,http://localhost:4200"
    auto_create_schema: bool = False
    seed_demo_users: bool = True
    session_ttl_hours: int = 12
    log_level: str = "INFO"

    @property
    def allowed_origins(self) -> list[str]:
        return [origin.strip() for origin in self.allowed_origins_raw.split(",") if origin.strip()]


def get_settings() -> Settings:
    return Settings(
        database_url=os.getenv("DATABASE_URL", Settings.database_url),
        allowed_origins_raw=os.getenv("ALLOWED_ORIGINS", Settings.allowed_origins_raw),
        auto_create_schema=_get_bool("AUTO_CREATE_SCHEMA", Settings.auto_create_schema),
        seed_demo_users=_get_bool("SEED_DEMO_USERS", Settings.seed_demo_users),
        session_ttl_hours=_get_int("SESSION_TTL_HOURS", Settings.session_ttl_hours),
        log_level=os.getenv("LOG_LEVEL", Settings.log_level).upper(),
    )


settings = get_settings()
