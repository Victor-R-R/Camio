# Spec — Page `/stats` : Statistiques de consommation & prévisions

**Date**: 2026-04-05
**Statut**: Approuvé

---

## Contexte

Camio est un système de gestion de bons de transport pour chantiers de construction. Les matériaux sont transportés depuis un dépôt vers des chantiers, tracés via des `LoadingList` et leurs `LoadingListItem`. La page `/stats` ajoute une couche d'analyse : combien a-t-on alloué, transporté, consommé par chantier/matériau, et combien reste-t-il à commander ?

---

## Objectif

Permettre aux utilisateurs de :
1. Visualiser la consommation de matériaux par chantier et par matériau
2. Comparer transport (bons livrés) vs consommation réelle sur chantier
3. Gérer les allocations (quantité initiale commandée/allouée par chantier × matériau)
4. Saisir des entrées de consommation chantier directement depuis la page
5. Obtenir une projection de stock restant basée sur la cadence hebdomadaire

---

## Nouveaux modèles de données

### `Allocation`
Une seule allocation par paire (chantier × matériau). Modifiable via upsert.

```prisma
model Allocation {
  id         String   @id @default(cuid())
  chantierId String
  chantier   Chantier @relation(fields: [chantierId], references: [id])
  materiauId String
  materiau   Materiau @relation(fields: [materiauId], references: [id])
  quantity   Float
  unit       Unit
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@unique([chantierId, materiauId])
}
```

### `ConsommationEntry`
Journal des consommations saisies manuellement depuis le chantier.

```prisma
model ConsommationEntry {
  id         String   @id @default(cuid())
  chantierId String
  chantier   Chantier @relation(fields: [chantierId], references: [id])
  materiauId String
  materiau   Materiau @relation(fields: [materiauId], references: [id])
  quantity   Float
  unit       Unit
  date       DateTime @default(now())
  notes      String?
  createdAt  DateTime @default(now())
}
```

---

## Structure de la page `/stats`

### Zone 1 — Filtres globaux
- Dropdown **Chantier** (valeurs: "Tous les chantiers" + liste active)
- Dropdown **Matériau** (valeurs: "Tous les matériaux" + liste active)
- Sélecteur **Période** : Ce mois / 3 mois / 6 mois / Tout

### Zone 2 — Tableau récapitulatif

Une ligne par paire (chantier × matériau) présente dans les données (allocation OU transport OU consommation).

| Colonne | Source | Détail |
|---------|--------|--------|
| Chantier | `Chantier.name` | |
| Matériau | `Materiau.designation` | |
| Alloué | `Allocation.quantity` | Éditable inline (clic → input) |
| Transporté | `SUM(LoadingListItem.quantity)` | Bons avec `status = DELIVERED` uniquement |
| Consommé | `SUM(ConsommationEntry.quantity)` | Filtré par période |
| Restant | `Alloué − Consommé` | `—` si pas d'allocation |
| Projection | `Restant ÷ cadence_hebdo` | Exprimée en semaines |
| Actions | Bouton `+ Consommation` | Ouvre modal de saisie |

**Barre de progression** (Consommé / Alloué) :
- 🟢 Vert : < 70%
- 🟠 Orange : 70–90%
- 🔴 Rouge : > 90% ou dépassé

**Badges projection** :
- `⚠ Urgent` (rouge) : projection < 2 semaines
- `⚠ Dépassé` (rouge) : Restant ≤ 0
- `∞` : cadence = 0 (pas de consommation récente)

### Zone 3 — Modal saisie consommation
Déclenchée par `+ Consommation` sur une ligne.
Champs : Quantité, Unité (pré-remplie), Date (aujourd'hui par défaut), Notes (optionnel).
Soumission via Server Action → `revalidatePath('/stats')`.

---

## Logique métier

### Calcul Transporté
```
SUM(LoadingListItem.quantity)
  WHERE LoadingList.chantierId = X
    AND LoadingListItem.materiauId = Y
    AND LoadingList.status = 'DELIVERED'
    AND LoadingList.date >= [filtre période]
```

### Calcul Consommé
```
SUM(ConsommationEntry.quantity)
  WHERE chantierId = X
    AND materiauId = Y
    AND date >= [filtre période]
```

### Calcul Projection
```
cadence_hebdo = SUM(consommation sur 4 dernières semaines) / 4
projection_semaines = Restant / cadence_hebdo
```

---

## Architecture technique

### Fichiers à créer

```
prisma/schema.prisma                   ← +Allocation, +ConsommationEntry + relations inverses
prisma/migrations/<timestamp>_stats/   ← migration générée automatiquement

app/(dashboard)/stats/
  page.tsx                             ← Server Component, charge données + calculs
  loading.tsx                          ← Skeleton UI

lib/actions/stats.ts                   ← upsertAllocation(), createConsommationEntry(), deleteConsommationEntry()

components/stats/
  stats-filters.tsx                    ← Client Component (filtres avec useRouter/searchParams)
  stats-table.tsx                      ← Client Component (tableau avec données pré-calculées)
  allocation-cell.tsx                  ← Inline edit allocation (click-to-edit)
  consommation-form.tsx                ← Modal saisie consommation (Dialog shadcn)
```

### Fichiers à modifier

```
app/(dashboard)/layout.tsx             ← Ajouter lien "Stats" dans la sidebar
prisma/schema.prisma                   ← Ajouter les 2 nouveaux modèles + relations inverses sur Chantier et Materiau
```

### Flux de données
```
page.tsx (Server Component)
  ↓ prisma.allocation.findMany({ include: { chantier, materiau } })
  ↓ prisma.consommationEntry.findMany({ where: { date >= période } })
  ↓ prisma.loadingListItem.findMany({ where: { list.status = DELIVERED } })
  → calcule métriques côté serveur (Map par chantierId+materiauId)
  → passe statsRows[] au <StatsTable> (Client Component)
```

Les filtres (chantier, matériau, période) passent via **searchParams** de l'URL, lus dans le Server Component pour filtrer les requêtes Prisma.

---

## Hors-périmètre (v1)

- Graphiques de progression temporelle (courbes, histogrammes)
- Export CSV/Excel
- Notifications automatiques de réapprovisionnement
- Import en masse des allocations
