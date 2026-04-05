@AGENTS.md

# Camio — Contexte projet

Application Next.js 16 (App Router, React 19) de gestion des listes de chargement BTP.

## Modèles Prisma

- `User` — email / passwordHash / role (BUREAU | ADMIN)
- `Chantier` — nom / adresse / actif
- `Chauffeur` — nom / téléphone / actif
- `Materiau` — désignation / unité par défaut / actif
- `CompanySettings` — singleton : nom / logo / adresse / téléphone
- `LoadingList` + `LoadingListItem` — liste de chargement et ses lignes
- `Allocation` — budget matière par chantier/matériau (unique par couple)
- `ConsommationEntry` — entrée de consommation par chantier/matériau

## Conventions importantes

- **proxy.ts** à la racine (pas `middleware.ts`) — Next.js 16, runtime Node.js
- Toutes les APIs request sont **async** : `await cookies()`, `await headers()`, `await params`
- Server Actions dans `lib/actions/` — pas de Route Handlers pour les mutations
- Composants Server par défaut, `'use client'` seulement si nécessaire
- shadcn/ui + Tailwind CSS v4 — ne pas construire de contrôles depuis du HTML brut
- **Tables responsives** : toujours envelopper `<table>` dans `<div className="overflow-x-auto">` et ajouter `min-w-[...]` sur la table pour garantir le scroll horizontal sur mobile/tablette
- Prisma 7 via `lib/prisma.ts`
- Auth via `lib/auth.ts` (NextAuth v5)

## Structure des pages (dashboard)

```
app/(dashboard)/
  lists/new/        — création liste
  lists/[id]/       — édition liste
  lists/[id]/print/ — impression 3 documents
  history/          — historique
  catalogue/        — référentiels
  settings/         — paramètres + users
  stats/            — statistiques consommation
app/check/[token]/  — checklist mobile (public)
```

## Module Stats

- `Allocation` : budget alloué par chantier × matériau, éditable en ligne via `AllocationCell`
- `ConsommationEntry` : saisie via `ConsommationForm` (dialog)
- `StatsTable` : affiche consommé / alloué / % / projection avec badges
- `StatsFilters` : filtres chantier et matériau
- Server Actions dans `lib/actions/stats.ts`
