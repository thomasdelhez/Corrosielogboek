# Release Ready Checklist (2026-03-09)

Scope: Access parity sprint + validatie/hardening + UI messaging (toast-only).

## Changelog (kort)

- Access dataparity uitgebreid:
  - `MdrRequestDetail` velden volledig gemodelleerd en CRUD-endpoints actief.
  - Lookup-tabellen toegevoegd voor MDR status/options.
  - Importscript uitgebreid + sequence reset om PK-conflicten na import te voorkomen.
- MDR/NDI businessvalidaties aangescherpt:
  - Statusafhankelijke required fields op backend.
  - Request-detail required fields + e-mail confirm + datumvolgorde.
  - Client-side pre-submit validatie in MDR management.
- Frontend parity/UX:
  - MDR request detail editor uitgebreid naar (nagenoeg) volledige veldset.
  - Uniforme API-foutafhandeling via centrale `ApiErrorService`.
  - Migratie naar toast-only messaging met globale `ToastHostComponent`.
  - Toast deduplicatie toegevoegd (zelfde melding stapelt niet).
- Smoke/herstel:
  - API smoke-suite groen.
  - Eerdere 500 op `mdr-request-details` opgelost (import + sequence sync + runtime restart).

## Checklist

### Build & checks

- [x] Backend compile check (`python3 -m compileall`) geslaagd.
- [x] Frontend TypeScript check (`tsc --noEmit`) geslaagd.
- [x] API smoke (`backend/scripts/smoke_api.sh`) geslaagd.
- [x] Gerichte negatieve validatiechecks (MDR status / request detail) bevestigd.

### Functionele parity

- [x] Core Access-tabellen geïmporteerd naar webappmodel.
- [x] Ordering/Inspection/Trackers/Installation dashboards actief.
- [x] MDR lifecycle + remarks + request details beschikbaar.
- [x] NDI dashboard + transitions + reports beschikbaar.
- [x] Login/role guards actief in backend en frontend.

### UX en foutafhandeling

- [x] Eén centrale API-foutformatter.
- [x] Consistente toastmeldingen voor succes/fout/info.
- [x] Inline alerts uitgefaseerd (toast-only).

### Open voor productie-release

- [ ] Handmatige browser smoke op target runtime (alle routes/flows).
- [ ] Gebruikersbeheer: demo users vervangen door provisioningbeleid.
- [ ] CI release gate uitbreiden (smoke + frontend checks).
- [ ] Deploy/runbook afronden (fresh DB vs bestaande DB pad expliciet).
- [ ] Security/session policy (expiry/refresh) formeel afstemmen.

## Aanbevolen Go/No-Go criteria

- Go voor interne pilot: als handmatige browser smoke groen is.
- No-Go voor brede productie: zolang provisioning + CI release gate ontbreken.
