# F35 Corrosie Logboek — Target Datamodel v1 (PostgreSQL)

## 1) Domein-overzicht (ERD in woorden)

- **aircraft** 1—N **panel**
- **panel** 1—N **hole**
- **hole** 1—N **hole_step** (inspectie/ream stappen, i.p.v. size(1..10))
- **hole** 1—N **hole_part** (onderdelen/part 1..4)
- **hole** 1—N **ndi_report**
- **panel** 1—N **mdr_case**
- **mdr_case** N—N **hole** (via koppel: mdr_case_hole)
- **mdr_case** 1—N **mdr_remark**
- **user_account** en **user_email_role** voor login/rollen/notifications
- **lookup_*** tabellen voor dropdown-opties en statuscodes

---

## 2) Tabellen v1 (compact)

### aircraft
- id (pk)
- an (text, uniek)
- serial_number (text, uniek)
- arrival_date (timestamp)

### panel
- id (pk)
- aircraft_id (fk -> aircraft.id)
- panel_number (int)
- surface (text: upper/lower)
- start_inspection_date (timestamp)
- unieke index: (aircraft_id, panel_number)

### hole
- id (pk)
- panel_id (fk -> panel.id)
- hole_number (int)
- max_bp_diameter (int)
- final_hole_size (int)
- fit (text)
- mdr_code (text)
- mdr_version (text)
- ndi_name_initials (text)
- ndi_inspection_date (timestamp)
- ndi_finished (bool)
- inspection_status (text)
- nutplate_inspection (text)
- nutplate_surface_corrosion (text)
- total_structure_thickness (text)
- total_stackup_length (text)
- countersinked, clean, cut_sleeve_bushing, installed, primer, surface_corrosion, flexndi (bool)
- flexhone (text)

### hole_step
- id (pk)
- hole_id (fk -> hole.id)
- step_no (smallint, 0..10)  # 0 = max blueprint stap, 1..10 = opvolgstappen
- size_value (int)
- visual_damage_check (text)
- mdr_flag (bool)
- ndi_flag (bool)
- unieke index: (hole_id, step_no)

### hole_part
- id (pk)
- hole_id (fk -> hole.id)
- slot_no (smallint, 1..4)
- part_number (text)
- part_length (int)
- bushing_type (text)        # sb/cs
- standard_custom (text)     # std/cst
- ordered_flag (bool)
- delivered_flag (bool)
- status (text)
- unieke index: (hole_id, slot_no)

### ndi_report
- id (pk)
- panel_id (fk -> panel.id)
- hole_id (fk -> hole.id)
- name_initials (text)
- inspection_date (timestamp)
- method (text)
- tools (text)
- corrosion_position (text)

### mdr_case
- id (pk)
- aircraft_id (fk -> aircraft.id)
- panel_id (fk -> panel.id)
- mdr_number (text)
- mdr_version (text)
- ed_number (text)
- subject (text)
- status (text)
- dcm_check (text)
- resubmit (bool)
- approved (bool)
- tier2 (bool)
- request_sent (bool)
- submitted_by (text)
- submit_list_date, need_date, request_date, approval_date (timestamp)

### mdr_case_hole
- mdr_case_id (fk -> mdr_case.id)
- hole_id (fk -> hole.id)
- pk (mdr_case_id, hole_id)

### mdr_remark
- id (pk)
- mdr_case_id (fk -> mdr_case.id)
- remark_index (smallint)  # 1..5 vanuit oud model
- remark_text (text)
- remark_datetime (timestamp)

### mdr_request_detail (uit MDRListT)
- id (pk)
- panel_id (fk -> panel.id)
- tve, task_type, fms_non_fms, releasability, technical_product_number, technical_product_title, submitter_name, location, mdr_type, serial_number, part_number, internal_reference_number, cr_ecp, discrepancy_type, cause_code_discrepant_work, resubmit_reason, defect_code, access_location, lcn, lcn_description, inspection_criteria, mgi_required, mgi_number, discovered_during, when_discovered, discovered_by, problem_statement, technical_product_details_summary, tms, email, confirm_email
- date_due_to_field, date_discovered (timestamp)

### user_account
- id (pk)
- username (text, uniek)
- password_hash (text)  # migratie: plaintext NIET overnemen
- abilities (text)
- is_active (bool)

### user_email_role
- id (pk)
- email (text)
- role (text)

### lookup_status_code
- id (pk)
- status_code (text)
- status_code_dcm (text)

### lookup_mdr_options
- id (pk)
- lcn (text)
- discrepancy_type (text)
- cause_code_discrepant_work (text)
- when_discovered (text)
- discovered_by (text)

---

## 3) Waarom dit beter is dan Access as-is

- Geen herhalende kolommen meer (`size(1..10)`, `part 1..4`) → schaalbaar en querybaar
- Strakkere referentiële integriteit via echte FK’s
- Duidelijke scheiding tussen:
  - operationele hole-data,
  - MDR-status/remarks,
  - MDR-aanvraagdetail,
  - lookup/dropdown-data
- Eenvoudiger API-contracten en Angular forms
