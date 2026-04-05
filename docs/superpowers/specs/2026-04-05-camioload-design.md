# CamioLoad — Spec de design
**Date :** 2026-04-05
**Statut :** Approuvé
**Stack :** Next.js 15 (App Router) · TypeScript · Tailwind CSS · Prisma · PostgreSQL (Supabase) · NextAuth.js · Vercel

---

## 1. Contexte et objectif

Application web interne pour une entreprise de construction (mono-tenant, usage bureau + magasin). Le bureau saisit une fois les informations de chargement et génère automatiquement 3 documents imprimables. Le magasinier accède à sa fiche via un lien unique sur mobile pour cocher le matériel chargé en temps réel.

**Utilisateurs :**
- `BUREAU` — crée et gère les listes de chargement
- `ADMIN` — accès bureau + configuration (paramètres, catalogue)

---

## 2. Architecture

### Approche retenue : Next.js monolithique — Server Actions

Tout dans une seule app Next.js. Les mutations passent par des **Server Actions** (typage end-to-end, pas de fetch/JSON à la main). Les Route Handlers sont limités à :
- `POST /api/upload` — upload du logo entreprise vers Vercel Blob
- `GET /check/[token]` — accès public à la fiche magasinier (pas une API, c'est une page)

### Génération des documents PDF

**CSS @media print + react-to-print.** Les 3 bons sont des composants React mis en forme avec du CSS print. L'utilisateur clique "Imprimer" et le navigateur génère le PDF. Un bouton "Télécharger PDF" utilise react-to-print pour un export propre sans dépendance serveur.

Justification : cohérent avec le cahier des charges, zéro complexité de déploiement, CSS print déjà prévu.

### Temps réel fiche magasinier

Pas de WebSocket. Quand le magasinier coche un item, une Server Action `toggleItem()` met à jour la DB et revalide le path. L'UI est un Server Component qui se re-rend avec les données fraîches. Suffisant pour cet usage (pas de collaboration simultanée multi-utilisateurs sur la même fiche).

---

## 3. Modèle de données (Prisma)

```prisma
model User {
  id           String        @id @default(cuid())
  name         String
  email        String        @unique
  passwordHash String
  role         Role          @default(BUREAU)
  createdAt    DateTime      @default(now())
  lists        LoadingList[]
}

enum Role {
  BUREAU
  ADMIN
}

model Chantier {
  id      String        @id @default(cuid())
  name    String
  address String?
  active  Boolean       @default(true)
  lists   LoadingList[]
}

model Chauffeur {
  id     String        @id @default(cuid())
  name   String
  phone  String?
  active Boolean       @default(true)
  lists  LoadingList[]
}

model Materiau {
  id          String            @id @default(cuid())
  designation String
  defaultUnit Unit
  active      Boolean           @default(true)
  items       LoadingListItem[]
}

enum Unit {
  U
  M
  M2
  M3
  KG
  T
  L
  ROULEAU
  SAC
  PALETTE
}

model LoadingList {
  id            String            @id @default(cuid())
  date          DateTime
  departureTime String            // "07:00"
  chantierId    String
  chantier      Chantier          @relation(fields: [chantierId], references: [id])
  chauffeurId   String
  chauffeur     Chauffeur         @relation(fields: [chauffeurId], references: [id])
  responsable   String
  notes         String?
  status        ListStatus        @default(DRAFT)
  shareToken    String            @unique @default(uuid())
  createdById   String
  createdBy     User              @relation(fields: [createdById], references: [id])
  createdAt     DateTime          @default(now())
  items         LoadingListItem[]
}

enum ListStatus {
  DRAFT
  GENERATED
  LOADED
  DELIVERED
}

model LoadingListItem {
  id          String      @id @default(cuid())
  listId      String
  list        LoadingList @relation(fields: [listId], references: [id], onDelete: Cascade)
  materiauId  String?
  materiau    Materiau?   @relation(fields: [materiauId], references: [id])
  designation String      // copié depuis Materiau ou saisi libre
  quantity    Float
  unit        Unit
  order       Int
  checked     Boolean     @default(false)
}

model CompanySettings {
  id      String  @id @default("singleton")
  name    String  @default("Mon Entreprise")
  logoUrl String?
  address String?
  phone   String?
}
```

**Note :** `CompanySettings` est un singleton (id fixe = `"singleton"`). `shareToken` est généré automatiquement à la création de chaque liste et ne peut pas être modifié. `designation` est toujours copié depuis le catalogue au moment de l'ajout (indépendant des futures modifications du catalogue).

---

## 4. Structure des fichiers

```
camioload/
├── app/
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx              # Sidebar + auth guard
│   │   ├── lists/
│   │   │   ├── new/page.tsx        # Formulaire création
│   │   │   └── [id]/
│   │   │       ├── page.tsx        # Édition / détail
│   │   │       └── print/page.tsx  # Aperçu 3 bons + bouton imprimer
│   │   ├── history/page.tsx        # Liste paginée + recherche
│   │   ├── catalogue/page.tsx      # Gestion matériaux, chantiers, chauffeurs
│   │   └── settings/page.tsx       # Upload logo, nom entreprise
│   ├── check/
│   │   └── [token]/page.tsx        # Fiche magasinier (public, sans auth)
│   └── api/
│       └── upload/route.ts         # Upload logo → Vercel Blob
├── components/
│   ├── ui/                         # shadcn/ui components
│   ├── layout/
│   │   └── Sidebar.tsx
│   ├── lists/
│   │   ├── ListForm.tsx            # Formulaire principal (chantier, chauffeur, date…)
│   │   ├── ItemsTable.tsx          # Tableau des lignes de matériel (drag-to-reorder)
│   │   └── CatalogSearch.tsx       # Autocomplétion catalogue
│   ├── documents/
│   │   ├── BonTransport.tsx        # Document ① (CSS print)
│   │   ├── FicheChargement.tsx     # Document ② (CSS print)
│   │   ├── BonSuivi.tsx            # Document ③ (CSS print)
│   │   └── PrintButton.tsx         # Bouton react-to-print
│   └── check/
│       └── ChecklistView.tsx       # Fiche magasinier interactive
├── lib/
│   ├── prisma.ts                   # Singleton PrismaClient
│   ├── auth.ts                     # NextAuth config (CredentialsProvider)
│   └── actions/
│       ├── lists.ts                # createList, updateList, duplicateList, deleteList
│       ├── items.ts                # addItem, removeItem, reorderItems, toggleItem
│       ├── catalogue.ts            # CRUD chantiers, chauffeurs, matériaux
│       └── settings.ts             # updateCompanySettings
├── prisma/
│   ├── schema.prisma
│   └── seed.ts                     # Données exemple (1 user admin, chantiers, matériaux)
├── .env.local.example
└── README.md
```

---

## 5. Pages et fonctionnalités détaillées

### 5.1 Authentification (`/login`)
- NextAuth.js avec `CredentialsProvider`
- Vérification email + mot de passe (bcrypt)
- Session JWT stockée en cookie httpOnly
- Redirection automatique `/login` si non authentifié (middleware Next.js)
- Pas d'inscription publique — seul l'admin crée des comptes (via settings ou seed)

### 5.2 Nouvelle liste (`/lists/new`)
Formulaire en une page :
- **Chantier** : Combobox avec autocomplétion depuis la DB + option "Nouveau chantier"
- **Chauffeur** : Combobox avec autocomplétion depuis la DB
- **Date de chargement** : Date picker
- **Heure de départ prévue** : Time input
- **Responsable chantier** : Text input
- **Notes** : Textarea
- **Tableau de matériel** :
  - Recherche dans le catalogue (autocomplétion sur `designation`) — sélection pré-remplit désignation + unité par défaut
  - Saisie libre possible si pas dans le catalogue
  - Quantité + unité modifiables
  - Réordonnancement drag-and-drop via `@dnd-kit/core` (ordre stocké dans `order`)
  - Suppression ligne
- Bouton **"Enregistrer brouillon"** → Server Action `createList()`, status DRAFT
- Bouton **"Générer les 3 documents →"** → Server Action `createList()` + status GENERATED, redirect vers `/lists/[id]/print`

### 5.3 Aperçu impression (`/lists/[id]/print`)
- Affichage côte à côte des 3 composants documents
- Bouton **"Imprimer les 3 bons"** → `window.print()` ou react-to-print
- CSS `@media print` : masque la sidebar, imprime chaque bon sur une page A4 séparée (`page-break-after: always`)
- Lien magasinier affiché + bouton copier

### 5.4 Historique (`/history`)
- Liste paginée (20/page) triée par date décroissante
- Filtres : recherche texte (chantier + chauffeur), filtre statut, filtre date
- Chaque ligne : date, chantier, chauffeur, nb articles, statut (badge coloré), actions (voir, dupliquer, changer statut)
- **Dupliquer** → Server Action `duplicateList()` : crée une nouvelle liste DRAFT avec même chantier/chauffeur/items, date = aujourd'hui
- Changement de statut manuel (DRAFT → GENERATED → LOADED → DELIVERED)

### 5.5 Catalogue (`/catalogue`)
3 onglets : **Matériaux** | **Chantiers** | **Chauffeurs**
- CRUD complet pour chaque entité
- Soft delete (champ `active`) — les entités liées à des listes existantes ne sont pas supprimées

### 5.6 Paramètres (`/settings`)
- Nom de l'entreprise (affiché dans les 3 bons)
- Adresse & téléphone
- Logo : upload via `<input type="file">` → `POST /api/upload` → Vercel Blob → URL stockée dans `CompanySettings`
- Aperçu du logo en temps réel
- Gestion des utilisateurs (admin seulement) : liste, création, changement de rôle

### 5.7 Fiche magasinier (`/check/[token]`)
- Route **publique** (aucune authentification requise)
- Server Component qui charge la liste via `shareToken`
- Affiche : en-tête chantier/chauffeur/date, liste des items avec cases à cocher
- Coche → Server Action `toggleItem()` → revalide le path → re-render
- Barre de progression (X/N articles chargés)
- Quand tous cochés → bannière "Chargement complet ✓" + statut liste passe automatiquement à LOADED
- UI optimisée mobile (touch targets larges, pas de sidebar)

---

## 6. Documents imprimables

### Structure commune (3 bons)
- En-tête : logo entreprise (si uploadé) + nom entreprise + titre du bon + numéro (format `BT-YYYY-NNNN`)
- Infos générales : chantier, chauffeur, date, heure départ, responsable
- Tableau matériel
- Notes (si présentes)
- Zone signatures en bas

### ① Bon de transport (chauffeur)
Couleur accent : `#E07B3A` (orange). Tableau : désignation, quantité, unité. Deux zones signature : chauffeur + réception chantier.

### ② Fiche de chargement (magasinier)
Couleur accent : `#059669` (vert). Tableau : case à cocher physique, désignation, quantité, unité, case "chargé". Zone signature magasinier + date/heure chargement.

### ③ Bon de suivi bureau/archive
Couleur accent : `#1E3A5F` (bleu marine). Tableau identique au bon transport. Lien magasinier imprimé en bas. Trois zones : date retour, signature bureau, signature client.

---

## 7. UI/UX

- **Palette** : fond `#F8F7F4` (blanc cassé), texte/sidebar `#3D4A5C` (gris ardoise), accent `#E07B3A` (orange chantier)
- **Typographie** : Geist Sans (interface) + Geist Mono (codes, numéros de bon)
- **Composants** : shadcn/ui (Button, Input, Select, Dialog, Table, Tabs, Badge…)
- **Responsive** : sidebar sur desktop/tablette, menu burger sur mobile
- **Mode sombre** : non prévu (usage bureau/impression prioritaire)

**Statuts (badges colorés) :**
- DRAFT → `yellow` (Brouillon)
- GENERATED → `blue` (Générée)
- LOADED → `orange` (Chargée)
- DELIVERED → `green` (Livrée)

---

## 8. Variables d'environnement

```bash
# Base de données (Supabase)
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."         # Pour les migrations Prisma

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="<random-secret>"

# Vercel Blob (upload logo)
BLOB_READ_WRITE_TOKEN="<vercel-blob-token>"

# Optionnel — SMS (Twilio, bonus v2)
# TWILIO_ACCOUNT_SID=""
# TWILIO_AUTH_TOKEN=""
# TWILIO_PHONE_NUMBER=""
```

---

## 9. Seed de données

Le seed (`prisma/seed.ts`) crée :
- 1 utilisateur admin (`admin@camioload.fr` / `admin123`)
- 1 utilisateur bureau (`bureau@camioload.fr` / `bureau123`)
- 3 chantiers exemples
- 3 chauffeurs exemples
- 15 matériaux prédéfinis couvrant les catégories courantes (blocs, ciment, sable, bois, placo, etc.)
- 1 `CompanySettings` singleton avec nom par défaut

---

## 10. Déploiement Vercel

1. `vercel link` → connecter au projet
2. Ajouter les variables d'environnement dans le dashboard Vercel
3. `vercel deploy --prod`
4. Après premier déploiement : `npx prisma migrate deploy` via la CLI Vercel ou Supabase dashboard
5. `npx prisma db seed` pour les données initiales

---

## 11. Décisions et exclusions

| Décision | Justification |
|----------|---------------|
| Server Actions pour les mutations | Typage end-to-end, pas de REST boilerplate, déploiement zero-config |
| CSS print + react-to-print | Zéro dépendance serveur, cohérent avec le cahier des charges |
| Revalidation path pour checklist magasinier | Suffisant pour cet usage, pas besoin de WebSocket |
| CompanySettings singleton | Une seule entreprise, pas de multi-tenant |
| Soft delete sur catalogue | Préserve l'intégrité des listes historiques |
| Pas d'inscription publique | Sécurité — seul l'admin crée des comptes |
| SMS Twilio | Exclu de v1, prévu v2 (variables d'env documentées) |
| Multi-tenant | Exclu, hors scope pour l'instant |

---

## 12. Contraintes techniques identifiées

- **Prisma + Vercel** : utiliser `DIRECT_URL` pour les migrations (Supabase pooling incompatible avec `prisma migrate`)
- **react-to-print** : nécessite un `ref` sur le composant à imprimer — wrapping minimal à prévoir
- **Vercel Blob** : token `BLOB_READ_WRITE_TOKEN` requis même en local dev
- **NextAuth v5** : utiliser `next-auth@5` (stable depuis fin 2024) compatible App Router — adapter Prisma : `@auth/prisma-adapter`. Ne pas utiliser v4 (incompatible App Router sans workaround).
- **Numérotation des bons** : format `BT-YYYY-NNNN` — calculé via `COUNT(LoadingList WHERE YEAR(createdAt) = currentYear) + 1`, zéro-paddé sur 4 chiffres. Pas de champ compteur supplémentaire.
