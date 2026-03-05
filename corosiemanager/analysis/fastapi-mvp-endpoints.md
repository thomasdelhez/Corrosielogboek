# FastAPI MVP endpointlijst — F35 Corrosie logboek

Doel: engineers moeten snel/correct corrosie- en hole-data kunnen invoeren.

## Auth

- `POST /api/v1/auth/login`
  - body: `{ username, password }`
  - response: `{ access_token, token_type, role }`

- `GET /api/v1/auth/me`
  - response: current user profile

---

## Aircraft & Panels

- `GET /api/v1/aircraft`
  - query: `q`, `limit`, `offset`
- `POST /api/v1/aircraft`
- `GET /api/v1/aircraft/{aircraft_id}`

- `GET /api/v1/aircraft/{aircraft_id}/panels`
- `POST /api/v1/aircraft/{aircraft_id}/panels`
- `GET /api/v1/panels/{panel_id}`

---

## Holes (MVP kern)

- `GET /api/v1/panels/{panel_id}/holes`
  - query: `inspection_status`, `mdr_code`, `q`, `limit`, `offset`

- `POST /api/v1/panels/{panel_id}/holes`
  - maakt hole + (optioneel) steps + parts in één call

- `GET /api/v1/holes/{hole_id}`
  - response: hole + steps + parts + latest ndi + gekoppelde mdr

- `PUT /api/v1/holes/{hole_id}`
  - update kernvelden (fit, status, ndi flags, etc.)

- `PUT /api/v1/holes/{hole_id}/steps`
  - body: `[{ step_no, size_value, visual_damage_check, ream_flag, mdr_flag, ndi_flag }]`

- `PUT /api/v1/holes/{hole_id}/parts`
  - body: `[{ slot_no, part_number, part_length, bushing_type, standard_custom, ordered_flag, delivered_flag, status }]`

---

## MDR

- `GET /api/v1/mdr-cases`
  - query: `status`, `tier2`, `mdr_number`, `panel_id`, `limit`, `offset`

- `POST /api/v1/mdr-cases`
- `GET /api/v1/mdr-cases/{mdr_case_id}`
- `PUT /api/v1/mdr-cases/{mdr_case_id}`

- `POST /api/v1/mdr-cases/{mdr_case_id}/holes/{hole_id}`
- `DELETE /api/v1/mdr-cases/{mdr_case_id}/holes/{hole_id}`

- `POST /api/v1/mdr-cases/{mdr_case_id}/remarks`
  - body: `{ remark_index, remark_text, remark_datetime? }`

---

## NDI

- `POST /api/v1/holes/{hole_id}/ndi-reports`
- `GET /api/v1/holes/{hole_id}/ndi-reports`

---

## Lookups (dropdowns)

- `GET /api/v1/lookups/status-codes`
- `GET /api/v1/lookups/mdr-options`

---

## Validatie (essentieel voor MVP)

1. `panel_id + hole_number` moet uniek blijven.
2. `hole_step.step_no` alleen 0..10.
3. `hole_part.slot_no` alleen 1..4.
4. Indien `ndi_finished=true`, dan `ndi_name_initials` en `ndi_inspection_date` verplicht.
5. Bij status-overgangen (bijv. closed/approved) server-side checks afdwingen.

---

## Angular pagina-structuur (MVP)

1. Login
2. Aircraft selector
3. Panel overview
4. Hole list (filters + quick search)
5. Hole detail / edit form
   - tab A: core fields
   - tab B: steps (0..10)
   - tab C: parts (1..4)
   - tab D: MDR links + remarks
   - tab E: NDI reports
