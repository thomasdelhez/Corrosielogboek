# lyl-tool

Los, offline tooltje om `.lyl` bestanden te genereren uit een namenlijst.

## Gebruik

```bash
cd ~/\.openclaw/workspace/lyl-tool
python3 lyl_generator.py --names "LM06, VM LM06, LM07, VM LM07" --output mijn_show
```

Dit maakt: `mijn_show.lyl`

Of via inputbestand:

```bash
python3 lyl_generator.py --input names.txt --output output.lyl
```

## Dubbelklik op macOS

Je kunt ook `run_lyl_generator.command` dubbelklikken in Finder.
Die vraagt je dan om:
- namen (comma-separated)
- bestandsnaam

en maakt daarna automatisch het `.lyl` bestand.
