# Mapping — Access `HoleRepairT` -> nieuw model

Bron: `HoleRepairT` (126 records)

## A) Directe velden naar `hole`

- `UHoleID` -> `hole.id` (tijdelijk als legacy_id bewaren tijdens migratie)
- `PanelID` -> `hole.panel_id`
- `HoleID` -> `hole.hole_number`
- `MaxBPDiameter` -> `hole.max_bp_diameter`
- `FinalHoleSize` -> `hole.final_hole_size`
- `Fit` -> `hole.fit`
- `MDRCode` -> `hole.mdr_code`
- `MDRVersion` -> `hole.mdr_version`
- `MDRResubmit` -> `hole` (of afleiden naar `mdr_case.resubmit`, afhankelijk van functionele validatie)
- `NDINameInitials` -> `hole.ndi_name_initials`
- `NDIInspectionDate` -> `hole.ndi_inspection_date`
- `NDIFinished` -> `hole.ndi_finished`
- `TotalStackUpLength` -> `hole.total_stackup_length`
- `Stack Up` -> (optioneel apart veld, waarschijnlijk numeriek stackup_count)
- `Countersinked` -> `hole.countersinked`
- `Clean` -> `hole.clean`
- `Cut Sleeve/Bushing` -> `hole.cut_sleeve_bushing`
- `Installed` -> `hole.installed`
- `Primer` -> `hole.primer`
- `Surface Corrosion` -> `hole.surface_corrosion`
- `NutplateInspection` -> `hole.nutplate_inspection`
- `NutplateSurfaceCorrosion` -> `hole.nutplate_surface_corrosion`
- `TotalStructureThickness` -> `hole.total_structure_thickness`
- `Flexhone` -> `hole.flexhone`
- `FlexNDI` -> `hole.flexndi`
- `InspectionStatus` -> `hole.inspection_status`

## B) Herhalende inspectiestappen -> `hole_step`

### Stap 0 (max blueprint)
- `Ream Max B/P` -> `hole_step(step_no=0).mdr_flag` (of aparte boolean `ream_flag`)
- `Visual Damage Check` -> `hole_step(step_no=0).visual_damage_check`
- `MDRMaxBP` -> `hole_step(step_no=0).mdr_flag`
- `NDIMaxBP` -> `hole_step(step_no=0).ndi_flag`
- `MaxBPDiameter` -> `hole_step(step_no=0).size_value` (optioneel duplicaat)

### Stappen 1..10
Voor elke n in 1..10:
- `Size (n)` -> `hole_step(step_no=n).size_value`
- `Visual Damage Check (n)` -> `hole_step(step_no=n).visual_damage_check`
- `MDRn` -> `hole_step(step_no=n).mdr_flag`
- `NDIn` -> `hole_step(step_no=n).ndi_flag`

## C) Onderdelenvelden -> `hole_part` (slot 1..4)

Voor elke slot s in 1..4:
- `Part Number s` -> `hole_part(slot_no=s).part_number`
- `Length Part s` -> `hole_part(slot_no=s).part_length`
- `SB/CSs` -> `hole_part(slot_no=s).bushing_type`
- `STD/CSTs` -> `hole_part(slot_no=s).standard_custom`
- `Ordered Item s` -> `hole_part(slot_no=s).ordered_flag`
- `Delivered Item s` -> `hole_part(slot_no=s).delivered_flag`
- `PartStatuss` -> `hole_part(slot_no=s).status`

## D) Nog te beslissen (business-afstemming)

1. `MDRResubmit` hoort conceptueel eerder bij `mdr_case` dan bij `hole`.
2. `Stack Up` datatype: nu integer? betekenis exact valideren.
3. Dubbele semantiek rond stap 0 (`Ream Max B/P` vs `MDRMaxBP`) moet strak worden gedefinieerd.
4. Mogelijk moeten sommige textvelden enums worden (status/inspection values).

## E) Migratiestrategie voor HoleRepairT

1. Maak `legacy_holerepair_raw` staging tabel (1-op-1 kolommen uit Access)
2. ETL script in Python:
   - insert `hole`
   - explode stappen 0..10 naar `hole_step`
   - explode slots 1..4 naar `hole_part`
3. Validatie:
   - record count gaten (`hole`) == broncount
   - som niet-lege stappen en parts consistent
   - steekproef per panel/hole tegen Access UI
