#!/bin/zsh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "=== LYL Generator ==="
echo ""
read "NAMES?Geef namen (comma-separated): "
read "OUTNAME?Bestandsnaam (zonder of met .lyl): "

if [[ -z "${NAMES// }" ]]; then
  echo "❌ Geen namen ingevoerd."
  read "_?Druk op Enter om af te sluiten..."
  exit 1
fi

if [[ -z "${OUTNAME// }" ]]; then
  echo "❌ Geen bestandsnaam ingevoerd."
  read "_?Druk op Enter om af te sluiten..."
  exit 1
fi

python3 "$SCRIPT_DIR/lyl_generator.py" --names "$NAMES" --output "$OUTNAME"

echo ""
echo "✅ Klaar. Bestand staat in: $SCRIPT_DIR"
read "_?Druk op Enter om af te sluiten..."
