-- ----------------------------------------------------------
-- MDB Tools - A library for reading MS Access database files
-- Copyright (C) 2000-2011 Brian Bruns and others.
-- Files in libmdb are licensed under LGPL and the utilities under
-- the GPL, see COPYING.LIB and COPYING files respectively.
-- Check out http://mdbtools.sourceforge.net
-- ----------------------------------------------------------

SET client_encoding = 'UTF-8';

CREATE TABLE IF NOT EXISTS "aircraftnrt"
 (
	"uaircraftid"			SERIAL, 
	"an"			VARCHAR (255), 
	"arrivaldate"			TIMESTAMP WITHOUT TIME ZONE, 
	"serialnumber"			VARCHAR (255)
);
COMMENT ON COLUMN "aircraftnrt"."an" IS 'TVE';
COMMENT ON COLUMN "aircraftnrt"."serialnumber" IS 'UAI';

-- CREATE INDEXES ...
CREATE INDEX "aircraftnrt_aircraftnrtan_idx" ON "aircraftnrt" ("an");
ALTER TABLE "aircraftnrt" ADD CONSTRAINT "aircraftnrt_pkey" PRIMARY KEY ("uaircraftid");

CREATE TABLE IF NOT EXISTS "aircraftselectiont"
 (
	"an"			VARCHAR (255), 
	"uai"			VARCHAR (255), 
	"notes"			VARCHAR (255)
);
COMMENT ON COLUMN "aircraftselectiont"."an" IS 'Aircraft Number';
COMMENT ON COLUMN "aircraftselectiont"."uai" IS 'Unique Aircraft Identifier (Serial Number)';

-- CREATE INDEXES ...

