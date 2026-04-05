# Stats — Table groupée par chantier avec donuts

**Date:** 2026-04-05
**Scope:** `app/(dashboard)/stats/` + `components/stats/`

---

## Objectif

Restructurer la page `/stats` pour que :
1. Les données soient groupées par chantier (une ligne de tête par chantier + sous-lignes par matériau) au lieu d'une ligne plate par combinaison chantier×matériau.
2. Chaque ligne chantier affiche un donut 2 slices (consommé vs restant) pour visualiser l'avancement global.
3. Le bouton "+ Conso." passe au niveau chantier et ouvre un dialog avec un picker matériau.

---

## Structure de la table

### Ligne chantier (group header)

Fond bleu clair (`bg-blue-50`), colonnes :

| Colonne | Contenu |
|---|---|
| Chantier / Matériau | Donut + nom du chantier + légende (X consommés / Y restants) |
| Alloué | Total alloué sur tous les matériaux du chantier (affiché en gris, taille réduite) |
| Transporté | `—` (non pertinent au niveau chantier) |
| Consommé | Somme des consommés de tous les matériaux, en gras |
| Restant | Somme des restants |
| Progression | Barre globale (consommé total / alloué total) |
| Projection | Badge sur la valeur de projection la plus critique parmi les matériaux |
| Action | Bouton `＋ Conso.` |

### Sous-ligne matériau

Indentation gauche (`pl-7`), même colonnes, sans bouton action.

### Colonnes de la table

```
Chantier / Matériau | Alloué | Transporté | Consommé | Restant | Progression | Projection | [action]
```

---

## Donut

- **2 slices** : consommé (couleur) + restant (gris `#e2e8f0`)
- Pourcentage affiché au centre
- Couleur de la slice consommé :
  - `#10b981` (vert) si pct < 70%
  - `#f59e0b` (orange) si 70% ≤ pct < 90%
  - `#ef4444` (rouge) si pct ≥ 90%
- Si aucune allocation définie pour ce chantier : donut gris uni, pas de pourcentage
- Implémentation : SVG inline avec `stroke-dasharray` (pas de lib externe)
- Taille : 32×32 px

---

## Dialog "+ Conso." au niveau chantier

Remplace le bouton individuel par matériau. Déclenché depuis la ligne chantier.

**Champs du dialog :**
1. **Matériau** — `<Select>` peuplé des matériaux présents dans les sous-lignes de ce chantier
2. **Quantité** — champ numérique, unité affichée dynamiquement selon le matériau sélectionné
3. **Date** — date picker, défaut = aujourd'hui

**Comportement :**
- Réutilise le Server Action existant `lib/actions/stats.ts`
- À la soumission, ferme le dialog et revalide la page (via `revalidatePath`)

**Implémentation :** Modifier `ConsommationForm` pour accepter une prop optionnelle `materiaux: { id, designation, unit }[]`. Si fournie, afficher le picker matériau et rendre `materiauId`/`unit` dynamiques. L'ancien usage (matériau fixe depuis la sous-ligne) devient obsolète et sera supprimé.

---

## Calculs de la ligne chantier

Calculés côté client dans `StatsTable` à partir du `StatsRow[]` groupé :

```ts
// Grouper par chantierId
const groups = Map<chantierId, StatsRow[]>

// Pour chaque groupe :
const totalAlloue = rows.reduce(...) // null si aucun row n'a d'allocation
const totalConsomme = rows.reduce(...)
const totalRestant = totalAlloue !== null ? totalAlloue - totalConsomme : null
const pct = totalAlloue ? totalConsomme / totalAlloue * 100 : null

// Projection la plus critique = valeur projectionSemaines la plus basse parmi les rows
const worstProjection = rows
  .map(r => r.projectionSemaines)
  .filter(v => v !== null)
  .reduce((min, v) => Math.min(min, v), Infinity)
```

---

## Fichiers modifiés

| Fichier | Changement |
|---|---|
| `components/stats/stats-table.tsx` | Refactoring principal : groupement, ligne chantier, donut SVG inline |
| `components/stats/consommation-form.tsx` | Ajout prop `materiaux[]` optionnelle + picker matériau dynamique |
| `app/(dashboard)/stats/page.tsx` | Aucun changement (données déjà structurées en `StatsRow[]`) |
| `lib/types.ts` | Aucun changement |

---

## Ce qui NE change pas

- La logique de fetching et de calcul dans `page.tsx` — données inchangées
- `StatsFilters` — inchangé
- `AllocationCell` — reste dans les sous-lignes matériau
- Le Server Action de consommation — inchangé
- La structure `StatsRow` — inchangée

---

## Hors scope

- Graphiques globaux (histogramme temporel, vue synthèse) — non demandé
- Pagination ou virtualisation — non demandé
- Export CSV/PDF — non demandé
