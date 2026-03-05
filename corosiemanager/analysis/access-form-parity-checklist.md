# Access → Corrosiemanager parity-checklist (per form)

Legenda:
- ✅ Done
- 🟡 Partial
- ❌ Missing

## Core navigation/forms

- `MainMenuF` → 🟡
  - Hoofdmenu aanwezig, maar nog niet alle modules volledig uitgewerkt.
- `LoginScreenF` → ❌
  - Nog geen login/autorisatie in nieuwe app.
- `AircraftNrSelectF` / `PanelSelectF` → ✅
  - Aircraft → Panel flow aanwezig op corrosie-overzicht.
- `HoleIDMenuF` / `HoleRepairCreateF` / `HoleIDInspectionMenuF` → 🟡
  - Hole detail + edit aanwezig, maar niet alle inspectievarianten/workflows uit Access.

## Data entry / tracking

- `BatchHoleIDCreateF` → ❌
  - Geen batch-create workflow voor holes.
- `OrderingTrackerF` + order subforms
  - `SubformOrderingStatusOverview`
  - `SubformOrderStatusTracker`
  - `SubformDeliveryStatusTracker`
  - `SubformCreatedHolesTracker`
  → ❌
  - Nog geen dedicated ordering tracker module.

## MDR

- `MDRMenuF` → 🟡
  - MDR heeft eigen pagina en CRUD basis.
- `MDRListF` / `CreateNewMDRF` → 🟡
  - Aanmaken/wijzigen/verwijderen beschikbaar, maar nog niet volledige Access-velden/flow.
- `MDRStatusOverviewF` → 🟡
  - Basisoverzicht beschikbaar, nog geen complete statusdashboard-logica.
- MDR subforms:
  - `SubformMDRStatus`
  - `SubformMDRCheckInput`
  - `SubformMDRRequest`
  - `SubformMDRResubmitRequest`
  - `SubformMDRResubmitTracker`
  - `SubformMDRSubmitTracker`
  - `SubformMDRAwaitingRequest`
  → ❌ / 🟡
  - Data deels aanwezig; UI/workflow parity nog niet compleet.

## NDI

- `NDIMenuF` / `NDIReportF` → 🟡
  - NDI pagina + basis CRUD aanwezig.
- NDI subforms:
  - `SubformNDICheckInput`
  - `SubformNDICheckTracker`
  - `SubformNDIActionNeeded`
  - `SubformNDIReportNeeded`
  - `SubformNDIFinished`
  → ❌ / 🟡
  - Nog geen volledige parity van alle check/queue/status weergaven.

## Inspectie/ream/quality subforms

- `SubformReamingStepsTracker` → 🟡
  - Steps bestaan functioneel, maar tracker-UX kan uitgebreider.
- `SubformMaxBPTracker` → ❌
- `SubformFlexhoneTrackerQ` → ❌
- `SubformHoleIDInspection` / `SubformToBeInspected` / `SubformMarkedAsCorroded` / `SubformMarkedAsRifled` / `SubformMarkedAsClean` → ❌ / 🟡

## Installatie/status subforms

- `SubformInstallationTracker`
- `SubformFinishedInstallation`
→ ❌

## Reporting/export

- `CorrosionTrackerR` (report) → ❌
- `AircraftDataExportF` → ❌
- `MDRPowerpointInfoF` → ❌

## Misc/test/admin

- `PanelNrCreateF` / `AircraftNrCreateF` → ❌ (aparte create forms ontbreken)
- `TestForm` / `TESTTableSubform` → n.v.t.

---

## Aanbevolen prioriteit

### P1 (must)
1. Login + rollen (minimaal engineer/reviewer/admin)
2. Ordering tracker module (core views)
3. MDR status/dashboard parity
4. NDI status/dashboard parity

### P2 (should)
5. Batch hole create
6. Inspectie-queues (to-be-inspected / corroded / rifled / clean)
7. Installatie tracker views

### P3 (later)
8. Rapporten (CorrosionTrackerR)
9. Export workflows (AircraftDataExport / PPT info)
