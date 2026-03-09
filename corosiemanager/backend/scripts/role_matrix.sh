#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-http://127.0.0.1:8003}"

login() {
  local user="$1"
  local pass="$2"
  curl -fsS -X POST "$BASE_URL/api/v1/auth/login" \
    -H 'Content-Type: application/json' \
    -d "{\"username\":\"$user\",\"password\":\"$pass\"}" \
  | python3 -c 'import sys,json; print(json.load(sys.stdin)["token"])'
}

assert_http() {
  local expected="$1"
  local code="$2"
  local label="$3"
  if [[ "$code" != "$expected" ]]; then
    echo "[FAIL] $label (expected $expected, got $code)"
    exit 1
  fi
  echo "[OK] $label"
}

json_get() {
  local expr="$1"
  python3 -c "import json,sys; d=json.load(sys.stdin); print($expr)"
}

ENGINEER_TOKEN=$(login engineer engineer)
REVIEWER_TOKEN=$(login reviewer reviewer)
ADMIN_TOKEN=$(login admin admin)

AIRCRAFT_ID=$(curl -fsS "$BASE_URL/api/v1/aircraft" -H "Authorization: Bearer $ENGINEER_TOKEN" | json_get 'd[0]["id"]')
PANEL_ID=$(curl -fsS "$BASE_URL/api/v1/panels?aircraft_id=$AIRCRAFT_ID" -H "Authorization: Bearer $ENGINEER_TOKEN" | json_get 'd[0]["id"]')

# ensure one hole
HOLE_ID=$(curl -fsS "$BASE_URL/api/v1/panels/$PANEL_ID/holes" -H "Authorization: Bearer $ENGINEER_TOKEN" | json_get 'd[0]["id"] if d else ""')
if [[ -z "$HOLE_ID" ]]; then
  HOLE_NR=$((700000 + RANDOM % 10000))
  HOLE_ID=$(curl -fsS -X POST "$BASE_URL/api/v1/panels/$PANEL_ID/holes" \
    -H "Authorization: Bearer $ENGINEER_TOKEN" \
    -H 'Content-Type: application/json' \
    -d "{\"hole_number\":$HOLE_NR,\"ndi_finished\":false,\"steps\":[],\"parts\":[]}" \
    | json_get 'd["id"]')
fi

# create mdr as engineer
MDR_ID=$(curl -fsS -X POST "$BASE_URL/api/v1/mdr-cases" \
  -H "Authorization: Bearer $ENGINEER_TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{\"panel_id\":$PANEL_ID,\"mdr_number\":\"RM-$RANDOM\",\"subject\":\"Role Matrix\",\"status\":\"Request\",\"submitted_by\":\"ENG\",\"request_date\":\"2026-03-09T00:00:00\",\"need_date\":\"2026-03-10T00:00:00\",\"approved\":false}" \
  | json_get 'd["id"]')

echo "[Role matrix]"
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/v1/mdr-cases" \
  -H "Authorization: Bearer $REVIEWER_TOKEN" -H 'Content-Type: application/json' \
  -d "{\"panel_id\":$PANEL_ID,\"status\":\"Draft\"}")
assert_http 403 "$CODE" "reviewer cannot create MDR"

CODE=$(curl -s -o /dev/null -w "%{http_code}" -X PUT "$BASE_URL/api/v1/holes/$HOLE_ID" \
  -H "Authorization: Bearer $REVIEWER_TOKEN" -H 'Content-Type: application/json' \
  -d '{"fit":"X"}')
assert_http 403 "$CODE" "reviewer cannot edit hole"

CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/v1/mdr-cases/$MDR_ID/transition" \
  -H "Authorization: Bearer $REVIEWER_TOKEN" -H 'Content-Type: application/json' \
  -d '{"to_status":"Submit"}')
assert_http 200 "$CODE" "reviewer can transition MDR"

CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/v1/mdr-cases/$MDR_ID/transition" \
  -H "Authorization: Bearer $ENGINEER_TOKEN" -H 'Content-Type: application/json' \
  -d '{"to_status":"In Review"}')
assert_http 403 "$CODE" "engineer cannot transition MDR"

CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/v1/users" \
  -H "Authorization: Bearer $ENGINEER_TOKEN" -H 'Content-Type: application/json' \
  -d '{"username":"x","password":"x","role":"engineer","is_active":true}')
assert_http 403 "$CODE" "engineer cannot create user"

TMP_USER="rm_user_$RANDOM"
TMP_PASS="temp1234"
TMP_ID=$(curl -fsS -X POST "$BASE_URL/api/v1/users" \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H 'Content-Type: application/json' \
  -d "{\"username\":\"$TMP_USER\",\"password\":\"$TMP_PASS\",\"role\":\"engineer\",\"is_active\":true}" \
  | json_get 'd["id"]')
echo "[OK] admin can create user"

CODE=$(curl -s -o /dev/null -w "%{http_code}" -X PUT "$BASE_URL/api/v1/users/$TMP_ID/role" \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H 'Content-Type: application/json' \
  -d '{"role":"reviewer"}')
assert_http 200 "$CODE" "admin can update role"

CODE=$(curl -s -o /dev/null -w "%{http_code}" -X PUT "$BASE_URL/api/v1/users/$TMP_ID/active" \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H 'Content-Type: application/json' \
  -d '{"is_active":false}')
assert_http 200 "$CODE" "admin can deactivate user"

CODE=$(curl -s -o /dev/null -w "%{http_code}" -X PUT "$BASE_URL/api/v1/users/$TMP_ID/active" \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H 'Content-Type: application/json' \
  -d '{"is_active":true}')
assert_http 200 "$CODE" "admin can reactivate user"

CODE=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$BASE_URL/api/v1/users/$TMP_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
assert_http 200 "$CODE" "admin can delete user"

echo "[Safeguards]"
ADMIN_ID=$(curl -fsS "$BASE_URL/api/v1/users" -H "Authorization: Bearer $ADMIN_TOKEN" | python3 -c 'import sys,json; d=json.load(sys.stdin); print([u["id"] for u in d if u["username"]=="admin"][0])')

CODE=$(curl -s -o /dev/null -w "%{http_code}" -X PUT "$BASE_URL/api/v1/users/$ADMIN_ID/active" \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H 'Content-Type: application/json' \
  -d '{"is_active":false}')
assert_http 400 "$CODE" "admin cannot deactivate self"

CODE=$(curl -s -o /dev/null -w "%{http_code}" -X PUT "$BASE_URL/api/v1/users/$ADMIN_ID/role" \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H 'Content-Type: application/json' \
  -d '{"role":"engineer"}')
assert_http 400 "$CODE" "admin cannot change own role"

CODE=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$BASE_URL/api/v1/users/$ADMIN_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
assert_http 400 "$CODE" "admin cannot delete self"

echo "[Audit filters]"
CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/v1/users/audit-events?action=set_active&limit=5" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
assert_http 200 "$CODE" "audit filter endpoint works"

echo "Role matrix checks OK"