CREATE TABLE IF NOT EXISTS "holerepairt"
 (
	"uholeid"			SERIAL, 
	"panelid"			INTEGER, 
	"holeid"			INTEGER, 
	"maxbpdiameter"			INTEGER, 
	"ream max b/p"			BOOLEAN NOT NULL, 
	"visual damage check"			VARCHAR (255), 
	"mdrmaxbp"			BOOLEAN NOT NULL, 
	"ndimaxbp"			BOOLEAN NOT NULL, 
	"fit"			VARCHAR (255), 
	"size (1)"			INTEGER, 
	"visual damage check (1)"			VARCHAR (255), 
	"mdr1"			BOOLEAN NOT NULL, 
	"ndi1"			BOOLEAN NOT NULL, 
	"size (2)"			INTEGER, 
	"visual damage check (2)"			VARCHAR (255), 
	"mdr2"			BOOLEAN NOT NULL, 
	"ndi2"			BOOLEAN NOT NULL, 
	"size (3)"			INTEGER, 
	"visual damage check (3)"			VARCHAR (255), 
	"mdr3"			BOOLEAN NOT NULL, 
	"ndi3"			BOOLEAN NOT NULL, 
	"size (4)"			INTEGER, 
	"visual damage check (4)"			VARCHAR (255), 
	"mdr4"			BOOLEAN NOT NULL, 
	"ndi4"			BOOLEAN NOT NULL, 
	"size (5)"			INTEGER, 
	"visual damage check (5)"			VARCHAR (255), 
	"mdr5"			BOOLEAN NOT NULL, 
	"ndi5"			BOOLEAN NOT NULL, 
	"size (6)"			INTEGER, 
	"visual damage check (6)"			VARCHAR (255), 
	"mdr6"			BOOLEAN NOT NULL, 
	"ndi6"			BOOLEAN NOT NULL, 
	"size (7)"			INTEGER, 
	"visual damage check (7)"			VARCHAR (255), 
	"mdr7"			BOOLEAN NOT NULL, 
	"ndi7"			BOOLEAN NOT NULL, 
	"size (8)"			INTEGER, 
	"visual damage check (8)"			VARCHAR (255), 
	"mdr8"			BOOLEAN NOT NULL, 
	"ndi8"			BOOLEAN NOT NULL, 
	"size (9)"			INTEGER, 
	"visual damage check (9)"			VARCHAR (255), 
	"mdr9"			BOOLEAN NOT NULL, 
	"ndi9"			BOOLEAN NOT NULL, 
	"size (10)"			INTEGER, 
	"visual damage check (10)"			VARCHAR (255), 
	"mdr10"			BOOLEAN NOT NULL, 
	"ndi10"			BOOLEAN NOT NULL, 
	"finalholesize"			INTEGER, 
	"mdrcode"			VARCHAR (255), 
	"mdrversion"			VARCHAR (255), 
	"mdrresubmit"			BOOLEAN NOT NULL, 
	"ndinameinitials"			VARCHAR (255), 
	"ndiinspectiondate"			TIMESTAMP WITHOUT TIME ZONE, 
	"ndifinished"			BOOLEAN NOT NULL, 
	"totalstackuplength"			VARCHAR (255), 
	"stack up"			INTEGER, 
	"sleeve/bushings"			VARCHAR (255), 
	"part number 1"			VARCHAR (255), 
	"part number 2"			VARCHAR (255), 
	"part number 3"			VARCHAR (255), 
	"part number 4"			VARCHAR (255), 
	"sb/cs1"			VARCHAR (255), 
	"sb/cs2"			VARCHAR (255), 
	"sb/cs3"			VARCHAR (255), 
	"sb/cs4"			VARCHAR (255), 
	"ordered item 1"			BOOLEAN NOT NULL, 
	"ordered item 2"			BOOLEAN NOT NULL, 
	"ordered item 3"			BOOLEAN NOT NULL, 
	"ordered item 4"			BOOLEAN NOT NULL, 
	"delivered item 1"			BOOLEAN NOT NULL, 
	"delivered item 2"			BOOLEAN NOT NULL, 
	"delivered item 3"			BOOLEAN NOT NULL, 
	"delivered item 4"			BOOLEAN NOT NULL, 
	"partstatus1"			VARCHAR (255), 
	"partstatus2"			VARCHAR (255), 
	"partstatus3"			VARCHAR (255), 
	"partstatus4"			VARCHAR (255), 
	"countersinked"			BOOLEAN NOT NULL, 
	"clean"			BOOLEAN NOT NULL, 
	"cut sleeve/bushing"			BOOLEAN NOT NULL, 
	"installed"			BOOLEAN NOT NULL, 
	"primer"			BOOLEAN NOT NULL, 
	"surface corrosion"			BOOLEAN NOT NULL, 
	"length part 2"			INTEGER, 
	"length part 3"			INTEGER, 
	"length part 4"			INTEGER, 
	"length part 1"			INTEGER, 
	"std/cst1"			VARCHAR (255), 
	"std/cst2"			VARCHAR (255), 
	"std/cst3"			VARCHAR (255), 
	"std/cst4"			VARCHAR (255), 
	"nutplateinspection"			VARCHAR (255), 
	"nutplatesurfacecorrosion"			VARCHAR (255), 
	"totalstructurethickness"			VARCHAR (255), 
	"flexhone"			VARCHAR (255), 
	"flexndi"			BOOLEAN NOT NULL, 
	"inspectionstatus"			VARCHAR (255)
);
COMMENT ON COLUMN "holerepairt"."panelid" IS 'Displays PanelID but is found by UPanelID';
COMMENT ON COLUMN "holerepairt"."maxbpdiameter" IS 'Max Blueprint (B/P) Diameter';
COMMENT ON COLUMN "holerepairt"."sb/cs1" IS 'Straight Bushing / CounterSunk';
COMMENT ON COLUMN "holerepairt"."sb/cs2" IS 'Straight Bushing / CounterSunk';
COMMENT ON COLUMN "holerepairt"."sb/cs3" IS 'Straight Bushing / CounterSunk';
COMMENT ON COLUMN "holerepairt"."sb/cs4" IS 'Straight Bushing / CounterSunk';
COMMENT ON COLUMN "holerepairt"."partstatus1" IS '"Open" ; "In progress @EST" ; "Ordered @981" ; "Received @LSE" ; "Delivered @Floor" ; "Closed"; " "';
COMMENT ON COLUMN "holerepairt"."std/cst1" IS 'Stadard / Custom';
COMMENT ON COLUMN "holerepairt"."std/cst2" IS 'Stadard / Custom';
COMMENT ON COLUMN "holerepairt"."std/cst3" IS 'Stadard / Custom';
COMMENT ON COLUMN "holerepairt"."std/cst4" IS 'Stadard / Custom';
COMMENT ON COLUMN "holerepairt"."inspectionstatus" IS 'Hole Status after Inspection phase';

