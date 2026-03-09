# Access vs Webapp Gap Analyse (actueel)

Datum: 2026-03-09  
Bron Access: `Tier 2 MDR Tool V3.0 - kopie.accdb`  
Doel: zichtbaar maken wat al parity heeft en wat nog ontbreekt voor functioneel equivalent.

## 1) Samenvatting

- Datamigratie en kern-workflows zijn operationeel in de webapp.
- Grootste resterende gat zit niet meer in "bestaat de module?", maar in:
  - volledige veld- en validatieparity (vooral MDR request detail),
  - operationele hardening (gebruikersbeheer, audit zichtbaar, CI/e2e, deployment),
  - exactere parity van Access-regels/queries op edge-cases.

## 2) Vergelijking per domein

Legenda:
- `✅` = functioneel aanwezig
- `🟡` = aanwezig maar nog niet volledig equivalent
- `❌` = ontbreekt

| Domein | Access | Webapp status | Opmerking |
|---|---|---|---|
| Login en role access | `LoginScreenF`, `UserLoginT` | ✅ | Login + guards + API rollen aanwezig. |
| Aircraft/panel selectie + beheer | `AircraftNrSelectF`, `PanelSelectF`, `AircraftNrCreateF`, `PanelNrCreateF` | ✅ | Selectie + admin create aanwezig. |
| Hole detail + steps + parts | `HoleRepairCreateF`, `HoleIDMenuF` | ✅ | CRUD + stappen/parts + trackers beschikbaar. |
| Batch hole create | `BatchHoleIDCreateF` | ✅ | Batch endpoint + UI met validatie aanwezig. |
| Ordering tracker | `OrderingTrackerF` + subforms | ✅ | Queue tabs en API queue filters aanwezig. |
| Inspectie queues | `HoleIDInspectionMenuF` + subforms | ✅ | 4 queues + dashboard aanwezig. |
| Installatie trackers | `SubformInstallationTracker`, `SubformFinishedInstallation` | ✅ | Ready/finished queues aanwezig. |
| NDI dashboard/workflow | `NDIMenuF`, `NDIReportF` + subforms | 🟡 | Dashboard en transitions aanwezig, maar query-/statusregels nog te valideren op Access edge-cases. |
| MDR cases lifecycle | `MDRMenuF`, `MDRStatusOverviewF` | 🟡 | Lifecycle + transitions aanwezig; detailregels per status nog verder aan te scherpen. |
| MDR remarks V1..V5 | `MDRStatusT` remarkvelden | 🟡 | Ondersteund, maar geen sterke unique-regel per versie op DB-niveau. |
| MDR request detail | `MDRListF`, `MDRListT` | 🟡 | Backend-model volledig, UI-editor toont nog een subset van velden. |
| Rapportage/export | `CorrosionTrackerR`, `AircraftDataExportF`, `MDRPowerpointInfoF` | ✅ | Corrosion + MDR PPT CSV export aanwezig. |
| Access macro's/testobjecten | `~TMPCLPMacro`, `TEST*` | ❌ / n.v.t. | Niet gemigreerd; meestal geen businesswaarde. |

## 3) Datamodelvergelijking (tabellen)

| Access tabel | Webapp equivalent | Status | Gap |
|---|---|---|---|
| `AircraftNrT` | `aircraft` | ✅ | Gedekt. |
| `PanelNrT` | `panel` | ✅ | Gedekt. |
| `HoleRepairT` | `hole` + `hole_step` + `hole_part` | ✅ | Genormaliseerd gemigreerd. |
| `MDRStatusT` | `mdr_case` + `mdr_remark` | ✅ | Gedekt incl. remarks. |
| `NDIReportT` | `ndi_report` | ✅ | Gedekt. |
| `MDRListT` | `mdr_request_detail` | ✅ | Datamodel gedekt; UI nog deels. |
| `MDRStatusDropDownT` | `lookup_status_code` | ✅ | Gedekt. |
| `MDRListDropDownOptionsT` | `lookup_mdr_option` | ✅ | Gedekt. |
| `UserLoginT` | `app_user` (nieuw) | 🟡 | Geen 1-op-1 import/provisioning vanuit Access. |
| `UserEmailsT` | geen direct equivalent | ❌ | Nog geen e-mail directory/gebruik in workflow. |
| `AircraftSelectionT` | geen direct equivalent | ❌ / n.v.t. | Selectiestaat niet als persistente domeintabel gemodelleerd. |

## 4) Wat mist nog (prioriteit)

## P1 (belangrijk voor parity + dagelijks gebruik)

1. MDR request detail UI volledig maken
- Alle `MDRListT` velden invoerbaar/bewerkbaar maken in de frontend (nu subset in scherm).
- Inclusief datumvelden en langere tekstvelden met duidelijke validatie.

2. Striktere business-validaties uit Access forms
- Verplichte velden per MDR-status en per NDI-status explicieter afdwingen.
- Consistente dropdown-validatie op lookupwaarden (geen vrije tekst waar Access keuzevelden hanteert).

3. Gebruikersbeheer productie-klaar maken
- Demo users vervangen door beheerde provisioning.
- Optioneel: migratiestrategie voor `UserLoginT`/`UserEmailsT` mapping.

4. Operationele audit zichtbaar maken
- Audit events bestaan in backend, maar geen UI voor wijzigingshistorie per case/hole.

## P2 (kwaliteit/hardening)

5. Exacte query-parity op edge-cases valideren
- Queue classificatie vergelijken met Access output op steekproefsets.
- Speciale status-varianten (spelling/casing) expliciet afdekken.

6. End-to-end regressietests toevoegen
- Nu vooral smoke-tests; geen brede e2e die form-flow parity bewaakt.

7. Migrations/deployment pad afronden
- Strategie voor fresh DB versus bestaande DB eenduidig automatiseren.

## P3 (afwerking)

8. Export/rapportage polish
- Timestamped bestandsnamen, kolomvolgorde afstemmen op operatie, evt. XLSX.

9. UX-consistentie
- Consistente NL/EN labels, uniforme foutmelding/succesmeldingen.

## 5) Conclusie

De webapp dekt inmiddels het grootste deel van de Access-functionaliteit op moduleniveau.  
De resterende scope is vooral "diepte": volledige veldparity, strengere businessregels en productie-hardening.
