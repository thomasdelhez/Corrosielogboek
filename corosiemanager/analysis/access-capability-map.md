# Access capability map (ACCDB → nieuwe app)

Bronbestand: `Tier 2 MDR Tool V3.0 - kopie.accdb`  
Versie gedetecteerd: `ACE14`  
Gegenereerd: 2026-03-07 22:15 CET

## 1) Object-overzicht

- Forms: **48**
- Reports: **1** (`CorrosionTrackerR`)
- Macro's: **1** (`~TMPCLPMacro`)
- Queries totaal: **85** (core: **26**, form-generated: **59**)

## 2) Data-tabellen (met aantallen rijen)

- `AircraftNrT`: 7
- `AircraftSelectionT`: 52
- `HoleRepairT`: 126
- `MDRListDropDownOptionsT`: 64
- `MDRListT`: 2
- `MDRStatusDropDownT`: 12
- `MDRStatusT`: 18
- `NDIReportT`: 0
- `PanelNrT`: 32
- `TESTTable`: 68
- `UserEmailsT`: 5
- `UserLoginT`: 3

## 3) Core queries en gebruikte tabellen

- `AircraftNrT Query` → `AircraftNrT`, `HoleRepairT`, `PanelNrT`, `[AircraftNrT]`, `[HoleRepairT]`, `[PanelNrT]`
- `CorrosionTrackerQ` → `AircraftNrT`, `HoleRepairT`, `PanelNrT`
- `CreatedHolesTrackerQ` → `HoleRepairT`
- `DeliveryStatusQ` → `HoleRepairT`
- `FinishedInstallationQ` → `HoleRepairT`
- `FlexhoneTrackerQ` → `HoleRepairT`
- `MDRAwaitingRequestQ` → `MDRStatusT`
- `MDRRequestQ` → `MDRStatusT`
- `MDRResubmitQ` → `HoleRepairT`
- `MDRResubmitRequestQ` → `MDRStatusT`
- `MDRSubmitQ` → `HoleRepairT`
- `MarkedAsCleanQ` → `HoleRepairT`
- `MarkedAsCorrodedQ` → `HoleRepairT`
- `MarkedAsRifledQ` → `HoleRepairT`
- `MaxBPTrackerQ` → `HoleRepairT`
- `NDIActionNeededQ` → `HoleRepairT`
- `NDICheckTrackerQ` → `HoleRepairT`
- `NDIFinishedQ` → `HoleRepairT`
- `NDIReportNeededQ` → `HoleRepairT`
- `OrderNeededQ` → `HoleRepairT`
- `OrderStatusTrackerQ` → `AircraftNrT`, `HoleRepairT`, `PanelNrT`
- `PanelSelectQ` → `PanelNrT`
- `ReadyForInstallationQ` → `HoleRepairT`
- `ReamingStepsTrackerQ` → `HoleRepairT`
- `TESTTableQuery` → `TESTTable`
- `ToBeInspectedQ` → `HoleRepairT`

## 4) Form → query-koppelingen (capability view)

> Let op: Access bewaart veel form/query bindingen als `~sq_*` objecten. Deze sectie combineert die bindings met naam-gebaseerde inferentie voor migratieplanning.

- `AircraftDataExportF`
  - core queries: `AircraftNrT Query`
  - form bindings: `~sq_cAircraftDataExportF~sq_cANCombo`, `~sq_cAircraftDataExportF~sq_cPanelCombo`
- `AircraftNrCreateF`
  - core queries: `AircraftNrT Query`
- `AircraftNrSelectF`
  - core queries: `AircraftNrT Query`
- `BatchHoleIDCreateF`
  - form bindings: `~sq_cBatchHoleIDCreateF~sq_cSubFormCreatedHolesTracker`
- `CreateNewMDRF`
  - core queries: `MDRAwaitingRequestQ`, `MDRRequestQ`, `MDRResubmitQ`, `MDRResubmitRequestQ`, `MDRSubmitQ`
- `HoleIDInspectionMenuF`
  - core queries: `MarkedAsCleanQ`, `MarkedAsCorrodedQ`, `MarkedAsRifledQ`, `ToBeInspectedQ`
  - form bindings: `~sq_cHoleIDInspectionMenuF~sq_cHoleCombo`, `~sq_cHoleIDInspectionMenuF~sq_cSubformHoleIDInspection`, `~sq_cHoleIDInspectionMenuF~sq_cSubformMarkedAsClean`, `~sq_cHoleIDInspectionMenuF~sq_cSubformMarkedAsCorroded`, `~sq_cHoleIDInspectionMenuF~sq_cSubformMarkedAsRifled`, `~sq_cHoleIDInspectionMenuF~sq_cSubformToBeInspected`
