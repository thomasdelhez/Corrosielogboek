# Corrosiemanager

Corrosiemanager bestaat uit:

- `backend/`: FastAPI API met SQLAlchemy, Alembic en PostgreSQL
- `frontend/`: Angular SPA
- `backend/scripts/import_access.py`: Access `.accdb` import naar PostgreSQL

## Lokale setup

### Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
export DATABASE_URL="postgresql+psycopg://$USER@localhost:5432/corrosie"
.venv/bin/alembic upgrade head
.venv/bin/uvicorn app.main:app --reload --port 8002
```

Belangrijke endpoints:

- `GET /health`
- `GET /ready`

### Frontend

```bash
cd frontend
npm ci
npm start
```

De frontend leest runtime-config uit:

- `frontend/public/assets/config/config.json`
- `frontend/src/assets/config/config.json`

## Import workflow

```bash
cd backend
source .venv/bin/activate
python scripts/import_access.py --accdb "/pad/naar/source.accdb"
python scripts/import_access.py --accdb "/pad/naar/source.accdb" --dry-run
python scripts/verify_import.py --accdb "/pad/naar/source.accdb"
```

Maak een databasebackup vóór een niet-append import.

## Checks

```bash
cd backend && python -m unittest
cd frontend && npm test -- --watch=false
cd frontend && npm run build
```

## Production notes

- Zet `SEED_DEMO_USERS=false` buiten lokale development.
- Zet `ALLOWED_ORIGINS` naar de echte frontend-URL.
- Plaats de API achter HTTPS en een reverse proxy.
- Gebruik een DB-backup en verificatiestap vóór re-imports.
