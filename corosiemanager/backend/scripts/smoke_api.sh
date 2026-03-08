#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-http://127.0.0.1:8002}"

login() {
  local user="$1"
  local pass="$2"
  curl -fsS -X POST "$BASE_URL/api/v1/auth/login" \
    -H 'Content-Type: application/json' \
    -d "{\"username\":\"$user\",\"password\":\"$pass\"}" \
  | python3 -c 'import sys,json; print(json.load(sys.stdin)["token"])'
}

json_get() {
  local expr="$1"
  python3 -c "import json,sys; d=json.load(sys.stdin); print($expr)"
}

echo "[1/14] health"
curl -fsS "$BASE_URL/health" >/dev/null

ENGINEER_TOKEN=$(login engineer engineer)
REVIEWER_TOKEN=$(login reviewer reviewer)
ADMIN_TOKEN=$(login admin admin)

echo "[2/14] aircraft list (auth)"
AIRCRAFT_JSON=$(curl -fsS "$BASE_URL/api/v1/aircraft" -H "Authorization: Bearer $ENGINEER_TOKEN")
AIRCRAFT_ID=$(printf '%s' "$AIRCRAFT_JSON" | json_get 'd[0]["id"] if d else ""')

if [[ -z "$AIRCRAFT_ID" ]]; then
  echo "No aircraft found, creating smoke aircraft as admin"
  SMOKE_AN="SMK-$RANDOM"
  AIRCRAFT_ID=$(curl -fsS -X POST "$BASE_URL/api/v1/aircraft" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H 'Content-Type: application/json' \
    -d "{\"an\":\"$SMOKE_AN\",\"serial_number\":\"$SMOKE_AN\"}" \
    | json_get 'd["id"]')
fi

echo "[3/14] panels list/create (auth)"
PANELS_JSON=$(curl -fsS "$BASE_URL/api/v1/panels?aircraft_id=$AIRCRAFT_ID" -H "Authorization: Bearer $ENGINEER_TOKEN")
PANEL_ID=$(printf '%s' "$PANELS_JSON" | json_get 'd[0]["id"] if d else ""')
if [[ -z "$PANEL_ID" ]]; then
  PANEL_NR=$((100 + RANDOM % 1000))
  PANEL_ID=$(curl -fsS -X POST "$BASE_URL/api/v1/panels" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H 'Content-Type: application/json' \
    -d "{\"aircraft_id\":$AIRCRAFT_ID,\"panel_number\":$PANEL_NR}" \
    | json_get 'd["id"]')
fi

echo "[4/14] ensure at least one hole exists"
HOLES_JSON=$(curl -fsS "$BASE_URL/api/v1/panels/$PANEL_ID/holes" -H "Authorization: Bearer $ENGINEER_TOKEN")
HOLE_ID=$(printf '%s' "$HOLES_JSON" | json_get 'd[0]["id"] if d else ""')
if [[ -z "$HOLE_ID" ]]; then
  HOLE_NR=$((500000 + RANDOM % 10000))
  HOLE_ID=$(curl -fsS -X POST "$BASE_URL/api/v1/panels/$PANEL_ID/holes" \
    -H "Authorization: Bearer $ENGINEER_TOKEN" \
    -H 'Content-Type: application/json' \
    -d "{\"hole_number\":$HOLE_NR,\"ndi_finished\":false,\"steps\":[],\"parts\":[]}" \
    | json_get 'd["id"]')
fi

echo "[5/14] batch hole create"
SMOKE_HOLE_A=$((900000 + RANDOM % 1000))
SMOKE_HOLE_B=$((SMOKE_HOLE_A + 1))
BATCH_RESULT=$(curl -fsS -X POST "$BASE_URL/api/v1/panels/$PANEL_ID/holes/batch" \
  -H "Authorization: Bearer $ENGINEER_TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{\"holes\":[{\"hole_number\":$SMOKE_HOLE_A,\"ndi_finished\":false,\"steps\":[],\"parts\":[]},{\"hole_number\":$SMOKE_HOLE_B,\"ndi_finished\":false,\"steps\":[],\"parts\":[]},{\"hole_number\":$SMOKE_HOLE_A,\"ndi_finished\":false,\"steps\":[],\"parts\":[]}]}" )
python3 - <<'PY' "$BATCH_RESULT"
import json, sys
row = json.loads(sys.argv[1])
assert row["created"] >= 2, row
assert row["skipped"] >= 1, row
print("batch-ok")
PY

