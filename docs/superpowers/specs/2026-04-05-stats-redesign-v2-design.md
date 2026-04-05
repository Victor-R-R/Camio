# Stats — Refonte v2 : matériaux + calendrier côte à côte

**Date:** 2026-04-05
**Scope:** `app/(dashboard)/stats/` + `components/stats/` + `lib/types.ts`

---

## Objectif

Remplacer la table groupée par chantier par une vue centrée sur les **matériaux** :
- 4 cartes KPI en haut
- Colonne gauche : cartes par matériau (donut SVG, transporté, barre de progression, badge projection)
- Colonne droite : panneau calendrier sticky avec toggle **Mois / Année**
- Filtres chantier + matériau conservés, filtre période supprimé
- Bouton "+ Conso." sur chaque carte matériau

---

## Nouveau types (`lib/types.ts`)

```ts
export type MateriauStats = {
  materiauId: string;
  materiauDesignation: string;
  unit: string;
  alloue: number | null;           // somme des allocations (null si aucune)
  transporte: number;              // somme DELIVERED LoadingListItem
  consomme: number;                // somme de toutes les ConsommationEntry (sans filtre période)
  restant: number | null;          // alloue - consomme, null si pas d'allocation
  projectionSemaines: number | null; // pire projection parmi les chantiers (min non-null)
  chantierCount: number;           // nb de chantiers concernés
  color: string;                   // couleur palette assignée
};

export type CalendarEntry = {
  date: string;            // "YYYY-MM-DD"
  materiauId: string;
  materiauDesignation: string;
  chantierId: string;
  chantierName: string;
  quantity: number;
  unit: string;
  source: "Manuel" | "Bon"; // ConsommationEntry = Manuel, LoadingListItem livré = Bon
};

export type KpiData = {
  listsCreated: number;
  listsDelivered: number;
  criticalCount: number;     // matériaux avec pct >= 90%
  trackedCount: number;      // matériaux avec au moins une allocation
};
```

---

## Palette couleurs

```ts
// Dans page.tsx, assignée par ordre d'apparition (index % PALETTE.length)
const PALETTE = ["#f59e0b", "#ef4444", "#10b981", "#8b5cf6", "#3b82f6", "#ec4899"];
```

Chaque `MateriauStats.color` et `CalendarEntry` partagent la même couleur par `materiauId`.

---

## Calculs `page.tsx`

### `MateriauStats[]`

**Tous les matériaux actifs** sont inclus, même ceux sans aucune donnée. Cela garantit qu'un nouveau matériau créé dans `/catalogue` apparaît immédiatement dans `/stats`.

```ts
// 1. Initialiser depuis tous les matériaux actifs (ordre alphabétique = ordre palette stable)
const matMap = new Map<string, MateriauStats>();
for (const mat of materiaux) {
  matMap.set(mat.id, {
    materiauId: mat.id,
    materiauDesignation: mat.designation,
    unit: mat.defaultUnit,
    alloue: null,
    transporte: 0,
    consomme: 0,
    restant: null,
    projectionSemaines: null,
    chantierCount: 0,
    color: PALETTE[matMap.size % PALETTE.length],
  });
}

// 2. Agréger les statsRows
for (const row of statsRows) {
  const m = matMap.get(row.materiauId);
  if (!m) continue; // matériau inactif filtré
  m.transporte += row.transporte;
  m.consomme += row.consomme;
  m.chantierCount += 1;
  if (row.alloue !== null) m.alloue = (m.alloue ?? 0) + row.alloue;
  // worst projection = min non-null
  if (row.projectionSemaines !== null) {
    if (m.projectionSemaines === null) m.projectionSemaines = row.projectionSemaines;
    else m.projectionSemaines = Math.min(m.projectionSemaines, row.projectionSemaines);
  }
}

// 3. Calculer restant
for (const m of matMap.values()) {
  m.restant = m.alloue !== null ? m.alloue - m.consomme : null;
}
const materiauStats = [...matMap.values()];
```

Note : les `StatsRow.consomme` sont now **all-time** (sans filtre `dateFrom`, voir ci-dessous).

### Suppression du filtre `periode`

Retirer le paramètre `periode` de `searchParams` et supprimer le calcul de `dateFrom`. Le filtre période dans `StatsFilters` est supprimé. La projection continue d'utiliser la cadence 4 semaines (inchangé).

### `CalendarEntry[]`

