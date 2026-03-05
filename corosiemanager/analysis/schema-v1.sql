-- F35 Corrosie Logboek - PostgreSQL schema v1 (MVP)
-- Focus: engineer data entry flow + core traceability

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ========= Lookup =========
CREATE TABLE IF NOT EXISTS lookup_status_code (
  id            BIGSERIAL PRIMARY KEY,
  status_code   TEXT NOT NULL,
  status_code_dcm TEXT,
  UNIQUE(status_code, status_code_dcm)
);

CREATE TABLE IF NOT EXISTS lookup_mdr_options (
  id                              BIGSERIAL PRIMARY KEY,
  lcn                             TEXT,
  discrepancy_type                TEXT,
  cause_code_discrepant_work      TEXT,
  when_discovered                 TEXT,
  discovered_by                   TEXT
);

-- ========= Users =========
CREATE TABLE IF NOT EXISTS user_account (
  id              BIGSERIAL PRIMARY KEY,
  username        TEXT NOT NULL UNIQUE,
  password_hash   TEXT NOT NULL,
  abilities       TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_email_role (
  id              BIGSERIAL PRIMARY KEY,
  email           TEXT NOT NULL,
  role            TEXT NOT NULL,
  UNIQUE(email, role)
);

-- ========= Core hierarchy =========
CREATE TABLE IF NOT EXISTS aircraft (
  id              BIGSERIAL PRIMARY KEY,
  an              TEXT NOT NULL UNIQUE,
  serial_number   TEXT UNIQUE,
  arrival_date    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS panel (
  id                    BIGSERIAL PRIMARY KEY,
  aircraft_id           BIGINT NOT NULL REFERENCES aircraft(id) ON DELETE CASCADE,
  panel_number          INTEGER NOT NULL,
  surface               TEXT CHECK (surface IN ('upper','lower') OR surface IS NULL),
  start_inspection_date TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(aircraft_id, panel_number)
);

CREATE TABLE IF NOT EXISTS hole (
  id                           BIGSERIAL PRIMARY KEY,
  panel_id                     BIGINT NOT NULL REFERENCES panel(id) ON DELETE CASCADE,
  hole_number                  INTEGER NOT NULL,
  max_bp_diameter              INTEGER,
  final_hole_size              INTEGER,
  fit                          TEXT,
  mdr_code                     TEXT,
  mdr_version                  TEXT,
  ndi_name_initials            TEXT,
  ndi_inspection_date          TIMESTAMPTZ,
  ndi_finished                 BOOLEAN NOT NULL DEFAULT FALSE,
  inspection_status            TEXT,
  nutplate_inspection          TEXT,
  nutplate_surface_corrosion   TEXT,
  total_structure_thickness    TEXT,
  total_stackup_length         TEXT,
  stackup_count                INTEGER,
  countersinked                BOOLEAN NOT NULL DEFAULT FALSE,
  clean                        BOOLEAN NOT NULL DEFAULT FALSE,
  cut_sleeve_bushing           BOOLEAN NOT NULL DEFAULT FALSE,
  installed                    BOOLEAN NOT NULL DEFAULT FALSE,
  primer                       BOOLEAN NOT NULL DEFAULT FALSE,
  surface_corrosion            BOOLEAN NOT NULL DEFAULT FALSE,
  flexhone                     TEXT,
  flexndi                      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at                   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(panel_id, hole_number)
);

CREATE INDEX IF NOT EXISTS idx_hole_panel_id ON hole(panel_id);
CREATE INDEX IF NOT EXISTS idx_hole_mdr_code ON hole(mdr_code);

-- Hole steps (normalization of Size(1..10), MDR1..10, etc.)
CREATE TABLE IF NOT EXISTS hole_step (
  id                    BIGSERIAL PRIMARY KEY,
  hole_id               BIGINT NOT NULL REFERENCES hole(id) ON DELETE CASCADE,
  step_no               SMALLINT NOT NULL CHECK (step_no BETWEEN 0 AND 10),
  size_value            INTEGER,
  visual_damage_check   TEXT,
  ream_flag             BOOLEAN,
  mdr_flag              BOOLEAN,
  ndi_flag              BOOLEAN,
  UNIQUE(hole_id, step_no)
);

CREATE TABLE IF NOT EXISTS hole_part (
  id                    BIGSERIAL PRIMARY KEY,
  hole_id               BIGINT NOT NULL REFERENCES hole(id) ON DELETE CASCADE,
  slot_no               SMALLINT NOT NULL CHECK (slot_no BETWEEN 1 AND 4),
  part_number           TEXT,
  part_length           INTEGER,
  bushing_type          TEXT,
  standard_custom       TEXT,
  ordered_flag          BOOLEAN,
  delivered_flag        BOOLEAN,
  status                TEXT,
  UNIQUE(hole_id, slot_no)
);

-- ========= MDR =========
CREATE TABLE IF NOT EXISTS mdr_case (
  id                    BIGSERIAL PRIMARY KEY,
  aircraft_id           BIGINT REFERENCES aircraft(id) ON DELETE SET NULL,
  panel_id              BIGINT REFERENCES panel(id) ON DELETE SET NULL,
  mdr_number            TEXT,
  mdr_version           TEXT,
  ed_number             TEXT,
  subject               TEXT,
  status                TEXT,
  dcm_check             TEXT,
  resubmit              BOOLEAN NOT NULL DEFAULT FALSE,
  approved              BOOLEAN NOT NULL DEFAULT FALSE,
  tier2                 BOOLEAN NOT NULL DEFAULT TRUE,
  request_sent          BOOLEAN NOT NULL DEFAULT FALSE,
  submitted_by          TEXT,
  submit_list_date      TIMESTAMPTZ,
  need_date             TIMESTAMPTZ,
  request_date          TIMESTAMPTZ,
  approval_date         TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mdr_case_number ON mdr_case(mdr_number);
CREATE INDEX IF NOT EXISTS idx_mdr_case_status ON mdr_case(status);

CREATE TABLE IF NOT EXISTS mdr_case_hole (
  mdr_case_id           BIGINT NOT NULL REFERENCES mdr_case(id) ON DELETE CASCADE,
  hole_id               BIGINT NOT NULL REFERENCES hole(id) ON DELETE CASCADE,
  PRIMARY KEY (mdr_case_id, hole_id)
);

CREATE TABLE IF NOT EXISTS mdr_remark (
  id                    BIGSERIAL PRIMARY KEY,
  mdr_case_id           BIGINT NOT NULL REFERENCES mdr_case(id) ON DELETE CASCADE,
  remark_index          SMALLINT NOT NULL CHECK (remark_index BETWEEN 1 AND 5),
  remark_text           TEXT NOT NULL,
  remark_datetime       TIMESTAMPTZ,
  UNIQUE (mdr_case_id, remark_index)
);

CREATE TABLE IF NOT EXISTS mdr_request_detail (
  id                                BIGSERIAL PRIMARY KEY,
  panel_id                          BIGINT REFERENCES panel(id) ON DELETE SET NULL,
  tve                               TEXT,
  task_type                         TEXT,
  fms_non_fms                       TEXT,
  releasability                     TEXT,
  technical_product_number          TEXT,
  technical_product_title           TEXT,
  submitter_name                    TEXT,
  location                          TEXT,
  mdr_type                          TEXT,
  serial_number                     TEXT,
  part_number                       TEXT,
  internal_reference_number         TEXT,
  cr_ecp                            TEXT,
  discrepancy_type                  TEXT,
  cause_code_discrepant_work        TEXT,
  resubmit_reason                   TEXT,
  defect_code                       TEXT,
  access_location                   TEXT,
  date_due_to_field                 TIMESTAMPTZ,
  lcn                               TEXT,
  lcn_description                   TEXT,
  inspection_criteria               TEXT,
  mgi_required                      TEXT,
  mgi_number                        TEXT,
  discovered_during                 TEXT,
  when_discovered                   TEXT,
  discovered_by                     TEXT,
  date_discovered                   TIMESTAMPTZ,
  problem_statement                 TEXT,
  technical_product_details_summary TEXT,
  tms                               TEXT,
  email                             TEXT,
  confirm_email                     TEXT
);

-- ========= NDI =========
CREATE TABLE IF NOT EXISTS ndi_report (
  id                    BIGSERIAL PRIMARY KEY,
  panel_id              BIGINT REFERENCES panel(id) ON DELETE SET NULL,
  hole_id               BIGINT REFERENCES hole(id) ON DELETE SET NULL,
  name_initials         TEXT,
  inspection_date       TIMESTAMPTZ,
  method                TEXT,
  tools                 TEXT,
  corrosion_position    TEXT
);

COMMIT;