-- CREATE INDEXES ...
CREATE INDEX "holerepairt_holerepairtholeid_idx" ON "holerepairt" ("holeid");
CREATE INDEX "holerepairt_mdrcode_idx" ON "holerepairt" ("mdrcode");
ALTER TABLE "holerepairt" ADD CONSTRAINT "holerepairt_pkey" PRIMARY KEY ("uholeid");

CREATE TABLE IF NOT EXISTS "mdrlistt"
 (
	"keymdrid"			SERIAL, 
	"tve"			VARCHAR (255), 
	"upanelid"			INTEGER, 
	"panelid"			INTEGER, 
	"task type"			VARCHAR (255), 
	"fms or non-fms"			VARCHAR (255), 
	"releasability"			VARCHAR (255), 
	"technical product number"			VARCHAR (255), 
	"technical product title"			VARCHAR (255), 
	"submitter name"			VARCHAR (255), 
	"location"			VARCHAR (255), 
	"mdr type"			VARCHAR (255), 
	"serial number"			VARCHAR (255), 
	"part number"			VARCHAR (255), 
	"internal reference number"			VARCHAR (255), 
	"cr/ecp"			VARCHAR (255), 
	"discrepancy type"			VARCHAR (255), 
	"cause code/discrepant work"			VARCHAR (255), 
	"resubmit reason"			VARCHAR (255), 
	"defect code"			VARCHAR (255), 
	"access location"			VARCHAR (255), 
	"date due to the field"			TIMESTAMP WITHOUT TIME ZONE, 
	"lcn"			VARCHAR (255), 
	"lcn description"			TEXT, 
	"inspection criteria"			VARCHAR (255), 
	"mgi required"			VARCHAR (255), 
	"mgi number"			VARCHAR (255), 
	"discovered during"			VARCHAR (255), 
	"when discovered"			VARCHAR (255), 
	"discovered by"			VARCHAR (255), 
	"date discovered"			TIMESTAMP WITHOUT TIME ZONE, 
	"problem statement"			TEXT, 
	"technical product details summary"			TEXT, 
	"t/m/s"			VARCHAR (255), 
	"email"			VARCHAR (255), 
	"confirm email"			VARCHAR (255)
);

-- CREATE INDEXES ...
CREATE INDEX "mdrlistt_defect code_idx" ON "mdrlistt" ("defect code");
CREATE INDEX "mdrlistt_holeid_idx" ON "mdrlistt" ("panelid");
ALTER TABLE "mdrlistt" ADD CONSTRAINT "mdrlistt_pkey" PRIMARY KEY ("keymdrid");
CREATE INDEX "mdrlistt_uholeid_idx" ON "mdrlistt" ("upanelid");

CREATE TABLE IF NOT EXISTS "mdrstatusdropdownt"
 (
	"statuscodes"			VARCHAR (255), 
	"statuscodesdcm"			VARCHAR (255)
);

-- CREATE INDEXES ...

