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

ENGINEER_TOKEN=$(login engineer engineer)
REVIEWER_TOKEN=$(login reviewer reviewer)

echo "[1/8] health"
curl -fsS "$BASE_URL/health" >/dev/null

echo "[2/8] aircraft list (auth)"
curl -fsS "$BASE_URL/api/v1/aircraft" -H "Authorization: Bearer $ENGINEER_TOKEN" >/dev/null

echo "[3/8] panels list (auth)"
PANELS_JSON=$(curl -fsS "$BASE_URL/api/v1/panels" -H "Authorization: Bearer $ENGINEER_TOKEN")
PANEL_ID=$(printf '%s' "$PANELS_JSON" | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d[0]["id"] if d else "")')
if [[ -z "$PANEL_ID" ]]; then
  echo "No panels found; smoke halted"
  exit 1
fi

echo "[4/8] ordering tracker (panel $PANEL_ID)"
curl -fsS "$BASE_URL/api/v1/ordering-tracker?panel_id=$PANEL_ID" -H "Authorization: Bearer $ENGINEER_TOKEN" >/dev/null

echo "[5/8] create MDR case (engineer)"
MDR_ID=$(curl -fsS -X POST "$BASE_URL/api/v1/mdr-cases" \
  -H "Authorization: Bearer $ENGINEER_TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{\"panel_id\":$PANEL_ID,\"mdr_number\":\"SMOKE-MDR\",\"mdr_version\":\"A\",\"subject\":\"Smoke case\",\"status\":\"Request\",\"submitted_by\":\"ENG\",\"request_date\":null,\"need_date\":null,\"approved\":false}" \
  | python3 -c 'import json,sys; print(json.load(sys.stdin)["id"])')

echo "[6/8] transition MDR case (reviewer)"
curl -fsS -X POST "$BASE_URL/api/v1/mdr-cases/$MDR_ID/transition" \
  -H "Authorization: Bearer $REVIEWER_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"to_status":"Submit"}' >/dev/null

echo "[7/8] NDI dashboard (auth)"
curl -fsS "$BASE_URL/api/v1/ndi-dashboard?panel_id=$PANEL_ID" -H "Authorization: Bearer $ENGINEER_TOKEN" >/dev/null

echo "[8/8] role guard check (engineer denied on MDR transition)"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/v1/mdr-cases/$MDR_ID/transition" \
  -H "Authorization: Bearer $ENGINEER_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"to_status":"In Review"}')
if [[ "$HTTP_CODE" != "403" ]]; then
  echo "Expected 403 for engineer transition, got $HTTP_CODE"
  exit 1
fi

echo "Smoke API checks OK"
