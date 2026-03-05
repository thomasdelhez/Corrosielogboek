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

## First implemented endpoints

- `POST /api/v1/panels/{panel_id}/holes`
- `GET /api/v1/panels/{panel_id}/holes`
- `GET /api/v1/holes/{hole_id}`
- `GET /health`