```ts
const colorMap = new Map(materiauStats.map(m => [m.materiauId, m.color]));

const calendarEntries: CalendarEntry[] = [
  // ConsommationEntry → Manuel
  ...allConsommations.map(c => ({
    date: c.date.toISOString().split("T")[0],
    materiauId: c.materiauId,
    materiauDesignation: c.materiau.designation,
    chantierId: c.chantierId,
    chantierName: c.chantier.name,
    quantity: c.quantity,
    unit: c.unit,
    source: "Manuel" as const,
  })),
  // LoadingListItem DELIVERED → Bon
  ...transportedItems
    .filter(item => item.materiauId && item.materiau)
    .map(item => ({
      date: item.list.date.toISOString().split("T")[0],
      materiauId: item.materiauId!,
      materiauDesignation: item.materiau!.designation,
      chantierId: item.list.chantierId,
      chantierName: item.list.chantier.name,
      quantity: item.quantity,
      unit: item.unit,
      source: "Bon" as const,
    })),
];
```

### `KpiData`

```ts
const [listsCreated, listsDelivered] = await Promise.all([
  prisma.loadingList.count({ where: { ...(chantierId ? { chantierId } : {}) } }),
  prisma.loadingList.count({ where: { status: ListStatus.DELIVERED, ...(chantierId ? { chantierId } : {}) } }),
]);
const criticalCount = materiauStats.filter(m => {
  if (!m.alloue || m.alloue === 0) return false;
  return (m.consomme / m.alloue) * 100 >= 90;
}).length;
const trackedCount = materiauStats.filter(m => m.alloue !== null).length;
const kpi: KpiData = { listsCreated, listsDelivered, criticalCount, trackedCount };
```

---

## Composants

### `components/stats/kpi-cards.tsx` — **nouveau**

Composant Server (ou client simple, sans état). Props :

```ts
type Props = {
  listsCreated: number;
  listsDelivered: number;
  criticalCount: number;
  trackedCount: number;
};
```

4 cartes en grille 4 colonnes (`grid-cols-2 sm:grid-cols-4`) :

| KPI | Valeur | Sous-texte |
|---|---|---|
| 📋 Listes créées | `listsCreated` | — |
| ✅ Listes livrées | `listsDelivered` | — |
| ⚠️ Matériaux critiques | `criticalCount` | `budget >90%` |
| 📦 Matériaux suivis | `trackedCount` | `avec allocation` |

Note : "Transporté total" non affiché en KPI car les unités sont hétérogènes (T, m³, U…).

---

### `components/stats/material-card-list.tsx` — **nouveau**

Client Component. Gère l'état dialog "+ Conso."

Props :
```ts
type Props = {
  materiauStats: MateriauStats[];
  chantiers: { id: string; name: string }[];
  materiaux: { id: string; designation: string; unit: string }[];
};
```

Structure d'une carte matériau :
- Bordure gauche colorée (`border-l-4`, `m.color`)
- Header : nom matériau + badge unité
- Body : donut SVG 48×48 (côté gauche) + stats (côté droit)
  - Alloué : `m.alloue ?? "—"`
  - 🚛 Transporté : `m.transporte`
  - Consommé : `m.consomme`
  - Restant : `m.restant ?? "—"` (en rouge si `m.restant < m.alloue * 0.1`)
- Barre de progression pleine largeur
- Footer : badge projection + nb chantiers + bouton "+ Conso."

**Donut SVG** (r=13, strokeWidth=5.5, circumference=81.68) :
- Gris uni si `m.alloue === null`
- Couleur selon pct : <70% vert `#10b981`, 70–90% orange `#f59e0b`, ≥90% rouge `#ef4444`
- Texte centré : pourcentage si allocation, `—` sinon

**Bouton "+ Conso."** : ouvre `ConsommationForm` avec `defaultMateriauId = m.materiauId`, liste tous les chantiers disponibles.

**State** :
```ts
const [formMat, setFormMat] = useState<{ materiauId: string } | null>(null);
```
Un seul dialog rendu conditionnellement (`{formMat && <ConsommationForm ... />}`).

---

### `components/stats/calendar-panel.tsx` — **nouveau**

Client Component. Props :
```ts
type Props = {
  entries: CalendarEntry[];
  colorMap: Record<string, string>; // materiauId → color
};
```

**État interne :**
```ts
const [view, setView] = useState<"mois" | "annee">("annee");
const [month, setMonth] = useState(() => new Date().getMonth()); // 0-11
const [year, setYear] = useState(() => new Date().getFullYear());
const [selectedDate, setSelectedDate] = useState<string | null>(null);
```

**Vue Année** (toggle "Année" actif) :
- 12 barres verticales côte à côte, hauteur proportionnelle
- Chaque barre = stack de colonnes colorées par matériau
- Cliquer un mois → bascule en vue Mois + navigue au mois cliqué
- Légende matériaux en dessous

