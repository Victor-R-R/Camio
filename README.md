# Camio

Application web interne de gestion des listes de chargement pour entreprises du BTP.

Camio permet au bureau de préparer les chargements, de générer 3 documents imprimables, et au chauffeur de pointer les articles depuis son téléphone via un lien de partage. Elle intègre également un module de suivi de consommation et de prévision par chantier.

---

## Fonctionnalités

### Listes de chargement
- Création et édition d'une liste : chantier, chauffeur, date, heure de départ, responsable, notes
- Ajout d'articles (matériaux) avec quantité, unité et tri par glisser-déposer (dnd-kit)
- Recherche dans le catalogue de matériaux pour pré-remplir les lignes
- Statuts progressifs : **Brouillon → Générée → Chargée → Livrée**
- Duplication d'une liste existante depuis l'historique

### Génération de documents (impression PDF)
En un clic, 3 documents sont générés et imprimables :

| Document | Usage | Couleur |
|---|---|---|
| **Bon de Transport** | Remis au chauffeur, liste les articles à livrer | Orange |
| **Fiche de Chargement** | Utilisée au dépôt, cases à cocher pour valider le chargement | Vert |
| **Bon de Suivi** | Archive + QR code vers la checklist mobile | Bleu |

Chaque document porte un numéro de bon automatique (ex. `2026-0042`) basé sur la séquence annuelle.

### Checklist mobile (sans authentification)
Chaque liste dispose d'un lien de partage unique (`/check/<token>`). Le chauffeur ou le magasinier peut cocher les articles depuis son téléphone sans avoir de compte.

### Statistiques & Consommation
Module de suivi des consommations par chantier et par matériau :
- **Allocations** — budget matière défini par chantier/matériau, éditable en ligne (inline edit)
- **Consommations** — saisie d'entrées de consommation avec date et notes (dialog)
- **Tableau de stats** — vue agrégée : consommé, alloué, % d'avancement, projection en fin de chantier
- Filtres par chantier et par matériau
- Badges de projection (sous-budget / dépassement estimé)

### Catalogue
Gestion des référentiels partagés :
- **Matériaux** — désignation + unité par défaut (U, M, M², M³, KG, T, L, Rouleau, Sac, Palette)
- **Chantiers** — nom + adresse, activable/désactivable
- **Chauffeurs** — nom + téléphone, activable/désactivable

### Historique
Recherche plein texte (chantier, chauffeur), filtre par statut, pagination 20 par page.

### Paramètres
- Informations de l'entreprise : nom, adresse, téléphone, logo (upload via Vercel Blob)
- Gestion des utilisateurs (ADMIN uniquement)

### Authentification
Connexion par email/mot de passe (NextAuth v5, credentials). Deux rôles :
- `BUREAU` — accès complet à la gestion des listes et du catalogue
- `ADMIN` — idem + gestion des utilisateurs et des paramètres

---

## Stack technique

| Couche | Technologie |
|---|---|
| Framework | Next.js 16 (App Router, React 19) |
| Langage | TypeScript |
| Styles | Tailwind CSS v4 + shadcn/ui |
| ORM | Prisma 7 |
| Base de données | PostgreSQL (ex. Neon) |
| Auth | NextAuth v5 — credentials + bcrypt |
| Stockage fichiers | Vercel Blob (logo entreprise) |
| Drag & drop | @dnd-kit/core + @dnd-kit/sortable |
| Impression | react-to-print |
| Déploiement | Vercel |

---

## Modèle de données

```
User            — email / passwordHash / role (BUREAU | ADMIN)
Chantier        — nom / adresse / actif
Chauffeur       — nom / téléphone / actif
Materiau        — désignation / unité par défaut / actif
CompanySettings — singleton : nom / logo / adresse / téléphone

LoadingList     — date / heureDepart / chantier / chauffeur / responsable
                  notes / statut / shareToken / créateur
  └── LoadingListItem — désignation / quantité / unité / ordre / coché

Allocation      — chantier / matériau / quantité allouée / unité
                  (unique par couple chantierId + materiauId)
ConsommationEntry — chantier / matériau / quantité / unité / date / notes
```

---

## Installation

### Prérequis
- Node.js 20+
- Une base PostgreSQL (Neon, Supabase, locale…)
- Un projet Vercel (pour Blob)

### Démarrage local

```bash
# 1. Cloner et installer
git clone <repo>
cd camio
npm install

# 2. Variables d'environnement
cp .env.local.example .env.local
# Remplir les valeurs (voir section ci-dessous)

# 3. Base de données
npx prisma migrate dev
npx prisma db seed        # Crée les comptes et données de démo

# 4. Lancer
npm run dev
```

### Variables d'environnement

```env
# Base de données
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DB?pgbouncer=true"
DIRECT_URL="postgresql://USER:PASSWORD@HOST:5432/DB"

# NextAuth
AUTH_URL="http://localhost:3000"
AUTH_SECRET="<générer avec : openssl rand -base64 32>"

# Vercel Blob (upload logo)
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_..."
```

### Comptes de démonstration (seed)

| Email | Mot de passe | Rôle |
|---|---|---|
| admin@camioload.fr | admin123 | ADMIN |
| bureau@camioload.fr | bureau123 | BUREAU |

---

## Structure du projet

```
app/
  (auth)/login/          — Page de connexion
  (dashboard)/
    lists/new/           — Création d'une liste
    lists/[id]/          — Édition d'une liste
    lists/[id]/print/    — Aperçu et impression des 3 documents
    history/             — Historique avec recherche et filtres
    catalogue/           — Gestion matériaux / chantiers / chauffeurs
    settings/            — Paramètres entreprise et utilisateurs
    stats/               — Statistiques consommation par chantier
  check/[token]/         — Checklist mobile (public, sans auth)
  api/
    auth/[...nextauth]/  — Endpoint NextAuth
    catalogue/search/    — Recherche de matériaux (autocomplete)
    upload/              — Upload logo vers Vercel Blob

components/
  documents/             — BonTransport, FicheChargement, BonSuivi
  lists/                 — ListForm, ItemsTable, CatalogSearch
  settings/              — SettingsForm, UsersTable
  check/                 — ChecklistView (mobile)
  stats/                 — StatsTable, StatsFilters, AllocationCell, ConsommationForm
  layout/                — Sidebar

lib/
  actions/               — Server Actions (listes, catalogue, settings, stats)
  auth.ts                — Configuration NextAuth
  prisma.ts              — Instance Prisma
  types.ts               — Types partagés
  utils/bonNumber.ts     — Génération du numéro de bon

prisma/
  schema.prisma          — Schéma de la base
  seed.ts                — Données de démonstration
```

---

## Déploiement Vercel

```bash
vercel link
vercel env add DATABASE_URL
vercel env add AUTH_SECRET
vercel env add AUTH_URL
vercel env add BLOB_READ_WRITE_TOKEN
vercel deploy --prod
```

Après le premier déploiement, exécuter les migrations :

```bash
npx prisma migrate deploy
npx prisma db seed
```