- `HoleIDMenuF`
  - core queries: `DeliveryStatusQ`, `FinishedInstallationQ`, `FlexhoneTrackerQ`, `MDRResubmitQ`, `MDRSubmitQ`, `MaxBPTrackerQ`, `NDIActionNeededQ`, `OrderStatusTrackerQ`, `ReadyForInstallationQ`, `ReamingStepsTrackerQ`
  - form bindings: `~sq_cHoleIDMenuF~sq_cHoleCombo`, `~sq_cHoleIDMenuF~sq_cSubFormHoleIDStatus`, `~sq_cHoleIDMenuF~sq_cSubformDeliveryStatusTracker`, `~sq_cHoleIDMenuF~sq_cSubformFinishedInstallation`, `~sq_cHoleIDMenuF~sq_cSubformFlexhoneTrackerQ`, `~sq_cHoleIDMenuF~sq_cSubformInstallationTracker`, `~sq_cHoleIDMenuF~sq_cSubformMDRResubmitTracker`, `~sq_cHoleIDMenuF~sq_cSubformMDRSubmitTracker`, `~sq_cHoleIDMenuF~sq_cSubformMaxBPTracker`, `~sq_cHoleIDMenuF~sq_cSubformNDIActionNeeded`, `~sq_cHoleIDMenuF~sq_cSubformOrderStatusTracker`, `~sq_cHoleIDMenuF~sq_cSubformReamingStepsTracker`, `~sq_fHoleIDMenuF`
- `HoleRepairCreateF`
  - form bindings: `~sq_fHoleRepairCreateF`
- `LoginScreenF`
  - form bindings: `~sq_fLoginScreenF`
- `MDRListF`
  - core queries: `MDRAwaitingRequestQ`, `MDRRequestQ`, `MDRResubmitQ`, `MDRResubmitRequestQ`, `MDRSubmitQ`
  - form bindings: `~sq_cMDRListF~sq_cCause Code/Discrepant Work`, `~sq_cMDRListF~sq_cDiscovered By`, `~sq_cMDRListF~sq_cDiscrepancy Type`, `~sq_cMDRListF~sq_cLCN`, `~sq_cMDRListF~sq_cWhen Discovered`, `~sq_fMDRListF`
- `MDRMenuF`
  - core queries: `MDRAwaitingRequestQ`, `MDRRequestQ`, `MDRResubmitQ`, `MDRResubmitRequestQ`, `MDRSubmitQ`
  - form bindings: `~sq_cMDRMenuF~sq_cANCombo`, `~sq_cMDRMenuF~sq_cPanelCombo`, `~sq_cMDRMenuF~sq_cSubformMDRAwaitingRequest`, `~sq_cMDRMenuF~sq_cSubformMDRCheckInput`, `~sq_cMDRMenuF~sq_cSubformMDRRequest`, `~sq_cMDRMenuF~sq_cSubformMDRResubmitRequest`, `~sq_fMDRMenuF`
- `MDRPowerpointInfoF`
  - core queries: `MDRAwaitingRequestQ`, `MDRRequestQ`, `MDRResubmitQ`, `MDRResubmitRequestQ`, `MDRSubmitQ`
- `MDRStatusOverviewF`
  - core queries: `MDRAwaitingRequestQ`, `MDRRequestQ`, `MDRResubmitQ`, `MDRResubmitRequestQ`, `MDRSubmitQ`
- `MainMenuF`
  - queries: _geen expliciete binding gevonden_
- `NDIMenuF`
  - core queries: `NDIActionNeededQ`, `NDICheckTrackerQ`, `NDIFinishedQ`, `NDIReportNeededQ`
  - form bindings: `~sq_cNDIMenuF~sq_cANCombo`, `~sq_cNDIMenuF~sq_cHoleIDCombo`, `~sq_cNDIMenuF~sq_cPanelCombo`, `~sq_cNDIMenuF~sq_cSubformNDICheckInput`, `~sq_cNDIMenuF~sq_cSubformNDICheckTracker`, `~sq_cNDIMenuF~sq_cSubformNDIFinished`, `~sq_cNDIMenuF~sq_cSubformNDIReportNeeded`
- `NDIReportF`
  - core queries: `NDIActionNeededQ`, `NDICheckTrackerQ`, `NDIFinishedQ`, `NDIReportNeededQ`
  - form bindings: `~sq_fNDIReportF`
- `OrderingTrackerF`
  - core queries: `CreatedHolesTrackerQ`, `DeliveryStatusQ`, `OrderNeededQ`, `OrderStatusTrackerQ`
  - form bindings: `~sq_fOrderingTrackerF`
- `PanelNrCreateF`
  - form bindings: `~sq_fPanelNrCreateF`
- `PanelSelectF`
  - core queries: `PanelSelectQ`
- `SubFormCreatedHolesTracker`
  - queries: _geen expliciete binding gevonden_
- `SubFormHoleIDStatusTracker`
  - form bindings: `~sq_fSubFormHoleIDStatusTracker`
- `SubformDeliveryStatusTracker`
  - form bindings: `~sq_cSubformDeliveryStatusTracker~sq_cPanelID`
- `SubformFinishedInstallation`
  - form bindings: `~sq_cSubformFinishedInstallation~sq_cPanelID`
