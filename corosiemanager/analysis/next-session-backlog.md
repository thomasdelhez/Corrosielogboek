# Corrosiemanager — Next Session Backlog

Laatst bijgewerkt: 2026-03-08
Status: P1/P2/P3 baseline opgeleverd, nu focus op hardening en afronding.

## 1) Productie-validatie (eerst doen)

- [ ] Volledige handmatige smoke op draaiende omgeving (frontend + backend op target host)
- [ ] Verifiëren dat alle nieuwe menu-routes werken zonder stale cache
  - [ ] `/inspection`
  - [ ] `/trackers`
  - [ ] `/installation`
  - [ ] `/admin/aircraft-beheer`
  - [ ] `/reports/corrosion-tracker`
- [ ] Auth flow valideren:
  - [ ] login redirect/return URL
  - [ ] logout => direct naar `/login`
  - [ ] role guards (engineer/reviewer/admin)

## 2) Data/DB kwaliteit

- [ ] Import + verify script draaien op laatste Access-dump
- [ ] Diff-check van kern-tabellen t.o.v. Access (aantallen + steekproef records)
- [ ] Check op edge-cases in statusmapping:
  - [ ] inspection status varianten (spelling/casing)
  - [ ] queue-indeling voor inspection/NDI/order/installatie

## 3) UX polish (korte lijst)

- [ ] Consistente NL/EN labels op alle pagina’s (nu gemengd)
- [ ] Uniforme foutmeldingen (HTTP-detail + menselijk bericht)
- [ ] Bevestigings-/succesmeldingen centraliseren (nu verspreid per page)
- [ ] “Leeg”-states verbeteren met next action CTA

## 4) Rapportage & export afronden

- [ ] Extra filters toevoegen op rapportpagina:
  - [ ] datumrange
  - [ ] multi-status
- [ ] Export bestandsnamen met timestamp
- [ ] CSV kolomvolgorde afstemmen met operationeel team
- [ ] Optioneel: Excel export (XLSX) naast CSV

## 5) CI/CD hardening

- [ ] CI uitbreiden met:
  - [ ] backend lint/type checks
  - [ ] frontend test runner (indien tests toegevoegd)
- [ ] Smoke script integreren in release-gate
- [ ] Failures duidelijker maken in CI output (samenvattende stap)

## 6) Security & beheer

- [ ] Demo users vervangen door beheerde provisioning
- [ ] Sessie-expiry/refresh policy expliciet afdwingen
- [ ] Admin acties auditen in UI (zichtbaar change log)

## 7) Documentatie

- [ ] Korte gebruikershandleiding per hoofdmodule
- [ ] “Runbook productie” aanvullen met rollback-stappen
- [ ] README screenshots/flows updaten

## 8) Nice-to-have (na stabilisatie)

- [ ] Dashboard startpagina met KPI-kaarten
- [ ] Saved filters per user
- [ ] Bulk update acties voor geselecteerde holes

---

## Praktische startvolgorde voor volgende sessie

1. Productie-validatie + auth/route check
2. Data/DB kwaliteit checks
3. UX polish quick wins
4. Rapportage/export verbeteringen
5. CI/security/documentatie
