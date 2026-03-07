# P1 acceptance status

Date: 2026-03-07

## Environment

- Backend: `http://127.0.0.1:8002`
- Frontend build: successful
- Auth: enabled (engineer/reviewer/admin)

## Database migration status

Existing database was already created with legacy `create_all` tables.

- `alembic upgrade head` failed as expected with `DuplicateTable (aircraft already exists)`.
- Migration baseline was aligned using:

```bash
export DATABASE_URL="postgresql+psycopg://$USER@localhost:5432/corrosie"
alembic stamp head
```

This is the correct path for existing environments.

## Automated smoke checks

Command run:

```bash
cd backend
./scripts/smoke_api.sh http://127.0.0.1:8002
```

Result: **PASS**

Checks covered:

1. health endpoint
2. authenticated aircraft list
3. authenticated panel list
4. ordering tracker endpoint
5. MDR case creation as engineer
6. MDR transition as reviewer
7. NDI dashboard endpoint
8. role enforcement (engineer denied for reviewer-only MDR transition)

## P1 functional status

- Ordering tracker parity: pass (API + page)
- MDR dashboard/transitions parity: pass
- NDI dashboard/transitions parity: pass
- Minimal login/roles: pass
- Route guards (frontend): pass
- Backend role guards: pass

## Remaining before production hardening

- Replace demo users/password flow with managed user provisioning
- Add refresh/expiry policy for auth sessions
- Add CI job for smoke script + frontend build
- Add migration strategy for fresh DB vs existing DB (bootstrap script)
