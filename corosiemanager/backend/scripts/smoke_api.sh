#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-http://127.0.0.1:8002}"

echo "[1/6] health"
curl -fsS "$BASE_URL/health" >/dev/null

echo "[2/6] aircraft list"
curl -fsS "$BASE_URL/api/v1/aircraft" >/dev/null

echo "[3/6] panels list"
PANELS_JSON=$(curl -fsS "$BASE_URL/api/v1/panels")
PANEL_ID=$(printf '%s' "$PANELS_JSON" | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d[0]["id"] if d else "")')
if [[ -z "$PANEL_ID" ]]; then
  echo "No panels found; smoke halted"
  exit 1
fi

echo "[4/6] holes list for panel $PANEL_ID"
HOLES_JSON=$(curl -fsS "$BASE_URL/api/v1/panels/$PANEL_ID/holes")
HOLE_ID=$(printf '%s' "$HOLES_JSON" | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d[0]["id"] if d else "")')
if [[ -z "$HOLE_ID" ]]; then
  echo "No holes found for panel $PANEL_ID; smoke halted"
  exit 1
fi

echo "[5/6] hole detail $HOLE_ID"
curl -fsS "$BASE_URL/api/v1/holes/$HOLE_ID" >/dev/null

echo "[6/6] ndi list for hole $HOLE_ID"
curl -fsS "$BASE_URL/api/v1/holes/$HOLE_ID/ndi-reports" >/dev/null

echo "Smoke API checks OK ✅"
