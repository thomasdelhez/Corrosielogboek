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

## Access import script (v1)

Imports Access data into core MVP tables (`aircraft`, `panel`, `hole`, `hole_step`, `hole_part`).

```bash
cd corosiemanager/backend
source .venv/bin/activate
export DATABASE_URL="postgresql+psycopg://thomasdelhez@localhost:5432/corrosie"
python scripts/import_access.py --accdb "../Tier 2 MDR Tool V3.0 - kopie.accdb"
```

By default the script truncates core tables first. Use `--append` to keep existing rows.

Note: the importer deduplicates `AircraftNrT` records by `AN` (Access source can contain duplicates).

## First implemented endpoints

- `POST /api/v1/panels/{panel_id}/holes`
- `GET /api/v1/panels/{panel_id}/holes`
  - supports `inspection_status`, `mdr_code`, `q`, `limit`, `offset`
- `GET /api/v1/holes/{hole_id}`
- `PUT /api/v1/holes/{hole_id}`
- `PUT /api/v1/holes/{hole_id}/steps`
- `PUT /api/v1/holes/{hole_id}/parts`
- `GET /health`