**Vue Mois** (toggle "Mois" actif ou après clic sur un mois) :
- Navigation ‹ › pour changer de mois
- Grille 7 colonnes (L M M J V S D)
- Jours avec données : `bg-blue-100 text-blue-700 font-bold cursor-pointer`
- Aujourd'hui : cercle plein `bg-blue-700 text-white`
- Cliquer un jour → sélectionne la date, affiche les entrées du jour en dessous

**Détail jour** (sous le calendrier) :
- Liste des `entries` filtrées par `selectedDate`
- Par entrée : dot coloré + "Matériau — Chantier" + quantité + badge "Bon" ou "Manuel"

**Calcul annuel** :
```ts
// group by (year, month, materiauId)
type MonthBar = { month: number; stacks: { materiauId: string; total: number; color: string }[] }
```
Hauteur de chaque stack = `(total / maxMonthTotal) * 72` (px), min 2px.

---

### `components/stats/consommation-form.tsx` — **modifié**

Remplacer la prop `chantierId` / `chantierName` fixe par des pickers dynamiques :

```ts
type ChantierOption = { id: string; name: string };
type MateriauOption = { id: string; designation: string; unit: string };

type Props = {
  chantiers: ChantierOption[];
  defaultChantierId?: string;
  materiaux: MateriauOption[];
  defaultMateriauId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};
```

Champs du dialog (dans l'ordre) :
1. **Chantier** — `<Select>`, pré-sélectionné sur `defaultChantierId ?? chantiers[0].id`
2. **Matériau** — `<Select>`, pré-sélectionné sur `defaultMateriauId ?? materiaux[0].id`
3. **Quantité** — `<Input type="number">`, unité affichée dynamiquement
4. **Date** — `<Input type="date">`, défaut = aujourd'hui
5. **Notes** — `<Input>`, optionnel

Submit désactivé si `!selectedChantierId || !selectedMateriauId`.

---

### `components/stats/stats-filters.tsx` — **modifié**

Retirer la `<Select>` "Période" et la prop `periode` / `current.periode`. Conserver uniquement chantier + matériau.

---

### `components/stats/stats-table.tsx` — **supprimé**

Le fichier est entièrement remplacé par les nouveaux composants. Supprimer l'import dans `page.tsx`.

### `components/stats/allocation-cell.tsx` — **non modifié**

Conservé dans le codebase mais plus rendu sur la page stats. Non supprimé (peut servir ailleurs).

---

## `app/(dashboard)/stats/page.tsx` — modifications

1. Ajouter deux `prisma.loadingList.count()` dans le `Promise.all`
2. Retirer `periode` de `searchParams` et `dateFrom` (filtre supprimé)
3. Retirer l'import `StatsTable`
4. Ajouter la palette et le calcul `MateriauStats[]`
5. Ajouter le calcul `CalendarEntry[]`
6. Ajouter le calcul `KpiData`
7. Construire `colorMap: Record<string, string>` depuis `materiauStats`
8. Rendre :

```tsx
return (
  <div className="space-y-4">
    <h1 className="text-2xl font-bold text-[#3D4A5C]">Statistiques</h1>
    <StatsFilters chantiers={chantiers} materiaux={materiaux} current={{ chantierId, materiauId }} />
    <KpiCards listsCreated={listsCreated} listsDelivered={listsDelivered}
              criticalCount={kpi.criticalCount} trackedCount={kpi.trackedCount} />
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 items-start">
      <MaterialCardList
        materiauStats={materiauStats}
        chantiers={chantiers}
        materiaux={materiaux}
      />
      <CalendarPanel entries={calendarEntries} colorMap={colorMap} />
    </div>
  </div>
);
```

---

## Ce qui NE change pas

- `lib/actions/stats.ts` — Server Actions inchangés
- `lib/prisma.ts`, `lib/auth.ts`
- `app/(dashboard)/stats/loading.tsx`
- Toute la logique de projection 4 semaines dans `page.tsx`
- `AllocationCell` (conservé, inutilisé sur la page)

---

## Hors scope

- Édition d'allocation depuis les nouvelles cartes matériau
- Suppression d'entrées de consommation depuis le calendrier
- Export CSV/PDF
- Pagination

---

## Fichiers modifiés / créés / supprimés

| Fichier | Action |
|---|---|
| `lib/types.ts` | Ajouter `MateriauStats`, `CalendarEntry`, `KpiData` |
| `app/(dashboard)/stats/page.tsx` | Refactoring : nouveaux calculs, nouveaux composants, suppr. periode |
| `components/stats/stats-filters.tsx` | Retirer filtre période |
| `components/stats/stats-table.tsx` | **Supprimer** |
| `components/stats/consommation-form.tsx` | Remplacer props fixes par pickers chantier+matériau |
| `components/stats/kpi-cards.tsx` | **Créer** |
| `components/stats/material-card-list.tsx` | **Créer** |
| `components/stats/calendar-panel.tsx` | **Créer** |
