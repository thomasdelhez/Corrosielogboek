# Access → Corrosiemanager Gap Analyse & Prioriteiten

## Huidige dekking (al gedaan)
- Core data migratie: Aircraft/Panel/Hole/Steps/Parts
- Basis edit flow in UI
- MDR status cases (basis)
- NDI report basis
- MDRListT basisweergave

## Openstaande functionele gap

### MUST (Sprint 1-2)
1. **MDR workflow parity (essentieel)**
   - status lifecycle afdwingen
   - remarks versie-achtig gedrag (V1..V5 semantics)
   - panel/hole koppeling explicieter in UI

2. **Data quality rules uit Access forms**
   - verplichte velden per status
   - conditional validation (bijv. NDI finished)
   - dropdown validaties uit lookup-tabellen

3. **Engineer productivity**
   - betere filter/search (panel + status + defect + mdr)
   - sortering + pagination op grotere datasets

### SHOULD (Sprint 3-4)
4. **MDR Request Detail volledig maken**
   - extra velden uit MDRListT tonen (nu subset)
   - edit/aanmaakflow met input model

5. **Autorisatie en rollen**
   - engineer/reviewer/admin beperkingen
   - audit trail (wie wijzigde wat/wanneer)

6. **Rapport/export**
   - CSV/PDF overzichten voor engineer/review

### LATER
7. **Attachments/document links**
8. **Geavanceerde dashboards/KPI’s**
9. **Notificaties / reminders**

## Technische gap
- Alembic/DB migrations ontbreken nog (nu create_all)
- E2E tests ontbreken
- Consistente error mapping ontbreekt nog
- Deployment scripts (docker/proxy) moeten nog productieklaar

## Aanbevolen aanpak
1. Eerst MUST afronden tot “daily usable for engineers”.
2. Daarna SHOULD voor review/kwaliteit.
3. LATER pas na gebruiksfeedback.
