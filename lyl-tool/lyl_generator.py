#!/usr/bin/env python3
"""
Offline .lyl generator (standalone project).

Voorbeeld:
  python3 lyl_generator.py \
    --names "LM06, VM LM06, LM07, VM LM07, LM08, VM LM08" \
    --output showbestand

Of via bestand:
  python3 lyl_generator.py --input names.txt --output output.lyl
"""

from __future__ import annotations

import argparse
from pathlib import Path
from xml.sax.saxutils import escape


def parse_names(raw: str) -> list[str]:
    return [n.strip() for n in raw.replace("\n", ",").split(",") if n.strip()]


def render_lyl(names: list[str]) -> str:
    lines: list[str] = ["<lys>"]
    for name in names:
        safe_name = escape(name)
        lines.extend(
            [
                "  <ly>",
                f"    <ln>{safe_name}</ln>",
                "    <cr>Rood</cr>",
                "    <lt>Continuous</lt>",
                "    <lw>By Default</lw>",
                "    <at></at>",
                "    <va>aan</va>",
                "  </ly>",
            ]
        )
    lines.append("</lys>")
    return "\n".join(lines) + "\n"


def ensure_lyl_extension(path: Path) -> Path:
    return path if path.suffix.lower() == ".lyl" else path.with_suffix(".lyl")


def main() -> int:
    parser = argparse.ArgumentParser(description="Genereer .lyl op basis van namenlijst")
    source = parser.add_mutually_exclusive_group(required=True)
    source.add_argument("--names", help="Comma-separated namen")
    source.add_argument("--input", type=Path, help="Pad naar tekstbestand met namen (comma of newline)")
    parser.add_argument("--output", type=Path, required=True, help="Bestandsnaam voor output (.lyl)")

    args = parser.parse_args()

    if args.names:
        names = parse_names(args.names)
    else:
        names = parse_names(args.input.read_text(encoding="utf-8"))

    if not names:
        raise SystemExit("Geen namen gevonden. Geef minstens 1 naam op.")

    output_path = ensure_lyl_extension(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(render_lyl(names), encoding="utf-8")

    print(f"✅ Gemaakt: {output_path}")
    print(f"   Entries: {len(names)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
