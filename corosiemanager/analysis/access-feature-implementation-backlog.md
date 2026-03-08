# Access → Corrosiemanager implementatie-backlog

Doel: alle relevante Access-functionaliteit 1-op-1 of functioneel equivalent beschikbaar maken in de GitHub-tool.

Bronnen:
- `analysis/access-capability-map.md`
- `analysis/access-form-parity-checklist.md`
- Access DB: `Tier 2 MDR Tool V3.0 - kopie.accdb`

Legenda prioriteit:
- **P1 (Must)** = nodig voor dagelijkse operatie
- **P2 (Should)** = sterk gewenst voor productiviteit/kwaliteit
- **P3 (Later)** = rapportage/export/extra’s

---

## P1 — Must (eerst bouwen)

### 1) Batch Hole Create ✅ (2026-03-08)
- **Access referentie**: `BatchHoleIDCreateF`, `~sq_cBatchHoleIDCreateF~sq_cSubFormCreatedHolesTracker`
- **Doel in nieuwe tool**: meerdere holes in 1 actie aanmaken voor een panel.
- **Backend**:
  - `POST /api/v1/panels/{panel_id}/holes/batch`
  - server-side validatie op dubbele `hole_number` binnen payload + conflict check met bestaande holes
  - resultaat met `created`, `skipped`, `errors`
- **Frontend**:
  - nieuwe pagina: *Batch Hole Create*
  - invoer ranges/lijsten (bijv. 101-120 of CSV lijst)
  - preview + validatiefouten vóór submit
  - resultaattabel met aangemaakte IDs
- **Acceptatie**:
  - in 1 submit ≥50 holes aanmaken
  - duplicates worden netjes gerapporteerd, niet silent gefaald
- **Implementatie (geleverd)**:
  - Backend: `POST /api/v1/panels/{panel_id}/holes/batch`
  - Detecteert duplicates in payload en bestaande holes in panel
  - Retourneert samenvatting + detailresultaten (`created/skipped/error`)
  - Frontend: nieuwe pagina `/batch-holes` met range/CSV invoer, preview en resultaattabel

### 2) Ordering Tracker parity (volledig) ✅ (baseline geleverd 2026-03-08)
- **Access referentie**: `OrderingTrackerF`, `SubformOrderingStatusOverview`, `SubformOrderStatusTracker`, `SubformDeliveryStatusTracker`, `SubFormCreatedHolesTracker`, queries: `OrderNeededQ`, `OrderStatusTrackerQ`, `DeliveryStatusQ`, `CreatedHolesTrackerQ`
- **Doel in nieuwe tool**: alle ordering-queues zoals Access, niet alleen basisoverzicht.
- **Backend**:
  - bestaande endpoint uitbreiden: `/api/v1/ordering-tracker`
  - expliciete queue modes die Access dekken:
    - `order_needed`
    - `order_status`
    - `delivery_status`
    - `created_holes`
    - `ordering_overview`
  - consistente aggregaties voor ordered/delivered/pending
- **Frontend**:
  - tabbladen per queue
  - filters op aircraft/panel/hole/status + zoekfunctie
  - statusbadges en tellingen per queue
- **Acceptatie**:
  - alle Access-ordering views zijn af te beelden via UI tabs
  - tellers en rijen consistent met DB-data
- **Implementatie (geleverd)**:
  - Backend queue modes uitgebreid met `ordering_overview` + werkende filter voor `created_holes`
  - Frontend tabs uitgebreid met `Ordering overview`
  - Queue-tellingen per tab toegevoegd (all/overview/order-needed/order-status/delivery-status/created-holes)

### 3) MDR workflow parity (status + subflows) ✅ (baseline geleverd 2026-03-08)
- **Access referentie**: `MDRMenuF`, `MDRListF`, `CreateNewMDRF`, `MDRStatusOverviewF`, `SubformMDRAwaitingRequest`, `SubformMDRCheckInput`, `SubformMDRRequest`, `SubformMDRResubmitRequest`, `SubformMDRResubmitTracker`, `SubformMDRSubmitTracker`, queries: `MDRAwaitingRequestQ`, `MDRRequestQ`, `MDRResubmitQ`, `MDRResubmitRequestQ`, `MDRSubmitQ`
- **Doel in nieuwe tool**: volledige lifecycle zichtbaar en bedienbaar met juiste validatieregels.
- **Backend**:
  - status-transitions verder aanscherpen op required fields per fase
  - endpoint(s) voor queue-specifieke MDR lijsten
  - remarks versie-semantiek (V1..V5) eenduidig afdwingen
- **Frontend**:
  - MDR dashboard met kolommen/queues: awaiting/request/submit/resubmit/in-review
  - detailpaneel met request info + remark history
  - actieknoppen per toegestane transition
- **Acceptatie**:
  - elke MDR-case doorloopt lifecycle zonder handmatige DB-correcties
  - verboden transitions zijn geblokkeerd met duidelijke foutmelding
- **Implementatie (geleverd)**:
  - Frontend queue uitgebreid met `In Review`
  - Case detailpaneel toegevoegd met `request details` cards op panelniveau
  - Remark history + remark toevoegen (V1..V5) in UI
  - Backend endpoint toegevoegd: `GET /api/v1/mdr-cases/{mdr_case_id}/remarks`