echo "[6/14] dashboards"
curl -fsS "$BASE_URL/api/v1/ordering-tracker?panel_id=$PANEL_ID" -H "Authorization: Bearer $ENGINEER_TOKEN" >/dev/null
curl -fsS "$BASE_URL/api/v1/inspection-dashboard?panel_id=$PANEL_ID" -H "Authorization: Bearer $ENGINEER_TOKEN" >/dev/null
curl -fsS "$BASE_URL/api/v1/hole-trackers?panel_id=$PANEL_ID" -H "Authorization: Bearer $ENGINEER_TOKEN" >/dev/null
curl -fsS "$BASE_URL/api/v1/installation-trackers?panel_id=$PANEL_ID" -H "Authorization: Bearer $ENGINEER_TOKEN" >/dev/null
curl -fsS "$BASE_URL/api/v1/ndi-dashboard?panel_id=$PANEL_ID" -H "Authorization: Bearer $ENGINEER_TOKEN" >/dev/null

echo "[7/14] reporting endpoints"
curl -fsS "$BASE_URL/api/v1/reports/corrosion-tracker?panel_id=$PANEL_ID" -H "Authorization: Bearer $ENGINEER_TOKEN" >/dev/null
curl -fsS "$BASE_URL/api/v1/reports/mdr-powerpoint-info?panel_id=$PANEL_ID" -H "Authorization: Bearer $ENGINEER_TOKEN" >/dev/null

echo "[8/14] create MDR case (engineer)"
MDR_ID=$(curl -fsS -X POST "$BASE_URL/api/v1/mdr-cases" \
  -H "Authorization: Bearer $ENGINEER_TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{\"panel_id\":$PANEL_ID,\"mdr_number\":\"SMOKE-MDR\",\"mdr_version\":\"A\",\"subject\":\"Smoke case\",\"status\":\"Request\",\"submitted_by\":\"ENG\",\"request_date\":null,\"need_date\":null,\"approved\":false}" \
  | json_get 'd["id"]')

echo "[9/14] MDR transition + remarks"
curl -fsS -X POST "$BASE_URL/api/v1/mdr-cases/$MDR_ID/transition" \
  -H "Authorization: Bearer $REVIEWER_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"to_status":"Submit"}' >/dev/null

curl -fsS -X POST "$BASE_URL/api/v1/mdr-cases/$MDR_ID/remarks" \
  -H "Authorization: Bearer $ENGINEER_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"remark_index":1,"remark_text":"smoke"}' >/dev/null

curl -fsS "$BASE_URL/api/v1/mdr-cases/$MDR_ID/remarks" -H "Authorization: Bearer $ENGINEER_TOKEN" >/dev/null

echo "[10/14] NDI report create"
curl -fsS -X POST "$BASE_URL/api/v1/holes/$HOLE_ID/ndi-reports" \
  -H "Authorization: Bearer $ENGINEER_TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{\"panel_id\":$PANEL_ID,\"name_initials\":\"SMK\",\"inspection_date\":null,\"method\":\"VT\",\"tools\":null,\"corrosion_position\":null}" >/dev/null

echo "[11/14] role guard check (engineer denied reviewer transition)"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/v1/mdr-cases/$MDR_ID/transition" \
  -H "Authorization: Bearer $ENGINEER_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"to_status":"In Review"}')
if [[ "$HTTP_CODE" != "403" ]]; then
  echo "Expected 403 for engineer transition, got $HTTP_CODE"
  exit 1
fi

echo "[12/14] role guard check (engineer denied admin create aircraft)"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/v1/aircraft" \
  -H "Authorization: Bearer $ENGINEER_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"an":"NOPE","serial_number":"NOPE"}')
if [[ "$HTTP_CODE" != "403" ]]; then
  echo "Expected 403 for engineer admin endpoint, got $HTTP_CODE"
  exit 1
fi

echo "[13/14] auth me"
curl -fsS "$BASE_URL/api/v1/auth/me" -H "Authorization: Bearer $ENGINEER_TOKEN" >/dev/null

echo "[14/14] logout"
curl -fsS -X POST "$BASE_URL/api/v1/auth/logout" -H "Authorization: Bearer $ENGINEER_TOKEN" >/dev/null

echo "Smoke API checks OK"