CREATE TABLE IF NOT EXISTS "mdrstatust"
 (
	"mdrid"			SERIAL, 
	"uaircraftid"			INTEGER, 
	"an"			VARCHAR (255), 
	"serialnumber"			VARCHAR (255), 
	"arrivaldate"			TIMESTAMP WITHOUT TIME ZONE, 
	"upanelid"			INTEGER, 
	"panelid"			INTEGER, 
	"holeids"			VARCHAR (255), 
	"resubmit"			BOOLEAN NOT NULL, 
	"requestsent"			BOOLEAN NOT NULL, 
	"subject"			VARCHAR (255), 
	"status"			VARCHAR (255), 
	"dcm check"			VARCHAR (255), 
	"mdrnumber"			VARCHAR (255), 
	"mdrversion"			VARCHAR (255), 
	"ednumber"			VARCHAR (255), 
	"submittedby"			VARCHAR (255), 
	"submitlistdate"			TIMESTAMP WITHOUT TIME ZONE, 
	"needdate"			TIMESTAMP WITHOUT TIME ZONE, 
	"requestdate"			TIMESTAMP WITHOUT TIME ZONE, 
	"remarksv1"			TEXT, 
	"remarksv2"			TEXT, 
	"remarksv3"			TEXT, 
	"remarksv4"			TEXT, 
	"remarksv5"			TEXT, 
	"remarkdatev1"			TIMESTAMP WITHOUT TIME ZONE, 
	"remarkdatev2"			TIMESTAMP WITHOUT TIME ZONE, 
	"remarkdatev3"			TIMESTAMP WITHOUT TIME ZONE, 
	"remarkdatev4"			TIMESTAMP WITHOUT TIME ZONE, 
	"remarkdatev5"			TIMESTAMP WITHOUT TIME ZONE, 
	"remarktimev1"			TIMESTAMP WITHOUT TIME ZONE, 
	"remarktimev2"			TIMESTAMP WITHOUT TIME ZONE, 
	"remarktimev3"			TIMESTAMP WITHOUT TIME ZONE, 
	"remarktimev4"			TIMESTAMP WITHOUT TIME ZONE, 
	"remarktimev5"			TIMESTAMP WITHOUT TIME ZONE, 
	"approved"			BOOLEAN NOT NULL, 
	"approvaldate"			TIMESTAMP WITHOUT TIME ZONE, 
	"tier2"			BOOLEAN NOT NULL
);
COMMENT ON COLUMN "mdrstatust"."holeids" IS 'Set to short text to group more HoleIDs into the MDR';
COMMENT ON COLUMN "mdrstatust"."approved" IS 'MDR Received and approved by EST, needs to be checked by DCM and DPC';
COMMENT ON COLUMN "mdrstatust"."tier2" IS 'To track which MDR are Tier 2 related';

-- CREATE INDEXES ...
CREATE INDEX "mdrstatust_panelid_idx" ON "mdrstatust" ("upanelid");
CREATE INDEX "mdrstatust_panelid1_idx" ON "mdrstatust" ("panelid");
ALTER TABLE "mdrstatust" ADD CONSTRAINT "mdrstatust_pkey" PRIMARY KEY ("mdrid");
CREATE INDEX "mdrstatust_uaicraftid_idx" ON "mdrstatust" ("uaircraftid");

CREATE TABLE IF NOT EXISTS "ndireportt"
 (
	"keyndireport"			SERIAL, 
	"keypanelid"			INTEGER, 
	"uholeid"			INTEGER, 
	"holeid"			INTEGER, 
	"nameinitials"			VARCHAR (255), 
	"inspectiondate"			TIMESTAMP WITHOUT TIME ZONE, 
	"method"			VARCHAR (255), 
	"tools"			TEXT, 
	"corropos"			VARCHAR (255)
);
COMMENT ON COLUMN "ndireportt"."corropos" IS 'Corrosion position';

-- CREATE INDEXES ...
CREATE INDEX "ndireportt_holeid_idx" ON "ndireportt" ("holeid");
CREATE INDEX "ndireportt_ndireporttcorropos_idx" ON "ndireportt" ("corropos");
CREATE INDEX "ndireportt_panelid_idx" ON "ndireportt" ("keypanelid");
ALTER TABLE "ndireportt" ADD CONSTRAINT "ndireportt_pkey" PRIMARY KEY ("keyndireport");
CREATE INDEX "ndireportt_uholeid_idx" ON "ndireportt" ("uholeid");

CREATE TABLE IF NOT EXISTS "panelnrt"
 (
	"upanelid"			SERIAL, 
	"an"			INTEGER, 
	"panel number"			INTEGER, 
	"start inspection date"			TIMESTAMP WITHOUT TIME ZONE, 
	"upper/lower"			VARCHAR (255)
);
COMMENT ON COLUMN "panelnrt"."an" IS 'Displays AN but is found by UAircraftID';
COMMENT ON COLUMN "panelnrt"."upper/lower" IS 'Upper or lower surface panel, Only applicable for TIER 2 Panels';

-- CREATE INDEXES ...
ALTER TABLE "panelnrt" ADD CONSTRAINT "panelnrt_pkey" PRIMARY KEY ("upanelid");

CREATE TABLE IF NOT EXISTS "userlogint"
 (
	"userid"			SERIAL, 
	"username"			VARCHAR (255) NOT NULL, 
	"password"			VARCHAR (255), 
	"user abilities"			VARCHAR (255)
);
COMMENT ON COLUMN "userlogint"."userid" IS 'Do not change! Loginscreen works by looking up Username and Password via UserID.';