### 4) NDI workflow parity (queues) ✅ (baseline geleverd 2026-03-08)
- **Access referentie**: `NDIMenuF`, `NDIReportF`, `SubformNDICheckInput`, `SubformNDICheckTracker`, `SubformNDIActionNeeded`, `SubformNDIReportNeeded`, `SubformNDIFinished`, queries: `NDICheckTrackerQ`, `NDIActionNeededQ`, `NDIReportNeededQ`, `NDIFinishedQ`
- **Doel in nieuwe tool**: alle NDI-werkbakken apart beschikbaar met correcte transitions.
- **Backend**:
  - `/api/v1/ndi-dashboard` uitbreiden met Access-equivalente queuelogica
  - stricte prerequisites voor markeren als `finished`
- **Frontend**:
  - aparte NDI tabs: check tracker / action needed / report needed / finished
  - snelle acties vanuit lijst (open detail, markeer status, voeg report toe)
- **Acceptatie**:
  - NDI items vallen altijd in exact 1 juiste queue
  - `finished` alleen mogelijk als verplichte data compleet is
- **Implementatie (geleverd)**:
  - NDI queue-tabs met live tellingen op basis van volledige dataset
  - Contextuele snelle acties per queue (check/action/report/finished)
  - Quick report actie toegevoegd om direct NDI-report te registreren vanuit dashboard

### 5) Login screen parity + rolgedrag in UI ✅ (baseline geleverd 2026-03-08)
- **Access referentie**: `LoginScreenF`, `UserLoginT`
- **Doel in nieuwe tool**: login-flow niet alleen API-side, maar volledig zichtbaar en afdwingbaar in frontend.
- **Backend**:
  - reeds aanwezig (`/auth/login`, `/auth/logout`, `/auth/me`), uitbreiden met duidelijke error-codes
- **Frontend**:
  - dedicated loginpagina
  - route guards op rol (engineer/reviewer/admin)
  - sessie-expiry handling + nette redirect
- **Acceptatie**:
  - niet-ingelogde user kan geen domeinpagina’s openen
  - rolbeperkingen zichtbaar en effectief
- **Implementatie (geleverd)**:
  - Dedicated loginpagina toegevoegd (`/login`)
  - Guards redirecten nu met `redirectTo` en reden (`login_required` / `role_required`)
  - Sessievalidatie via `/auth/me` bij route-toegang, met auto-clear bij vervallen token
  - Homepagina toont duidelijke rolmelding i.p.v. stille redirect

---

## P2 — Should

### 6) Inspectie-queues (Hole inspection menu parity) ✅ (baseline geleverd 2026-03-08)
- **Access referentie**: `HoleIDInspectionMenuF`, `SubformHoleIDInspection`, `SubformToBeInspected`, `SubformMarkedAsCorroded`, `SubformMarkedAsRifled`, `SubformMarkedAsClean`, queries: `ToBeInspectedQ`, `MarkedAsCorrodedQ`, `MarkedAsRifledQ`, `MarkedAsCleanQ`
- **Backend**:
  - endpoint voor inspectiequeue-overzicht met genoemde statussen
- **Frontend**:
  - inspectie-dashboard met 4 queue-tabs

- **Implementatie (geleverd)**:
  - Backend endpoint: `GET /api/v1/inspection-dashboard`
  - Queue modes: `to_be_inspected`, `marked_as_corroded`, `marked_as_rifled`, `marked_as_clean`
  - Frontend pagina `/inspection` met 4 queue-tabs + filters + tellingen

### 7) Hole trackers uitbreiden
- **Access referentie**: `SubformMaxBPTracker`, `SubformFlexhoneTrackerQ`, `SubformReamingStepsTracker`
- **Backend**:
  - query/endpoints per tracker
- **Frontend**:
  - trackercards/filters op hole niveau

### 8) Installatie trackers
- **Access referentie**: `SubformInstallationTracker`, `SubformFinishedInstallation`, query `FinishedInstallationQ`, `ReadyForInstallationQ`
- **Backend**:
  - installatie readiness + finished endpoints/filters
- **Frontend**:
  - installatie-overzicht met voortgang

### 9) Aircraft/Panel create-beheer in UI
- **Access referentie**: `AircraftNrCreateF`, `PanelNrCreateF`
- **Backend**:
  - create endpoints (met uniqueness checks)
- **Frontend**:
  - admin forms voor aanmaken/wijzigen

---

## P3 — Later

### 10) Rapportage
- **Access referentie**: `CorrosionTrackerR`, query `CorrosionTrackerQ`
- **Doel**: print/export-ready overzicht
- **Backend/Frontend**:
  - report endpoint + downloadbare output

### 11) Export workflows
- **Access referentie**: `AircraftDataExportF`, `MDRPowerpointInfoF`
- **Doel**: data-export voor externe verwerking
- **Backend/Frontend**:
  - CSV/Excel export + selecties op aircraft/panel/periode

---

## Aanpak in uitvoering (aanbevolen volgorde)
1. Batch Hole Create
2. Ordering Tracker parity
3. MDR parity
4. NDI parity
5. Login/role UX
6. Inspectie- en installatie-trackers
7. Reports/exports

---

## Definition of Done (algemeen)
Voor elk backlog-item pas als “done” markeren wanneer:
- endpoint(s) + UI aanwezig
- validaties/autoristatie correct
- smoke test groen
- korte gebruikersinstructie in README/analysis
- parity-checklist geüpdatet
