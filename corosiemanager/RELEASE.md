# Corrosiemanager — Release Hardening Checklist

## 1) Runtime config
- [ ] `DATABASE_URL` set correctly
- [ ] `ALLOWED_ORIGINS` includes deployed frontend URL
- [ ] Frontend `public/assets/config/config.json` points to correct API base URL

## 2) Data safety
- [ ] Run DB backup before import/re-import
- [ ] Run import: `python backend/scripts/import_access.py --accdb "<path>.accdb"`
- [ ] Run verification: `python backend/scripts/verify_import.py --accdb "<path>.accdb"`

## 3) API smoke tests
- [ ] `GET /health`
- [ ] list panels
- [ ] list holes by panel
- [ ] update hole core
- [ ] update steps/parts
- [ ] create/list NDI report
- [ ] create/list MDR case

## 4) Frontend smoke tests
- [ ] panel selector works
- [ ] hole detail loads
- [ ] core save works
- [ ] steps save works
- [ ] parts save works
- [ ] MDR case create works
- [ ] NDI report create works
- [ ] MDR request detail cards visible (if data exists)

## 5) Production guardrails
- [ ] Disable debug/reload in production
- [ ] Use process manager (systemd/pm2/docker)
- [ ] Enable HTTPS and reverse proxy limits/timeouts
- [ ] Enable centralized logging
