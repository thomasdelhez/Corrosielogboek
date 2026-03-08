# F35 Corrosie Logboek Backend (MVP scaffold)

## Run locally

```bash
cd corosiemanager/backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
```

Environment variables:

- `DATABASE_URL` (default: `postgresql+psycopg://corrosie:corrosie@localhost:5432/corrosie`)
- `ALLOWED_ORIGINS` (default: `http://127.0.0.1:4200,http://localhost:4200`)
- `AUTO_CREATE_SCHEMA` (default: `false`; set `true` only for local bootstrap)

## Database migrations (Alembic)

Use a valid local postgres role/database before running migrations:

```bash
cd corosiemanager/backend
source .venv/bin/activate
export DATABASE_URL="postgresql+psycopg://$USER@localhost:5432/corrosie"
alembic upgrade head
```

For an existing database that was previously initialized without Alembic, align baseline first:

```bash
alembic stamp head
```

Create a new migration after model changes:

```bash
alembic revision --autogenerate -m "describe change"
alembic upgrade head
```

## Access import script (v1+)

Imports Access data into MVP tables:
- core: `aircraft`, `panel`, `hole`, `hole_step`, `hole_part`
- MDR/NDI: `mdr_case`, `mdr_remark`, `ndi_report`
- MDR request details: `mdr_request_detail`

```bash
cd corosiemanager/backend
source .venv/bin/activate
export DATABASE_URL="postgresql+psycopg://thomasdelhez@localhost:5432/corrosie"
python scripts/import_access.py --accdb "../Tier 2 MDR Tool V3.0 - kopie.accdb"
```

By default the script truncates core tables first. Use `--append` to keep existing rows.

Note: the importer deduplicates `AircraftNrT` records by `AN` (Access source can contain duplicates).
If a hole references a panel ID not present in `PanelNrT`, the importer creates a placeholder panel row.

## Verification script

```bash
python scripts/verify_import.py --accdb "../Tier 2 MDR Tool V3.0 - kopie.accdb"
```

## Smoke test script

Quick API sanity check:

```bash
cd corosiemanager/backend
bash scripts/smoke_api.sh http://127.0.0.1:8002
```

## First implemented endpoints

- `POST /api/v1/panels/{panel_id}/holes`
- `POST /api/v1/panels/{panel_id}/holes/batch`
- `GET /api/v1/panels/{panel_id}/holes`
  - supports `inspection_status`, `mdr_code`, `q`, `limit`, `offset`
- `POST /api/v1/aircraft`
- `POST /api/v1/panels`
- `GET /api/v1/reports/corrosion-tracker`
- `GET /api/v1/inspection-dashboard`
- `GET /api/v1/hole-trackers`
- `GET /api/v1/installation-trackers`
- `GET /api/v1/holes/{hole_id}`
- `PUT /api/v1/holes/{hole_id}`
- `PUT /api/v1/holes/{hole_id}/steps`
- `PUT /api/v1/holes/{hole_id}/parts`
- `GET /api/v1/mdr-cases/{mdr_case_id}/remarks`
- `POST /api/v1/mdr-cases/{mdr_case_id}/remarks`
- `GET /health`