- `SubformFlexhoneTrackerQ`
  - form bindings: `~sq_cSubformFlexhoneTrackerQ~sq_cPanelID`
- `SubformHoleIDInspection`
  - core queries: `MarkedAsCleanQ`, `MarkedAsCorrodedQ`, `MarkedAsRifledQ`, `ToBeInspectedQ`
- `SubformInstallationTracker`
  - form bindings: `~sq_cSubformInstallationTracker~sq_cPanelID`
- `SubformMDRAwaitingRequest`
  - core queries: `MDRAwaitingRequestQ`, `MDRRequestQ`, `MDRResubmitQ`, `MDRResubmitRequestQ`, `MDRSubmitQ`
- `SubformMDRCheckInput`
  - core queries: `MDRAwaitingRequestQ`, `MDRRequestQ`, `MDRResubmitQ`, `MDRResubmitRequestQ`, `MDRSubmitQ`
- `SubformMDRRequest`
  - core queries: `MDRAwaitingRequestQ`, `MDRRequestQ`, `MDRResubmitQ`, `MDRResubmitRequestQ`, `MDRSubmitQ`
- `SubformMDRResubmitRequest`
  - core queries: `MDRAwaitingRequestQ`, `MDRRequestQ`, `MDRResubmitQ`, `MDRResubmitRequestQ`, `MDRSubmitQ`
- `SubformMDRResubmitTracker`
  - core queries: `MDRAwaitingRequestQ`, `MDRRequestQ`, `MDRResubmitQ`, `MDRResubmitRequestQ`, `MDRSubmitQ`
  - form bindings: `~sq_cSubformMDRResubmitTracker~sq_cPanelID`
- `SubformMDRStatus`
  - core queries: `MDRAwaitingRequestQ`, `MDRRequestQ`, `MDRResubmitQ`, `MDRResubmitRequestQ`, `MDRSubmitQ`
- `SubformMDRSubmitTracker`
  - core queries: `MDRAwaitingRequestQ`, `MDRRequestQ`, `MDRResubmitQ`, `MDRResubmitRequestQ`, `MDRSubmitQ`
  - form bindings: `~sq_cSubformMDRSubmitTracker~sq_cPanelID`
- `SubformMarkedAsClean`
  - queries: _geen expliciete binding gevonden_
- `SubformMarkedAsCorroded`
  - queries: _geen expliciete binding gevonden_
- `SubformMarkedAsRifled`
  - queries: _geen expliciete binding gevonden_
- `SubformMaxBPTracker`
  - form bindings: `~sq_cSubformMaxBPTracker~sq_cPanelID`
- `SubformNDIActionNeeded`
  - core queries: `NDIActionNeededQ`, `NDICheckTrackerQ`, `NDIFinishedQ`, `NDIReportNeededQ`
  - form bindings: `~sq_cSubformNDIActionNeeded~sq_cPanelID`
- `SubformNDICheckInput`
  - core queries: `NDIActionNeededQ`, `NDICheckTrackerQ`, `NDIFinishedQ`, `NDIReportNeededQ`
- `SubformNDICheckTracker`
  - core queries: `NDIActionNeededQ`, `NDICheckTrackerQ`, `NDIFinishedQ`, `NDIReportNeededQ`
- `SubformNDIFinished`
  - core queries: `NDIActionNeededQ`, `NDICheckTrackerQ`, `NDIFinishedQ`, `NDIReportNeededQ`
- `SubformNDIReportNeeded`
  - core queries: `NDIActionNeededQ`, `NDICheckTrackerQ`, `NDIFinishedQ`, `NDIReportNeededQ`
- `SubformOrderStatusTracker`
  - core queries: `CreatedHolesTrackerQ`, `DeliveryStatusQ`, `OrderNeededQ`, `OrderStatusTrackerQ`
  - form bindings: `~sq_cSubformOrderStatusTracker~sq_cPanelID`
- `SubformOrderingStatusOverview`
  - core queries: `CreatedHolesTrackerQ`, `DeliveryStatusQ`, `OrderNeededQ`, `OrderStatusTrackerQ`
- `SubformReamingStepsTracker`
  - form bindings: `~sq_cSubformReamingStepsTracker~sq_cPanelID`
- `SubformToBeInspected`
  - queries: _geen expliciete binding gevonden_
- `TESTTableSubform`
  - core queries: `TESTTableQuery`
- `TestForm`
  - core queries: `TESTTableQuery`
  - form bindings: `~sq_cTestForm~sq_cTESTTableSubform`

## 5) Migratie-implicaties (kort)

- De ACCDB bevat functioneel **alle grote domeinen**: login, hole repair workflow, ordering, MDR, NDI, inspectiequeues en reporting.
- Grootste complexiteit zit in `HoleRepairT` + statusqueries (ordering/installatie/inspectie).
- Voor parity is het handig per domein 1-op-1 dashboards te bouwen op basis van de core queries hierboven.