-- CREATE INDEXES ...
ALTER TABLE "userlogint" ADD CONSTRAINT "userlogint_pkey" PRIMARY KEY ("userid");
CREATE INDEX "userlogint_userid_idx" ON "userlogint" ("userid");

CREATE TABLE IF NOT EXISTS "mdrlistdropdownoptionst"
 (
	"lcn"			VARCHAR (255), 
	"discrepancy type"			VARCHAR (255), 
	"cause code/discrepant work"			VARCHAR (255), 
	"when discovered"			VARCHAR (255), 
	"discovered by"			VARCHAR (255)
);

-- CREATE INDEXES ...

CREATE TABLE IF NOT EXISTS "testtable"
 (
	"uholeid"			SERIAL, 
	"keypanelid"			INTEGER, 
	"holeid"			INTEGER, 
	"maxbpsize"			INTEGER, 
	"testvak"			VARCHAR (255), 
	"testvak2"			VARCHAR (255), 
	"testcheck"			BOOLEAN NOT NULL
);

-- CREATE INDEXES ...
CREATE INDEX "testtable_holeid_idx" ON "testtable" ("holeid");
CREATE INDEX "testtable_keypanelid_idx" ON "testtable" ("keypanelid");
ALTER TABLE "testtable" ADD CONSTRAINT "testtable_pkey" PRIMARY KEY ("uholeid");

CREATE TABLE IF NOT EXISTS "useremailst"
 (
	"email"			VARCHAR (255), 
	"role"			VARCHAR (255)
);

-- CREATE INDEXES ...


-- CREATE Relationships ...
ALTER TABLE "PanelNrT" ADD CONSTRAINT "panelnrt_an_fk" FOREIGN KEY ("an") REFERENCES "AircraftNrT"("uaircraftid") ON UPDATE CASCADE DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE "NDIReportT" ADD CONSTRAINT "ndireportt_uholeid_fk" FOREIGN KEY ("uholeid") REFERENCES "HoleRepairT"("uholeid") ON UPDATE CASCADE DEFERRABLE INITIALLY IMMEDIATE;
-- Relationship from "NDIReportT" ("nameinitials") to "HoleRepairT"("ndinameinitials") does not enforce integrity.
-- Relationship from "NDIReportT" ("nameinitials") to "HoleRepairT"("ndinameinitials") does not enforce integrity.
-- Relationship from "HoleRepairT" ("mdrcode") to "MDRStatusT"("mdrnumber") does not enforce integrity.
-- Relationship from "HoleRepairT" ("panelid") to "MDRStatusT"("upanelid") does not enforce integrity.
ALTER TABLE "MSysNavPaneGroups" ADD CONSTRAINT "msysnavpanegroups_groupcategoryid_fk" FOREIGN KEY ("groupcategoryid") REFERENCES "MSysNavPaneGroupCategories"("id") ON UPDATE CASCADE ON DELETE CASCADE DEFERRABLE INITIALLY IMMEDIATE;
ALTER TABLE "MSysNavPaneGroupToObjects" ADD CONSTRAINT "msysnavpanegrouptoobjects_groupid_fk" FOREIGN KEY ("groupid") REFERENCES "MSysNavPaneGroups"("id") ON UPDATE CASCADE ON DELETE CASCADE DEFERRABLE INITIALLY IMMEDIATE;
-- Relationship from "HoleRepairT" ("ndiinspectiondate") to "NDIReportT"("inspectiondate") does not enforce integrity.
ALTER TABLE "HoleRepairT" ADD CONSTRAINT "holerepairt_panelid_fk" FOREIGN KEY ("panelid") REFERENCES "PanelNrT"("upanelid") ON DELETE CASCADE DEFERRABLE INITIALLY IMMEDIATE;
-- Relationship from "MDRListT" ("upanelid") to "PanelNrT"("upanelid") does not enforce integrity.
ALTER TABLE "MDRStatusT" ADD CONSTRAINT "mdrstatust_upanelid_fk" FOREIGN KEY ("upanelid") REFERENCES "PanelNrT"("upanelid") ON UPDATE CASCADE DEFERRABLE INITIALLY IMMEDIATE;
