# CamioLoad Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construire CamioLoad — application web interne pour gérer des listes de chargement, générer 3 documents imprimables, et permettre au magasinier de cocher le matériel via un lien public.

**Architecture:** Next.js 15 App Router monolithique avec Server Actions pour toutes les mutations. PostgreSQL via Supabase + Prisma ORM. Authentification NextAuth v5 avec CredentialsProvider. Documents imprimables via CSS @media print + react-to-print.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS, shadcn/ui, Prisma, PostgreSQL (Supabase), NextAuth v5, @dnd-kit/core, react-to-print, Vercel Blob

---

## File Map

```
camioload/
├── app/
│   ├── (auth)/login/page.tsx              # Page de connexion
│   ├── (dashboard)/
│   │   ├── layout.tsx                     # Sidebar + auth guard
│   │   ├── lists/new/page.tsx             # Formulaire création liste
│   │   ├── lists/[id]/page.tsx            # Édition / détail liste
│   │   ├── lists/[id]/print/page.tsx      # Aperçu 3 documents + bouton print
│   │   ├── history/page.tsx               # Historique paginé
│   │   ├── catalogue/page.tsx             # CRUD matériaux/chantiers/chauffeurs
│   │   └── settings/page.tsx              # Logo, infos entreprise, utilisateurs
│   ├── check/[token]/page.tsx             # Fiche magasinier (public)
│   └── api/upload/route.ts                # Upload logo → Vercel Blob
├── components/
│   ├── ui/                                # shadcn/ui (installés via CLI)
│   ├── layout/Sidebar.tsx                 # Navigation sidebar
│   ├── lists/
│   │   ├── ListForm.tsx                   # Formulaire principal (Client)
│   │   ├── ItemsTable.tsx                 # Tableau matériel + DnD (Client)
│   │   └── CatalogSearch.tsx             # Autocomplétion catalogue (Client)
│   ├── documents/
│   │   ├── BonTransport.tsx               # Document ① orange
│   │   ├── FicheChargement.tsx            # Document ② vert
│   │   ├── BonSuivi.tsx                   # Document ③ bleu marine
│   │   └── PrintButton.tsx               # Bouton react-to-print (Client)
│   └── check/ChecklistView.tsx            # Fiche magasinier interactive (Client)
├── lib/
│   ├── prisma.ts                          # Singleton PrismaClient
│   ├── auth.ts                            # NextAuth config
│   └── actions/
│       ├── lists.ts                       # createList, updateList, duplicateList, deleteList
│       ├── items.ts                       # addItem, removeItem, reorderItems, toggleItem
│       ├── catalogue.ts                   # CRUD chantiers, chauffeurs, matériaux
│       └── settings.ts                    # updateCompanySettings
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── middleware.ts                          # Redirect /login si non auth
├── .env.local.example
└── next.config.ts
```

---

## Task 1: Scaffold projet Next.js + dépendances

**Files:**
- Create: `package.json`, `next.config.ts`, `tailwind.config.ts`, `tsconfig.json`, `.env.local.example`

- [ ] **Step 1: Créer le projet Next.js**

```bash
cd /Users/victorrubia/Camio
npx create-next-app@latest camioload \
  --typescript \
  --tailwind \
  --app \
  --src-dir false \
  --import-alias "@/*" \
  --no-turbopack
cd camioload
```

- [ ] **Step 2: Installer les dépendances**

```bash
npm install prisma @prisma/client
npm install next-auth@5 @auth/prisma-adapter
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
npm install react-to-print
npm install bcryptjs
npm install @vercel/blob
npm install -D @types/bcryptjs
```

- [ ] **Step 3: Initialiser shadcn/ui**

```bash
npx shadcn@latest init
# Choisir: Default style, zinc color, yes CSS variables
```

- [ ] **Step 4: Installer les composants shadcn nécessaires**

```bash
npx shadcn@latest add button input label select textarea badge table tabs dialog alert-dialog card separator skeleton toast command popover calendar
```

- [ ] **Step 5: Créer `.env.local.example`**

```bash
cat > .env.local.example << 'EOF'
# Base de données (Supabase)
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DB?pgbouncer=true"
DIRECT_URL="postgresql://USER:PASSWORD@HOST:5432/DB"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"

# Vercel Blob (upload logo)
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_..."
EOF
```

- [ ] **Step 6: Créer `.env.local` depuis l'exemple**

```bash
cp .env.local.example .env.local
# Remplir les vraies valeurs
```

- [ ] **Step 7: Commit initial**

```bash
git init
git add -A
git commit -m "feat: scaffold Next.js project with dependencies"
```

---

## Task 2: Schéma Prisma + migration + seed

**Files:**
- Create: `prisma/schema.prisma`, `prisma/seed.ts`
- Modify: `package.json` (script seed), `lib/prisma.ts`

- [ ] **Step 1: Initialiser Prisma**

```bash
npx prisma init --datasource-provider postgresql
```

- [ ] **Step 2: Écrire `prisma/schema.prisma`**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

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
  departureTime String
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
  designation String
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

- [ ] **Step 3: Créer `lib/prisma.ts`**

```typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

- [ ] **Step 4: Créer `prisma/seed.ts`**

```typescript
import { PrismaClient, Role, Unit } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Users
  const adminHash = await bcrypt.hash("admin123", 12);
  const bureauHash = await bcrypt.hash("bureau123", 12);

  await prisma.user.upsert({
    where: { email: "admin@camioload.fr" },
    update: {},
    create: { name: "Admin", email: "admin@camioload.fr", passwordHash: adminHash, role: Role.ADMIN },
  });

  await prisma.user.upsert({
    where: { email: "bureau@camioload.fr" },
    update: {},
    create: { name: "Bureau", email: "bureau@camioload.fr", passwordHash: bureauHash, role: Role.BUREAU },
  });

  // CompanySettings singleton
  await prisma.companySettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton", name: "Mon Entreprise BTP" },
  });

  // Chantiers
  for (const c of [
    { name: "Résidence Les Pins", address: "12 rue des Pins, 69003 Lyon" },
    { name: "Immeuble Centre-Ville", address: "5 place Bellecour, 69002 Lyon" },
    { name: "Maison individuelle Bron", address: "34 avenue Jean Jaurès, 69500 Bron" },
  ]) {
    await prisma.chantier.create({ data: c });
  }

  // Chauffeurs
  for (const c of [
    { name: "Mohamed Benali", phone: "06 12 34 56 78" },
    { name: "Jean-Pierre Durand", phone: "06 98 76 54 32" },
    { name: "Carlos Silva", phone: "07 11 22 33 44" },
  ]) {
    await prisma.chauffeur.create({ data: c });
  }

  // Matériaux
  const materiaux = [
    { designation: "Bloc béton 20x20x50", defaultUnit: Unit.U },
    { designation: "Bloc béton 15x20x50", defaultUnit: Unit.U },
    { designation: "Ciment CEM II 35kg", defaultUnit: Unit.SAC },
    { designation: "Sable 0/4 concassé", defaultUnit: Unit.T },
    { designation: "Gravier 6/10", defaultUnit: Unit.T },
    { designation: "Plaque de plâtre BA13", defaultUnit: Unit.U },
    { designation: "Plaque de plâtre BA18", defaultUnit: Unit.U },
    { designation: "Rail 48mm", defaultUnit: Unit.M },
    { designation: "Montant 48mm", defaultUnit: Unit.M },
    { designation: "Bois de charpente 63x150", defaultUnit: Unit.M },
    { designation: "Chevron 75x75", defaultUnit: Unit.M },
    { designation: "Rouleau laine de verre 100mm", defaultUnit: Unit.ROULEAU },
    { designation: "Parpaing creux 20x20x50", defaultUnit: Unit.U },
    { designation: "Enduit de façade (sac 25kg)", defaultUnit: Unit.SAC },
    { designation: "Palette brique monomur", defaultUnit: Unit.PALETTE },
  ];

  for (const m of materiaux) {
    await prisma.materiau.create({ data: m });
  }

  console.log("Seed terminé ✓");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

- [ ] **Step 5: Ajouter le script seed dans `package.json`**

```json
"prisma": {
  "seed": "ts-node --compiler-options '{\"module\":\"CommonJS\"}' prisma/seed.ts"
}
```

Aussi installer ts-node :
```bash
npm install -D ts-node
```

- [ ] **Step 6: Lancer la migration**

```bash
npx prisma migrate dev --name init
```

- [ ] **Step 7: Lancer le seed**

```bash
npx prisma db seed
```

- [ ] **Step 8: Vérifier dans Prisma Studio**

```bash
npx prisma studio
# Vérifier : 2 users, 3 chantiers, 3 chauffeurs, 15 matériaux, 1 CompanySettings
```

- [ ] **Step 9: Commit**

```bash
git add prisma/ lib/prisma.ts package.json
git commit -m "feat: prisma schema, migration, seed data"
```

---

## Task 3: Authentification NextAuth v5

**Files:**
- Create: `lib/auth.ts`, `app/api/auth/[...nextauth]/route.ts`, `app/(auth)/login/page.tsx`, `middleware.ts`

- [ ] **Step 1: Créer `lib/auth.ts`**

```typescript
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user) return null;

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );

        if (!valid) return null;

        return { id: user.id, name: user.name, email: user.email, role: user.role };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role: string }).role;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as string;
      return session;
    },
  },
});
```

- [ ] **Step 2: Créer `app/api/auth/[...nextauth]/route.ts`**

```typescript
import { handlers } from "@/lib/auth";
export const { GET, POST } = handlers;
```

- [ ] **Step 3: Étendre les types NextAuth — créer `types/next-auth.d.ts`**

```typescript
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: string;
    };
  }
}
```

- [ ] **Step 4: Créer `middleware.ts`**

```typescript
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isLoginPage = req.nextUrl.pathname === "/login";
  const isCheckPage = req.nextUrl.pathname.startsWith("/check/");
  const isApiAuth = req.nextUrl.pathname.startsWith("/api/auth");

  if (isLoginPage || isCheckPage || isApiAuth) return NextResponse.next();

  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

- [ ] **Step 5: Créer `app/(auth)/login/page.tsx`**

```typescript
"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const result = await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirect: false,
    });

    if (result?.error) {
      setError("Email ou mot de passe incorrect");
      setLoading(false);
    } else {
      router.push("/lists/new");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F7F4]">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl text-[#3D4A5C]">CamioLoad</CardTitle>
          <p className="text-sm text-muted-foreground">Gestion des chargements</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required autoComplete="email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input id="password" name="password" type="password" required autoComplete="current-password" />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full bg-[#E07B3A] hover:bg-[#c96a2a]" disabled={loading}>
              {loading ? "Connexion…" : "Se connecter"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 6: Tester la connexion**

```bash
npm run dev
# Naviguer vers http://localhost:3000
# Doit rediriger vers /login
# Se connecter avec admin@camioload.fr / admin123
# Doit rediriger vers /lists/new (404 pour l'instant = OK)
```

- [ ] **Step 7: Commit**

```bash
git add lib/auth.ts app/api/ app/\(auth\)/ middleware.ts types/
git commit -m "feat: NextAuth v5 credentials authentication"
```

---

## Task 4: Layout dashboard + Sidebar

**Files:**
- Create: `app/(dashboard)/layout.tsx`, `components/layout/Sidebar.tsx`

- [ ] **Step 1: Créer `components/layout/Sidebar.tsx`**

```typescript
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Plus, Clock, BookOpen, Settings, LogOut, Truck } from "lucide-react";

const navItems = [
  { href: "/lists/new", label: "Nouvelle liste", icon: Plus },
  { href: "/history", label: "Historique", icon: Clock },
  { href: "/catalogue", label: "Catalogue", icon: BookOpen },
  { href: "/settings", label: "Paramètres", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 min-h-screen bg-[#3D4A5C] text-white flex flex-col">
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Truck className="h-6 w-6 text-[#E07B3A]" />
          <span className="font-bold text-lg">CamioLoad</span>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
              pathname === href || pathname.startsWith(href + "/")
                ? "bg-[#E07B3A] text-white"
                : "text-white/70 hover:bg-white/10 hover:text-white"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-white/10">
        <Button
          variant="ghost"
          className="w-full justify-start text-white/70 hover:text-white hover:bg-white/10"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Déconnexion
        </Button>
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: Créer `app/(dashboard)/layout.tsx`**

```typescript
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="flex min-h-screen bg-[#F8F7F4]">
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  );
}
```

- [ ] **Step 3: Créer une page d'accueil temporaire `app/(dashboard)/page.tsx`**

```typescript
import { redirect } from "next/navigation";
export default function HomePage() {
  redirect("/lists/new");
}
```

- [ ] **Step 4: Vérifier visuellement**

```bash
npm run dev
# http://localhost:3000 → /login → connexion → sidebar visible à gauche
```

- [ ] **Step 5: Commit**

```bash
git add app/\(dashboard\)/ components/layout/
git commit -m "feat: dashboard layout with sidebar navigation"
```

---

## Task 5: Server Actions — listes, items, catalogue, settings

**Files:**
- Create: `lib/actions/lists.ts`, `lib/actions/items.ts`, `lib/actions/catalogue.ts`, `lib/actions/settings.ts`

- [ ] **Step 1: Créer `lib/actions/lists.ts`**

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ListStatus } from "@prisma/client";

function getBonNumber(count: number): string {
  const year = new Date().getFullYear();
  return `BT-${year}-${String(count).padStart(4, "0")}`;
}

export async function createList(formData: FormData, generate = false) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non authentifié");

  const year = new Date().getFullYear();
  const count = await prisma.loadingList.count({
    where: { createdAt: { gte: new Date(`${year}-01-01`), lt: new Date(`${year + 1}-01-01`) } },
  });

  const list = await prisma.loadingList.create({
    data: {
      date: new Date(formData.get("date") as string),
      departureTime: formData.get("departureTime") as string,
      chantierId: formData.get("chantierId") as string,
      chauffeurId: formData.get("chauffeurId") as string,
      responsable: formData.get("responsable") as string,
      notes: (formData.get("notes") as string) || null,
      status: generate ? ListStatus.GENERATED : ListStatus.DRAFT,
      createdById: session.user.id,
    },
  });

  revalidatePath("/history");

  if (generate) {
    redirect(`/lists/${list.id}/print`);
  } else {
    redirect(`/lists/${list.id}`);
  }
}

export async function updateList(id: string, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non authentifié");

  await prisma.loadingList.update({
    where: { id },
    data: {
      date: new Date(formData.get("date") as string),
      departureTime: formData.get("departureTime") as string,
      chantierId: formData.get("chantierId") as string,
      chauffeurId: formData.get("chauffeurId") as string,
      responsable: formData.get("responsable") as string,
      notes: (formData.get("notes") as string) || null,
    },
  });

  revalidatePath(`/lists/${id}`);
  revalidatePath("/history");
}

export async function generateList(id: string) {
  await prisma.loadingList.update({
    where: { id },
    data: { status: ListStatus.GENERATED },
  });
  revalidatePath(`/lists/${id}`);
  redirect(`/lists/${id}/print`);
}

export async function duplicateList(id: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non authentifié");

  const original = await prisma.loadingList.findUniqueOrThrow({
    where: { id },
    include: { items: true },
  });

  const copy = await prisma.loadingList.create({
    data: {
      date: new Date(),
      departureTime: original.departureTime,
      chantierId: original.chantierId,
      chauffeurId: original.chauffeurId,
      responsable: original.responsable,
      notes: original.notes,
      status: ListStatus.DRAFT,
      createdById: session.user.id,
      items: {
        create: original.items.map((item) => ({
          materiauId: item.materiauId,
          designation: item.designation,
          quantity: item.quantity,
          unit: item.unit,
          order: item.order,
          checked: false,
        })),
      },
    },
  });

  revalidatePath("/history");
  redirect(`/lists/${copy.id}`);
}

export async function deleteList(id: string) {
  await prisma.loadingList.delete({ where: { id } });
  revalidatePath("/history");
  redirect("/history");
}

export async function updateListStatus(id: string, status: ListStatus) {
  await prisma.loadingList.update({ where: { id }, data: { status } });
  revalidatePath("/history");
  revalidatePath(`/lists/${id}`);
}
```

- [ ] **Step 2: Créer `lib/actions/items.ts`**

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { Unit } from "@prisma/client";

export async function addItem(
  listId: string,
  data: { designation: string; quantity: number; unit: Unit; materiauId?: string }
) {
  const maxOrder = await prisma.loadingListItem.aggregate({
    where: { listId },
    _max: { order: true },
  });

  await prisma.loadingListItem.create({
    data: {
      listId,
      designation: data.designation,
      quantity: data.quantity,
      unit: data.unit,
      materiauId: data.materiauId || null,
      order: (maxOrder._max.order ?? -1) + 1,
    },
  });

  revalidatePath(`/lists/${listId}`);
}

export async function removeItem(itemId: string, listId: string) {
  await prisma.loadingListItem.delete({ where: { id: itemId } });
  revalidatePath(`/lists/${listId}`);
}

export async function reorderItems(listId: string, orderedIds: string[]) {
  await Promise.all(
    orderedIds.map((id, index) =>
      prisma.loadingListItem.update({ where: { id }, data: { order: index } })
    )
  );
  revalidatePath(`/lists/${listId}`);
}

export async function toggleItem(itemId: string, listId: string, checked: boolean) {
  await prisma.loadingListItem.update({
    where: { id: itemId },
    data: { checked },
  });

  // Si tous cochés → LOADED
  const items = await prisma.loadingListItem.findMany({ where: { listId } });
  if (items.length > 0 && items.every((i) => i.checked)) {
    await prisma.loadingList.update({
      where: { id: listId },
      data: { status: "LOADED" },
    });
  }

  revalidatePath(`/check/${await getToken(listId)}`);
}

async function getToken(listId: string): Promise<string> {
  const list = await prisma.loadingList.findUnique({
    where: { id: listId },
    select: { shareToken: true },
  });
  return list!.shareToken;
}
```

- [ ] **Step 3: Créer `lib/actions/catalogue.ts`**

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { Unit } from "@prisma/client";

// Chantiers
export async function createChantier(data: { name: string; address?: string }) {
  await prisma.chantier.create({ data });
  revalidatePath("/catalogue");
}

export async function updateChantier(id: string, data: { name: string; address?: string }) {
  await prisma.chantier.update({ where: { id }, data });
  revalidatePath("/catalogue");
}

export async function toggleChantierActive(id: string, active: boolean) {
  await prisma.chantier.update({ where: { id }, data: { active } });
  revalidatePath("/catalogue");
}

// Chauffeurs
export async function createChauffeur(data: { name: string; phone?: string }) {
  await prisma.chauffeur.create({ data });
  revalidatePath("/catalogue");
}

export async function updateChauffeur(id: string, data: { name: string; phone?: string }) {
  await prisma.chauffeur.update({ where: { id }, data });
  revalidatePath("/catalogue");
}

export async function toggleChauffeurActive(id: string, active: boolean) {
  await prisma.chauffeur.update({ where: { id }, data: { active } });
  revalidatePath("/catalogue");
}

// Matériaux
export async function createMateriau(data: { designation: string; defaultUnit: Unit }) {
  await prisma.materiau.create({ data });
  revalidatePath("/catalogue");
}

export async function updateMateriau(
  id: string,
  data: { designation: string; defaultUnit: Unit }
) {
  await prisma.materiau.update({ where: { id }, data });
  revalidatePath("/catalogue");
}

export async function toggleMateriauActive(id: string, active: boolean) {
  await prisma.materiau.update({ where: { id }, data: { active } });
  revalidatePath("/catalogue");
}
```

- [ ] **Step 4: Créer `lib/actions/settings.ts`**

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";

export async function updateCompanySettings(data: {
  name: string;
  address?: string;
  phone?: string;
  logoUrl?: string;
}) {
  await prisma.companySettings.upsert({
    where: { id: "singleton" },
    update: data,
    create: { id: "singleton", ...data },
  });
  revalidatePath("/settings");
  revalidatePath("/lists");
}

export async function createUser(data: {
  name: string;
  email: string;
  password: string;
  role: Role;
}) {
  const passwordHash = await bcrypt.hash(data.password, 12);
  await prisma.user.create({
    data: { name: data.name, email: data.email, passwordHash, role: data.role },
  });
  revalidatePath("/settings");
}

export async function updateUserRole(id: string, role: Role) {
  await prisma.user.update({ where: { id }, data: { role } });
  revalidatePath("/settings");
}
```

- [ ] **Step 5: Commit**

```bash
git add lib/actions/
git commit -m "feat: server actions for lists, items, catalogue, settings"
```

---

## Task 6: Page nouvelle liste (`/lists/new`)

**Files:**
- Create: `app/(dashboard)/lists/new/page.tsx`, `components/lists/ListForm.tsx`, `components/lists/ItemsTable.tsx`, `components/lists/CatalogSearch.tsx`

- [ ] **Step 1: Créer `components/lists/CatalogSearch.tsx`**

```typescript
"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Unit } from "@prisma/client";

interface Materiau {
  id: string;
  designation: string;
  defaultUnit: Unit;
}

interface Props {
  onSelect: (m: Materiau) => void;
}

export function CatalogSearch({ onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Materiau[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.length < 2) { setResults([]); setOpen(false); return; }
    fetch(`/api/catalogue/search?q=${encodeURIComponent(query)}`)
      .then((r) => r.json())
      .then((data) => { setResults(data); setOpen(data.length > 0); });
  }, [query]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <Input
        placeholder="Rechercher dans le catalogue…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {open && (
        <ul className="absolute z-10 w-full bg-white border rounded-md shadow-lg mt-1 max-h-48 overflow-y-auto">
          {results.map((m) => (
            <li
              key={m.id}
              className="px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm"
              onMouseDown={() => {
                onSelect(m);
                setQuery("");
                setOpen(false);
              }}
            >
              {m.designation}
              <span className="text-muted-foreground ml-2 text-xs">{m.defaultUnit}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Créer la route API de recherche catalogue `app/api/catalogue/search/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const results = await prisma.materiau.findMany({
    where: {
      active: true,
      designation: { contains: q, mode: "insensitive" },
    },
    take: 10,
    select: { id: true, designation: true, defaultUnit: true },
  });
  return NextResponse.json(results);
}
```

- [ ] **Step 3: Créer `components/lists/ItemsTable.tsx`**

```typescript
"use client";

import { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CatalogSearch } from "./CatalogSearch";
import { GripVertical, Trash2, Plus } from "lucide-react";
import { Unit } from "@prisma/client";

export interface ItemRow {
  id: string;
  designation: string;
  quantity: number;
  unit: Unit;
  materiauId?: string;
}

const UNITS: Unit[] = ["U", "M", "M2", "M3", "KG", "T", "L", "ROULEAU", "SAC", "PALETTE"];

function SortableRow({
  item,
  onChange,
  onRemove,
}: {
  item: ItemRow;
  onChange: (id: string, field: keyof ItemRow, value: string | number) => void;
  onRemove: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <tr ref={setNodeRef} style={style}>
      <td className="p-2 w-8">
        <button {...attributes} {...listeners} className="cursor-grab text-muted-foreground">
          <GripVertical className="h-4 w-4" />
        </button>
      </td>
      <td className="p-2">
        <Input
          value={item.designation}
          onChange={(e) => onChange(item.id, "designation", e.target.value)}
          placeholder="Désignation"
        />
      </td>
      <td className="p-2 w-28">
        <Input
          type="number"
          min="0"
          step="0.01"
          value={item.quantity}
          onChange={(e) => onChange(item.id, "quantity", parseFloat(e.target.value) || 0)}
        />
      </td>
      <td className="p-2 w-32">
        <Select value={item.unit} onValueChange={(v) => onChange(item.id, "unit", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
          </SelectContent>
        </Select>
      </td>
      <td className="p-2 w-10">
        <Button variant="ghost" size="icon" onClick={() => onRemove(item.id)}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </td>
    </tr>
  );
}

interface Props {
  items: ItemRow[];
  onChange: (items: ItemRow[]) => void;
}

export function ItemsTable({ items, onChange }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);
      onChange(arrayMove(items, oldIndex, newIndex));
    }
  }

  function updateItem(id: string, field: keyof ItemRow, value: string | number) {
    onChange(items.map((i) => (i.id === id ? { ...i, [field]: value } : i)));
  }

  function removeItem(id: string) {
    onChange(items.filter((i) => i.id !== id));
  }

  function addBlankItem() {
    onChange([
      ...items,
      { id: crypto.randomUUID(), designation: "", quantity: 1, unit: "U" },
    ]);
  }

  return (
    <div className="space-y-3">
      <CatalogSearch
        onSelect={(m) =>
          onChange([
            ...items,
            { id: crypto.randomUUID(), designation: m.designation, quantity: 1, unit: m.defaultUnit, materiauId: m.id },
          ])
        }
      />
      <div className="border rounded-md overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="p-2 w-8" />
              <th className="p-2 text-left">Désignation</th>
              <th className="p-2 text-left w-28">Quantité</th>
              <th className="p-2 text-left w-32">Unité</th>
              <th className="p-2 w-10" />
            </tr>
          </thead>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
              <tbody>
                {items.map((item) => (
                  <SortableRow key={item.id} item={item} onChange={updateItem} onRemove={removeItem} />
                ))}
              </tbody>
            </SortableContext>
          </DndContext>
        </table>
      </div>
      <Button variant="outline" size="sm" onClick={addBlankItem}>
        <Plus className="h-4 w-4 mr-1" /> Ajouter une ligne libre
      </Button>
    </div>
  );
}
```

- [ ] **Step 4: Créer `components/lists/ListForm.tsx`**

```typescript
"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ItemsTable, ItemRow } from "./ItemsTable";
import { createList } from "@/lib/actions/lists";
import { addItem } from "@/lib/actions/items";
import { Chantier, Chauffeur } from "@prisma/client";

interface Props {
  chantiers: Chantier[];
  chauffeurs: Chauffeur[];
}

export function ListForm({ chantiers, chauffeurs }: Props) {
  const [items, setItems] = useState<ItemRow[]>([]);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>, generate: boolean) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      // createList creates the list + redirects; we need to pass items too
      // We use a hidden field approach: serialize items to JSON
      formData.set("itemsJson", JSON.stringify(items));
      formData.set("generate", generate ? "1" : "0");
      await createList(formData, generate);
    });
  }

  const today = new Date().toISOString().split("T")[0];

  return (
    <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Chantier *</Label>
          <Select name="chantierId" required>
            <SelectTrigger><SelectValue placeholder="Sélectionner…" /></SelectTrigger>
            <SelectContent>
              {chantiers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Chauffeur *</Label>
          <Select name="chauffeurId" required>
            <SelectTrigger><SelectValue placeholder="Sélectionner…" /></SelectTrigger>
            <SelectContent>
              {chauffeurs.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Date de chargement *</Label>
          <Input type="date" name="date" defaultValue={today} required />
        </div>
        <div className="space-y-2">
          <Label>Heure de départ</Label>
          <Input type="time" name="departureTime" defaultValue="07:00" />
        </div>
        <div className="space-y-2 col-span-2">
          <Label>Responsable chantier *</Label>
          <Input name="responsable" placeholder="Nom du responsable" required />
        </div>
        <div className="space-y-2 col-span-2">
          <Label>Notes</Label>
          <Textarea name="notes" placeholder="Instructions particulières…" rows={2} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Matériel</Label>
        <ItemsTable items={items} onChange={setItems} />
      </div>

      <div className="flex gap-3">
        <Button type="submit" variant="outline" disabled={isPending}>
          Enregistrer brouillon
        </Button>
        <Button
          type="button"
          className="bg-[#E07B3A] hover:bg-[#c96a2a]"
          disabled={isPending}
          onClick={(e) => {
            const form = (e.target as HTMLElement).closest("form") as HTMLFormElement;
            handleSubmit({ currentTarget: form, preventDefault: () => {} } as React.FormEvent<HTMLFormElement>, true);
          }}
        >
          Générer les 3 documents →
        </Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 5: Mettre à jour `lib/actions/lists.ts` — `createList` doit traiter `itemsJson`**

Modifier `createList` dans `lib/actions/lists.ts` pour créer les items en même temps :

```typescript
export async function createList(formData: FormData, generate = false) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non authentifié");

  const itemsJson = formData.get("itemsJson") as string;
  const items: ItemRow[] = itemsJson ? JSON.parse(itemsJson) : [];

  const list = await prisma.loadingList.create({
    data: {
      date: new Date(formData.get("date") as string),
      departureTime: formData.get("departureTime") as string,
      chantierId: formData.get("chantierId") as string,
      chauffeurId: formData.get("chauffeurId") as string,
      responsable: formData.get("responsable") as string,
      notes: (formData.get("notes") as string) || null,
      status: generate ? ListStatus.GENERATED : ListStatus.DRAFT,
      createdById: session.user.id,
      items: {
        create: items.map((item, index) => ({
          designation: item.designation,
          quantity: item.quantity,
          unit: item.unit,
          materiauId: item.materiauId || null,
          order: index,
        })),
      },
    },
  });

  revalidatePath("/history");

  if (generate) {
    redirect(`/lists/${list.id}/print`);
  } else {
    redirect(`/lists/${list.id}`);
  }
}
```

Note: Ajouter `import type { ItemRow } from "@/components/lists/ItemsTable"` en haut du fichier.

- [ ] **Step 6: Créer `app/(dashboard)/lists/new/page.tsx`**

```typescript
import { prisma } from "@/lib/prisma";
import { ListForm } from "@/components/lists/ListForm";

export default async function NewListPage() {
  const [chantiers, chauffeurs] = await Promise.all([
    prisma.chantier.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.chauffeur.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-[#3D4A5C] mb-6">Nouvelle liste de chargement</h1>
      <ListForm chantiers={chantiers} chauffeurs={chauffeurs} />
    </div>
  );
}
```

- [ ] **Step 7: Tester création d'une liste**

```bash
npm run dev
# http://localhost:3000/lists/new
# Remplir le formulaire, ajouter des articles, "Enregistrer brouillon"
# Doit rediriger vers /lists/[id]
```

- [ ] **Step 8: Commit**

```bash
git add app/\(dashboard\)/lists/new/ components/lists/ app/api/catalogue/
git commit -m "feat: new list form with catalog search and drag-and-drop items"
```

---

## Task 7: Documents imprimables (3 bons)

**Files:**
- Create: `components/documents/BonTransport.tsx`, `components/documents/FicheChargement.tsx`, `components/documents/BonSuivi.tsx`, `components/documents/PrintButton.tsx`, `app/(dashboard)/lists/[id]/print/page.tsx`
- Create: `app/globals.css` (ajouter styles print)

- [ ] **Step 1: Ajouter les styles CSS print dans `app/globals.css`**

Ajouter à la fin du fichier existant :

```css
@media print {
  body * {
    visibility: hidden;
  }
  #print-area,
  #print-area * {
    visibility: visible;
  }
  #print-area {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
  }
  .page-break {
    page-break-after: always;
  }
  @page {
    size: A4;
    margin: 15mm;
  }
}
```

- [ ] **Step 2: Créer le type partagé `lib/types.ts`**

```typescript
import { LoadingList, LoadingListItem, Chantier, Chauffeur, CompanySettings } from "@prisma/client";

export type FullLoadingList = LoadingList & {
  chantier: Chantier;
  chauffeur: Chauffeur;
  items: LoadingListItem[];
};

export type DocumentProps = {
  list: FullLoadingList;
  company: CompanySettings;
  bonNumber: string;
};
```

- [ ] **Step 3: Créer `components/documents/BonTransport.tsx`**

```typescript
import { DocumentProps } from "@/lib/types";

export function BonTransport({ list, company, bonNumber }: DocumentProps) {
  return (
    <div className="page-break font-sans text-sm text-gray-900 bg-white p-8">
      {/* En-tête */}
      <div className="flex justify-between items-start mb-6 pb-4 border-b-4 border-[#E07B3A]">
        <div>
          {company.logoUrl && (
            <img src={company.logoUrl} alt="Logo" className="h-16 object-contain mb-2" />
          )}
          <div className="font-bold text-base">{company.name}</div>
          {company.address && <div className="text-xs text-gray-500">{company.address}</div>}
          {company.phone && <div className="text-xs text-gray-500">{company.phone}</div>}
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-[#E07B3A]">BON DE TRANSPORT</div>
          <div className="font-mono text-lg font-bold">{bonNumber}</div>
          <div className="text-xs text-gray-500 mt-1">
            {new Date(list.date).toLocaleDateString("fr-FR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </div>
        </div>
      </div>

      {/* Infos */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="space-y-1">
          <div><span className="font-semibold">Chantier :</span> {list.chantier.name}</div>
          {list.chantier.address && <div className="text-xs text-gray-500">{list.chantier.address}</div>}
          <div><span className="font-semibold">Responsable :</span> {list.responsable}</div>
        </div>
        <div className="space-y-1">
          <div><span className="font-semibold">Chauffeur :</span> {list.chauffeur.name}</div>
          <div><span className="font-semibold">Départ prévu :</span> {list.departureTime}</div>
        </div>
      </div>

      {/* Tableau */}
      <table className="w-full border-collapse mb-6">
        <thead>
          <tr className="bg-[#E07B3A] text-white">
            <th className="border border-orange-300 p-2 text-left">Désignation</th>
            <th className="border border-orange-300 p-2 text-center w-24">Quantité</th>
            <th className="border border-orange-300 p-2 text-center w-20">Unité</th>
          </tr>
        </thead>
        <tbody>
          {list.items.map((item, i) => (
            <tr key={item.id} className={i % 2 === 0 ? "bg-white" : "bg-orange-50"}>
              <td className="border border-gray-200 p-2">{item.designation}</td>
              <td className="border border-gray-200 p-2 text-center font-mono">{item.quantity}</td>
              <td className="border border-gray-200 p-2 text-center">{item.unit}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {list.notes && (
        <div className="mb-6 p-3 bg-orange-50 border border-orange-200 rounded text-sm">
          <span className="font-semibold">Notes : </span>{list.notes}
        </div>
      )}

      {/* Signatures */}
      <div className="grid grid-cols-2 gap-8 mt-8">
        <div className="border-t-2 border-gray-300 pt-2">
          <div className="text-xs text-gray-500 mb-8">Signature chauffeur</div>
        </div>
        <div className="border-t-2 border-gray-300 pt-2">
          <div className="text-xs text-gray-500 mb-8">Réception chantier</div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Créer `components/documents/FicheChargement.tsx`**

```typescript
import { DocumentProps } from "@/lib/types";

export function FicheChargement({ list, company, bonNumber }: DocumentProps) {
  return (
    <div className="page-break font-sans text-sm text-gray-900 bg-white p-8">
      <div className="flex justify-between items-start mb-6 pb-4 border-b-4 border-[#059669]">
        <div>
          {company.logoUrl && <img src={company.logoUrl} alt="Logo" className="h-16 object-contain mb-2" />}
          <div className="font-bold text-base">{company.name}</div>
          {company.address && <div className="text-xs text-gray-500">{company.address}</div>}
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-[#059669]">FICHE DE CHARGEMENT</div>
          <div className="font-mono text-lg font-bold">{bonNumber}</div>
          <div className="text-xs text-gray-500 mt-1">
            {new Date(list.date).toLocaleDateString("fr-FR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="space-y-1">
          <div><span className="font-semibold">Chantier :</span> {list.chantier.name}</div>
          <div><span className="font-semibold">Responsable :</span> {list.responsable}</div>
        </div>
        <div className="space-y-1">
          <div><span className="font-semibold">Chauffeur :</span> {list.chauffeur.name}</div>
          <div><span className="font-semibold">Départ prévu :</span> {list.departureTime}</div>
        </div>
      </div>

      <table className="w-full border-collapse mb-6">
        <thead>
          <tr className="bg-[#059669] text-white">
            <th className="border border-green-300 p-2 text-center w-10">✓</th>
            <th className="border border-green-300 p-2 text-left">Désignation</th>
            <th className="border border-green-300 p-2 text-center w-24">Quantité</th>
            <th className="border border-green-300 p-2 text-center w-20">Unité</th>
            <th className="border border-green-300 p-2 text-center w-20">Chargé</th>
          </tr>
        </thead>
        <tbody>
          {list.items.map((item, i) => (
            <tr key={item.id} className={i % 2 === 0 ? "bg-white" : "bg-green-50"}>
              <td className="border border-gray-200 p-2 text-center">
                <div className="w-5 h-5 border-2 border-gray-400 mx-auto" />
              </td>
              <td className="border border-gray-200 p-2">{item.designation}</td>
              <td className="border border-gray-200 p-2 text-center font-mono">{item.quantity}</td>
              <td className="border border-gray-200 p-2 text-center">{item.unit}</td>
              <td className="border border-gray-200 p-2">
                <div className="w-5 h-5 border-2 border-gray-400 mx-auto" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {list.notes && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-sm">
          <span className="font-semibold">Notes : </span>{list.notes}
        </div>
      )}

      <div className="grid grid-cols-2 gap-8 mt-8">
        <div className="border-t-2 border-gray-300 pt-2">
          <div className="text-xs text-gray-500 mb-2">Date / heure chargement</div>
          <div className="h-8" />
        </div>
        <div className="border-t-2 border-gray-300 pt-2">
          <div className="text-xs text-gray-500 mb-8">Signature magasinier</div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Créer `components/documents/BonSuivi.tsx`**

```typescript
import { DocumentProps } from "@/lib/types";

export function BonSuivi({ list, company, bonNumber, shareUrl }: DocumentProps & { shareUrl: string }) {
  return (
    <div className="page-break font-sans text-sm text-gray-900 bg-white p-8">
      <div className="flex justify-between items-start mb-6 pb-4 border-b-4 border-[#1E3A5F]">
        <div>
          {company.logoUrl && <img src={company.logoUrl} alt="Logo" className="h-16 object-contain mb-2" />}
          <div className="font-bold text-base">{company.name}</div>
          {company.address && <div className="text-xs text-gray-500">{company.address}</div>}
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-[#1E3A5F]">BON DE SUIVI</div>
          <div className="font-mono text-lg font-bold">{bonNumber}</div>
          <div className="text-xs text-gray-500 mt-1">
            {new Date(list.date).toLocaleDateString("fr-FR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="space-y-1">
          <div><span className="font-semibold">Chantier :</span> {list.chantier.name}</div>
          <div><span className="font-semibold">Responsable :</span> {list.responsable}</div>
        </div>
        <div className="space-y-1">
          <div><span className="font-semibold">Chauffeur :</span> {list.chauffeur.name}</div>
          <div><span className="font-semibold">Départ prévu :</span> {list.departureTime}</div>
        </div>
      </div>

      <table className="w-full border-collapse mb-6">
        <thead>
          <tr className="bg-[#1E3A5F] text-white">
            <th className="border border-blue-300 p-2 text-left">Désignation</th>
            <th className="border border-blue-300 p-2 text-center w-24">Quantité</th>
            <th className="border border-blue-300 p-2 text-center w-20">Unité</th>
          </tr>
        </thead>
        <tbody>
          {list.items.map((item, i) => (
            <tr key={item.id} className={i % 2 === 0 ? "bg-white" : "bg-blue-50"}>
              <td className="border border-gray-200 p-2">{item.designation}</td>
              <td className="border border-gray-200 p-2 text-center font-mono">{item.quantity}</td>
              <td className="border border-gray-200 p-2 text-center">{item.unit}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {list.notes && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
          <span className="font-semibold">Notes : </span>{list.notes}
        </div>
      )}

      <div className="mb-6 p-3 bg-gray-50 border rounded text-xs">
        <span className="font-semibold">Lien suivi magasinier : </span>
        <span className="font-mono">{shareUrl}</span>
      </div>

      <div className="grid grid-cols-3 gap-4 mt-6">
        <div className="border-t-2 border-gray-300 pt-2">
          <div className="text-xs text-gray-500 mb-8">Date retour</div>
        </div>
        <div className="border-t-2 border-gray-300 pt-2">
          <div className="text-xs text-gray-500 mb-8">Signature bureau</div>
        </div>
        <div className="border-t-2 border-gray-300 pt-2">
          <div className="text-xs text-gray-500 mb-8">Signature client</div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Créer `components/documents/PrintButton.tsx`**

```typescript
"use client";

import { useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

interface Props {
  contentId: string;
}

export function PrintButton({ contentId }: Props) {
  const handlePrint = useReactToPrint({
    contentRef: { current: document.getElementById(contentId) as HTMLElement },
  });

  return (
    <Button
      onClick={() => handlePrint()}
      className="bg-[#E07B3A] hover:bg-[#c96a2a]"
      size="lg"
    >
      <Printer className="h-5 w-5 mr-2" />
      Imprimer les 3 bons
    </Button>
  );
}
```

- [ ] **Step 7: Créer `app/(dashboard)/lists/[id]/print/page.tsx`**

```typescript
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { BonTransport } from "@/components/documents/BonTransport";
import { FicheChargement } from "@/components/documents/FicheChargement";
import { BonSuivi } from "@/components/documents/BonSuivi";
import { PrintButton } from "@/components/documents/PrintButton";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Copy } from "lucide-react";

function getBonNumber(list: { createdAt: Date }, index: number): string {
  const year = list.createdAt.getFullYear();
  return `BT-${year}-${String(index).padStart(4, "0")}`;
}

export default async function PrintPage({ params }: { params: { id: string } }) {
  const list = await prisma.loadingList.findUnique({
    where: { id: params.id },
    include: { chantier: true, chauffeur: true, items: { orderBy: { order: "asc" } } },
  });

  if (!list) notFound();

  const company = await prisma.companySettings.findUnique({ where: { id: "singleton" } }) ?? {
    id: "singleton", name: "Mon Entreprise", logoUrl: null, address: null, phone: null,
  };

  const yearStart = new Date(`${list.createdAt.getFullYear()}-01-01`);
  const index = await prisma.loadingList.count({
    where: { createdAt: { gte: yearStart, lte: list.createdAt } },
  });

  const bonNumber = getBonNumber(list, index);
  const shareUrl = `${process.env.NEXTAUTH_URL}/check/${list.shareToken}`;

  return (
    <div>
      {/* Barre d'actions (masquée à l'impression) */}
      <div className="print:hidden flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[#3D4A5C]">Aperçu des documents — {bonNumber}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Chantier : {list.chantier.name} · Chauffeur : {list.chauffeur.name}
          </p>
        </div>
        <div className="flex gap-3 items-center">
          <div className="flex items-center gap-2 text-sm text-muted-foreground border rounded px-3 py-2">
            <span className="font-mono text-xs truncate max-w-48">{shareUrl}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => navigator.clipboard.writeText(shareUrl)}
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>
          <Button variant="outline" asChild>
            <Link href={`/lists/${list.id}`}>← Modifier</Link>
          </Button>
          <PrintButton contentId="print-area" />
        </div>
      </div>

      {/* Zone d'impression */}
      <div id="print-area" className="space-y-8 print:space-y-0">
        <BonTransport list={list} company={company} bonNumber={bonNumber} />
        <FicheChargement list={list} company={company} bonNumber={bonNumber} />
        <BonSuivi list={list} company={company} bonNumber={bonNumber} shareUrl={shareUrl} />
      </div>
    </div>
  );
}
```

- [ ] **Step 8: Tester l'impression**

```bash
npm run dev
# Créer une liste → "Générer les 3 documents"
# Vérifier que les 3 bons s'affichent avec les bonnes couleurs
# Cliquer "Imprimer" → dialog navigateur avec 3 pages A4
```

- [ ] **Step 9: Commit**

```bash
git add components/documents/ app/\(dashboard\)/lists/\[id\]/print/ lib/types.ts
git commit -m "feat: printable documents with CSS print layout"
```

---

## Task 8: Page édition liste (`/lists/[id]`)

**Files:**
- Create: `app/(dashboard)/lists/[id]/page.tsx`

- [ ] **Step 1: Créer `app/(dashboard)/lists/[id]/page.tsx`**

```typescript
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { ListForm } from "@/components/lists/ListForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Brouillon", GENERATED: "Générée", LOADED: "Chargée", DELIVERED: "Livrée",
};
const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  DRAFT: "secondary", GENERATED: "default", LOADED: "outline", DELIVERED: "default",
};

export default async function ListDetailPage({ params }: { params: { id: string } }) {
  const list = await prisma.loadingList.findUnique({
    where: { id: params.id },
    include: { chantier: true, chauffeur: true, items: { orderBy: { order: "asc" } } },
  });

  if (!list) notFound();

  const [chantiers, chauffeurs] = await Promise.all([
    prisma.chantier.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.chauffeur.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-[#3D4A5C]">Liste de chargement</h1>
          <Badge variant={STATUS_VARIANTS[list.status]}>{STATUS_LABELS[list.status]}</Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/lists/${list.id}/print`}>Voir les documents</Link>
          </Button>
        </div>
      </div>
      <ListForm
        chantiers={chantiers}
        chauffeurs={chauffeurs}
        defaultValues={{
          chantierId: list.chantierId,
          chauffeurId: list.chauffeurId,
          date: list.date.toISOString().split("T")[0],
          departureTime: list.departureTime,
          responsable: list.responsable,
          notes: list.notes ?? "",
          items: list.items.map((i) => ({
            id: i.id,
            designation: i.designation,
            quantity: i.quantity,
            unit: i.unit,
            materiauId: i.materiauId ?? undefined,
          })),
        }}
        listId={list.id}
      />
    </div>
  );
}
```

- [ ] **Step 2: Mettre à jour `ListForm` pour supporter l'édition**

Ajouter les props `defaultValues` et `listId` à l'interface `Props` dans `components/lists/ListForm.tsx` :

```typescript
interface DefaultValues {
  chantierId: string;
  chauffeurId: string;
  date: string;
  departureTime: string;
  responsable: string;
  notes: string;
  items: ItemRow[];
}

interface Props {
  chantiers: Chantier[];
  chauffeurs: Chauffeur[];
  defaultValues?: DefaultValues;
  listId?: string;
}
```

Dans le composant, initialiser les états avec `defaultValues` :
```typescript
const [items, setItems] = useState<ItemRow[]>(defaultValues?.items ?? []);
```

Et dans le `handleSubmit`, si `listId` existe, appeler `updateList` :
```typescript
import { updateList } from "@/lib/actions/lists";

async function handleSubmit(e: React.FormEvent<HTMLFormElement>, generate: boolean) {
  e.preventDefault();
  const formData = new FormData(e.currentTarget);
  formData.set("itemsJson", JSON.stringify(items));

  startTransition(async () => {
    if (listId) {
      await updateList(listId, formData);
      if (generate) router.push(`/lists/${listId}/print`);
    } else {
      await createList(formData, generate);
    }
  });
}
```

Mettre à jour `updateList` dans `lib/actions/lists.ts` pour traiter aussi `itemsJson` :

```typescript
export async function updateList(id: string, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non authentifié");

  const itemsJson = formData.get("itemsJson") as string;
  const items: ItemRow[] = itemsJson ? JSON.parse(itemsJson) : [];

  await prisma.$transaction([
    prisma.loadingListItem.deleteMany({ where: { listId: id } }),
    prisma.loadingList.update({
      where: { id },
      data: {
        date: new Date(formData.get("date") as string),
        departureTime: formData.get("departureTime") as string,
        chantierId: formData.get("chantierId") as string,
        chauffeurId: formData.get("chauffeurId") as string,
        responsable: formData.get("responsable") as string,
        notes: (formData.get("notes") as string) || null,
        items: {
          create: items.map((item, index) => ({
            designation: item.designation,
            quantity: item.quantity,
            unit: item.unit,
            materiauId: item.materiauId || null,
            order: index,
          })),
        },
      },
    }),
  ]);

  revalidatePath(`/lists/${id}`);
  revalidatePath("/history");
}
```

- [ ] **Step 3: Commit**

```bash
git add app/\(dashboard\)/lists/\[id\]/ components/lists/ListForm.tsx lib/actions/lists.ts
git commit -m "feat: list edit page with pre-populated form"
```

---

## Task 9: Historique (`/history`)

**Files:**
- Create: `app/(dashboard)/history/page.tsx`

- [ ] **Step 1: Créer `app/(dashboard)/history/page.tsx`**

```typescript
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { duplicateList, deleteList, updateListStatus } from "@/lib/actions/lists";
import { ListStatus } from "@prisma/client";

const STATUS_LABELS: Record<ListStatus, string> = {
  DRAFT: "Brouillon", GENERATED: "Générée", LOADED: "Chargée", DELIVERED: "Livrée",
};

const NEXT_STATUS: Partial<Record<ListStatus, ListStatus>> = {
  DRAFT: "GENERATED", GENERATED: "LOADED", LOADED: "DELIVERED",
};

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string; page?: string };
}) {
  const page = parseInt(searchParams.page ?? "1");
  const perPage = 20;
  const q = searchParams.q ?? "";
  const statusFilter = searchParams.status as ListStatus | undefined;

  const where = {
    AND: [
      q
        ? {
            OR: [
              { chantier: { name: { contains: q, mode: "insensitive" as const } } },
              { chauffeur: { name: { contains: q, mode: "insensitive" as const } } },
            ],
          }
        : {},
      statusFilter ? { status: statusFilter } : {},
    ],
  };

  const [lists, total] = await Promise.all([
    prisma.loadingList.findMany({
      where,
      include: { chantier: true, chauffeur: true, _count: { select: { items: true } } },
      orderBy: { date: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.loadingList.count({ where }),
  ]);

  const totalPages = Math.ceil(total / perPage);

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#3D4A5C] mb-6">Historique des chargements</h1>

      <form className="flex gap-3 mb-6">
        <Input name="q" defaultValue={q} placeholder="Rechercher chantier, chauffeur…" className="max-w-xs" />
        <select name="status" defaultValue={statusFilter ?? ""} className="border rounded px-3 py-2 text-sm">
          <option value="">Tous les statuts</option>
          {(Object.keys(STATUS_LABELS) as ListStatus[]).map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
        <Button type="submit" variant="outline">Filtrer</Button>
      </form>

      <div className="border rounded-md overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="p-3 text-left">Date</th>
              <th className="p-3 text-left">Chantier</th>
              <th className="p-3 text-left">Chauffeur</th>
              <th className="p-3 text-center">Articles</th>
              <th className="p-3 text-left">Statut</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {lists.map((list) => (
              <tr key={list.id} className="border-t hover:bg-muted/20">
                <td className="p-3 font-mono text-xs">
                  {new Date(list.date).toLocaleDateString("fr-FR")}
                </td>
                <td className="p-3 font-medium">{list.chantier.name}</td>
                <td className="p-3">{list.chauffeur.name}</td>
                <td className="p-3 text-center">{list._count.items}</td>
                <td className="p-3">
                  <Badge variant="outline">{STATUS_LABELS[list.status]}</Badge>
                </td>
                <td className="p-3">
                  <div className="flex gap-1 justify-end">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/lists/${list.id}`}>Voir</Link>
                    </Button>
                    <form action={duplicateList.bind(null, list.id)}>
                      <Button variant="ghost" size="sm" type="submit">Dupliquer</Button>
                    </form>
                    {NEXT_STATUS[list.status] && (
                      <form action={updateListStatus.bind(null, list.id, NEXT_STATUS[list.status]!)}>
                        <Button variant="ghost" size="sm" type="submit" className="text-[#E07B3A]">
                          → {STATUS_LABELS[NEXT_STATUS[list.status]!]}
                        </Button>
                      </form>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {lists.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-muted-foreground">
                  Aucune liste trouvée
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex gap-2 mt-4 justify-center">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Button
              key={p}
              variant={p === page ? "default" : "outline"}
              size="sm"
              asChild
            >
              <Link href={`/history?q=${q}&status=${statusFilter ?? ""}&page=${p}`}>{p}</Link>
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Tester**

```bash
npm run dev
# http://localhost:3000/history
# Créer quelques listes → vérifier qu'elles apparaissent
# Tester le filtre texte et le filtre statut
# Tester "Dupliquer"
```

- [ ] **Step 3: Commit**

```bash
git add app/\(dashboard\)/history/
git commit -m "feat: history page with filters, pagination, status management"
```

---

## Task 10: Catalogue (`/catalogue`)

**Files:**
- Create: `app/(dashboard)/catalogue/page.tsx`

- [ ] **Step 1: Créer `app/(dashboard)/catalogue/page.tsx`**

```typescript
import { prisma } from "@/lib/prisma";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  createChantier, updateChantier, toggleChantierActive,
  createChauffeur, updateChauffeur, toggleChauffeurActive,
  createMateriau, updateMateriau, toggleMateriauActive,
} from "@/lib/actions/catalogue";
import { Unit } from "@prisma/client";

const UNITS: Unit[] = ["U", "M", "M2", "M3", "KG", "T", "L", "ROULEAU", "SAC", "PALETTE"];

export default async function CataloguePage() {
  const [chantiers, chauffeurs, materiaux] = await Promise.all([
    prisma.chantier.findMany({ orderBy: { name: "asc" } }),
    prisma.chauffeur.findMany({ orderBy: { name: "asc" } }),
    prisma.materiau.findMany({ orderBy: { designation: "asc" } }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#3D4A5C] mb-6">Catalogue</h1>

      <Tabs defaultValue="materiaux">
        <TabsList>
          <TabsTrigger value="materiaux">Matériaux ({materiaux.length})</TabsTrigger>
          <TabsTrigger value="chantiers">Chantiers ({chantiers.length})</TabsTrigger>
          <TabsTrigger value="chauffeurs">Chauffeurs ({chauffeurs.length})</TabsTrigger>
        </TabsList>

        {/* Matériaux */}
        <TabsContent value="materiaux" className="space-y-4 mt-4">
          <form action={async (fd) => { "use server"; await createMateriau({ designation: fd.get("designation") as string, defaultUnit: fd.get("defaultUnit") as Unit }); }} className="flex gap-2">
            <Input name="designation" placeholder="Désignation" required className="max-w-xs" />
            <select name="defaultUnit" className="border rounded px-3 py-2 text-sm" required>
              {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
            <Button type="submit" className="bg-[#E07B3A] hover:bg-[#c96a2a]">Ajouter</Button>
          </form>
          <div className="border rounded-md overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-3 text-left">Désignation</th>
                  <th className="p-3 text-left w-28">Unité défaut</th>
                  <th className="p-3 text-center w-20">Statut</th>
                  <th className="p-3 w-20" />
                </tr>
              </thead>
              <tbody>
                {materiaux.map((m) => (
                  <tr key={m.id} className="border-t">
                    <td className="p-3">{m.designation}</td>
                    <td className="p-3">{m.defaultUnit}</td>
                    <td className="p-3 text-center">
                      <Badge variant={m.active ? "default" : "secondary"}>{m.active ? "Actif" : "Inactif"}</Badge>
                    </td>
                    <td className="p-3">
                      <form action={toggleMateriauActive.bind(null, m.id, !m.active)}>
                        <Button variant="ghost" size="sm" type="submit">
                          {m.active ? "Désactiver" : "Activer"}
                        </Button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* Chantiers */}
        <TabsContent value="chantiers" className="space-y-4 mt-4">
          <form action={async (fd) => { "use server"; await createChantier({ name: fd.get("name") as string, address: fd.get("address") as string || undefined }); }} className="flex gap-2">
            <Input name="name" placeholder="Nom du chantier" required className="max-w-xs" />
            <Input name="address" placeholder="Adresse (optionnel)" className="max-w-xs" />
            <Button type="submit" className="bg-[#E07B3A] hover:bg-[#c96a2a]">Ajouter</Button>
          </form>
          <div className="border rounded-md overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-3 text-left">Nom</th>
                  <th className="p-3 text-left">Adresse</th>
                  <th className="p-3 text-center w-20">Statut</th>
                  <th className="p-3 w-20" />
                </tr>
              </thead>
              <tbody>
                {chantiers.map((c) => (
                  <tr key={c.id} className="border-t">
                    <td className="p-3 font-medium">{c.name}</td>
                    <td className="p-3 text-muted-foreground">{c.address ?? "—"}</td>
                    <td className="p-3 text-center">
                      <Badge variant={c.active ? "default" : "secondary"}>{c.active ? "Actif" : "Inactif"}</Badge>
                    </td>
                    <td className="p-3">
                      <form action={toggleChantierActive.bind(null, c.id, !c.active)}>
                        <Button variant="ghost" size="sm" type="submit">
                          {c.active ? "Désactiver" : "Activer"}
                        </Button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* Chauffeurs */}
        <TabsContent value="chauffeurs" className="space-y-4 mt-4">
          <form action={async (fd) => { "use server"; await createChauffeur({ name: fd.get("name") as string, phone: fd.get("phone") as string || undefined }); }} className="flex gap-2">
            <Input name="name" placeholder="Nom du chauffeur" required className="max-w-xs" />
            <Input name="phone" placeholder="Téléphone (optionnel)" className="max-w-xs" />
            <Button type="submit" className="bg-[#E07B3A] hover:bg-[#c96a2a]">Ajouter</Button>
          </form>
          <div className="border rounded-md overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-3 text-left">Nom</th>
                  <th className="p-3 text-left">Téléphone</th>
                  <th className="p-3 text-center w-20">Statut</th>
                  <th className="p-3 w-20" />
                </tr>
              </thead>
              <tbody>
                {chauffeurs.map((c) => (
                  <tr key={c.id} className="border-t">
                    <td className="p-3 font-medium">{c.name}</td>
                    <td className="p-3 text-muted-foreground">{c.phone ?? "—"}</td>
                    <td className="p-3 text-center">
                      <Badge variant={c.active ? "default" : "secondary"}>{c.active ? "Actif" : "Inactif"}</Badge>
                    </td>
                    <td className="p-3">
                      <form action={toggleChauffeurActive.bind(null, c.id, !c.active)}>
                        <Button variant="ghost" size="sm" type="submit">
                          {c.active ? "Désactiver" : "Activer"}
                        </Button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/\(dashboard\)/catalogue/
git commit -m "feat: catalogue management for materials, sites, drivers"
```

---

## Task 11: Paramètres (`/settings`) + upload logo

**Files:**
- Create: `app/(dashboard)/settings/page.tsx`, `app/api/upload/route.ts`

- [ ] **Step 1: Créer `app/api/upload/route.ts`**

```typescript
import { put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file") as File;

  if (!file || !file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Fichier invalide" }, { status: 400 });
  }

  const blob = await put(`logos/${Date.now()}-${file.name}`, file, {
    access: "public",
    contentType: file.type,
  });

  return NextResponse.json({ url: blob.url });
}
```

- [ ] **Step 2: Créer `app/(dashboard)/settings/page.tsx`**

```typescript
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { SettingsForm } from "@/components/settings/SettingsForm";
import { UsersTable } from "@/components/settings/UsersTable";

export default async function SettingsPage() {
  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN";

  const [company, users] = await Promise.all([
    prisma.companySettings.findUnique({ where: { id: "singleton" } }),
    isAdmin ? prisma.user.findMany({ orderBy: { name: "asc" } }) : Promise.resolve([]),
  ]);

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#3D4A5C] mb-6">Paramètres</h1>
        <SettingsForm company={company} />
      </div>
      {isAdmin && (
        <div>
          <h2 className="text-xl font-semibold text-[#3D4A5C] mb-4">Utilisateurs</h2>
          <UsersTable users={users} />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Créer `components/settings/SettingsForm.tsx`**

```typescript
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateCompanySettings } from "@/lib/actions/settings";
import { CompanySettings } from "@prisma/client";

interface Props {
  company: CompanySettings | null;
}

export function SettingsForm({ company }: Props) {
  const [logoUrl, setLogoUrl] = useState(company?.logoUrl ?? "");
  const [uploading, setUploading] = useState(false);

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const { url } = await res.json();
    setLogoUrl(url);
    setUploading(false);
  }

  return (
    <form
      action={async (fd) => {
        "use server";
        await updateCompanySettings({
          name: fd.get("name") as string,
          address: (fd.get("address") as string) || undefined,
          phone: (fd.get("phone") as string) || undefined,
          logoUrl: (fd.get("logoUrl") as string) || undefined,
        });
      }}
      className="space-y-4"
    >
      <input type="hidden" name="logoUrl" value={logoUrl} />

      <div className="space-y-2">
        <Label>Nom de l'entreprise</Label>
        <Input name="name" defaultValue={company?.name ?? ""} required />
      </div>
      <div className="space-y-2">
        <Label>Adresse</Label>
        <Input name="address" defaultValue={company?.address ?? ""} />
      </div>
      <div className="space-y-2">
        <Label>Téléphone</Label>
        <Input name="phone" defaultValue={company?.phone ?? ""} />
      </div>
      <div className="space-y-2">
        <Label>Logo</Label>
        <div className="flex items-center gap-4">
          {logoUrl && (
            <img src={logoUrl} alt="Logo" className="h-16 object-contain border rounded p-1" />
          )}
          <Input type="file" accept="image/*" onChange={handleLogoUpload} disabled={uploading} />
        </div>
        {uploading && <p className="text-sm text-muted-foreground">Upload en cours…</p>}
      </div>
      <Button type="submit" className="bg-[#E07B3A] hover:bg-[#c96a2a]">
        Enregistrer
      </Button>
    </form>
  );
}
```

- [ ] **Step 4: Créer `components/settings/UsersTable.tsx`**

```typescript
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { createUser, updateUserRole } from "@/lib/actions/settings";
import { User, Role } from "@prisma/client";

export function UsersTable({ users }: { users: User[] }) {
  return (
    <div className="space-y-4">
      <form
        action={async (fd) => {
          "use server";
          await createUser({
            name: fd.get("name") as string,
            email: fd.get("email") as string,
            password: fd.get("password") as string,
            role: fd.get("role") as Role,
          });
        }}
        className="flex gap-2"
      >
        <Input name="name" placeholder="Nom" required className="max-w-36" />
        <Input name="email" type="email" placeholder="Email" required className="max-w-48" />
        <Input name="password" type="password" placeholder="Mot de passe" required className="max-w-36" />
        <select name="role" className="border rounded px-3 py-2 text-sm">
          <option value="BUREAU">Bureau</option>
          <option value="ADMIN">Admin</option>
        </select>
        <Button type="submit" variant="outline">Ajouter</Button>
      </form>

      <div className="border rounded-md overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="p-3 text-left">Nom</th>
              <th className="p-3 text-left">Email</th>
              <th className="p-3 text-left">Rôle</th>
              <th className="p-3 w-20" />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t">
                <td className="p-3 font-medium">{u.name}</td>
                <td className="p-3 text-muted-foreground">{u.email}</td>
                <td className="p-3">
                  <Badge variant={u.role === "ADMIN" ? "default" : "secondary"}>
                    {u.role === "ADMIN" ? "Admin" : "Bureau"}
                  </Badge>
                </td>
                <td className="p-3">
                  <form action={updateUserRole.bind(null, u.id, u.role === "ADMIN" ? "BUREAU" : "ADMIN")}>
                    <Button variant="ghost" size="sm" type="submit">
                      → {u.role === "ADMIN" ? "Bureau" : "Admin"}
                    </Button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add app/\(dashboard\)/settings/ app/api/upload/ components/settings/
git commit -m "feat: settings page with logo upload and user management"
```

---

## Task 12: Fiche magasinier (`/check/[token]`)

**Files:**
- Create: `app/check/[token]/page.tsx`, `components/check/ChecklistView.tsx`

- [ ] **Step 1: Créer `components/check/ChecklistView.tsx`**

```typescript
"use client";

import { useState, useTransition } from "react";
import { toggleItem } from "@/lib/actions/items";
import { CheckCircle2, Circle } from "lucide-react";

interface Item {
  id: string;
  designation: string;
  quantity: number;
  unit: string;
  checked: boolean;
}

interface Props {
  items: Item[];
  listId: string;
}

export function ChecklistView({ items: initialItems, listId }: Props) {
  const [items, setItems] = useState(initialItems);
  const [, startTransition] = useTransition();

  function handleToggle(itemId: string, checked: boolean) {
    setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, checked } : i)));
    startTransition(() => toggleItem(itemId, listId, checked));
  }

  const checkedCount = items.filter((i) => i.checked).length;
  const allChecked = checkedCount === items.length && items.length > 0;

  return (
    <div className="space-y-4">
      {/* Barre de progression */}
      <div className="space-y-1">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>{checkedCount} / {items.length} articles chargés</span>
          <span>{Math.round((checkedCount / items.length) * 100)}%</span>
        </div>
        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#059669] transition-all duration-300"
            style={{ width: `${(checkedCount / items.length) * 100}%` }}
          />
        </div>
      </div>

      {allChecked && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center text-green-800 font-semibold">
          ✓ Chargement complet !
        </div>
      )}

      {/* Liste des items */}
      <div className="space-y-2">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => handleToggle(item.id, !item.checked)}
            className={`w-full flex items-center gap-4 p-4 rounded-lg border-2 text-left transition-colors ${
              item.checked
                ? "bg-green-50 border-green-300 text-green-800"
                : "bg-white border-gray-200 hover:border-gray-300"
            }`}
          >
            {item.checked ? (
              <CheckCircle2 className="h-6 w-6 text-green-600 shrink-0" />
            ) : (
              <Circle className="h-6 w-6 text-gray-400 shrink-0" />
            )}
            <div className="flex-1">
              <div className={`font-medium ${item.checked ? "line-through" : ""}`}>
                {item.designation}
              </div>
              <div className="text-sm text-muted-foreground font-mono">
                {item.quantity} {item.unit}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Créer `app/check/[token]/page.tsx`**

```typescript
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { ChecklistView } from "@/components/check/ChecklistView";
import { Truck } from "lucide-react";

export default async function CheckPage({ params }: { params: { token: string } }) {
  const list = await prisma.loadingList.findUnique({
    where: { shareToken: params.token },
    include: {
      chantier: true,
      chauffeur: true,
      items: { orderBy: { order: "asc" } },
    },
  });

  if (!list) notFound();

  return (
    <div className="min-h-screen bg-[#F8F7F4]">
      {/* Header */}
      <div className="bg-[#3D4A5C] text-white p-4">
        <div className="max-w-lg mx-auto flex items-center gap-2">
          <Truck className="h-5 w-5 text-[#E07B3A]" />
          <span className="font-bold">CamioLoad</span>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Infos chantier */}
        <div className="bg-white rounded-lg border p-4 space-y-2">
          <div className="text-lg font-bold text-[#3D4A5C]">{list.chantier.name}</div>
          <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
            <div><span className="font-medium text-foreground">Chauffeur :</span> {list.chauffeur.name}</div>
            <div><span className="font-medium text-foreground">Départ :</span> {list.departureTime}</div>
            <div>
              <span className="font-medium text-foreground">Date :</span>{" "}
              {new Date(list.date).toLocaleDateString("fr-FR")}
            </div>
          </div>
          {list.notes && (
            <div className="text-sm bg-amber-50 border border-amber-200 rounded p-2 mt-2">
              {list.notes}
            </div>
          )}
        </div>

        {/* Checklist interactive */}
        <ChecklistView
          items={list.items}
          listId={list.id}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Tester la fiche magasinier**

```bash
npm run dev
# Créer une liste → copier le lien magasinier depuis /print
# Ouvrir le lien en navigation privée (sans auth)
# Doit afficher la liste + permettre de cocher les items
# Vérifier la barre de progression
# Tout cocher → bannière "Chargement complet"
```

- [ ] **Step 4: Commit**

```bash
git add app/check/ components/check/
git commit -m "feat: public checklist page for warehouse worker"
```

---

## Task 13: Configuration `next.config.ts` + variables env

**Files:**
- Modify: `next.config.ts`

- [ ] **Step 1: Mettre à jour `next.config.ts`**

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
  },
};

export default nextConfig;
```

- [ ] **Step 2: Vérifier que toutes les variables d'env sont documentées dans `.env.local.example`**

Le fichier doit contenir :
```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DB?pgbouncer=true"
DIRECT_URL="postgresql://USER:PASSWORD@HOST:5432/DB"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_..."
```

- [ ] **Step 3: Vérifier `.gitignore` contient `.env.local`**

```bash
grep ".env.local" .gitignore || echo ".env.local" >> .gitignore
```

- [ ] **Step 4: Commit**

```bash
git add next.config.ts .env.local.example .gitignore
git commit -m "chore: next.config image domains and env documentation"
```

---

## Task 14: Test E2E — flux complet

- [ ] **Step 1: Démarrer l'app**

```bash
npm run dev
```

- [ ] **Step 2: Vérifier la redirection non-auth**

Naviguer vers `http://localhost:3000` sans être connecté → doit rediriger vers `/login`.

- [ ] **Step 3: Connexion admin**

Email: `admin@camioload.fr` / Mot de passe: `admin123` → doit atterrir sur `/lists/new`.

- [ ] **Step 4: Créer une liste complète**

1. Sélectionner un chantier et un chauffeur
2. Définir une date et heure
3. Remplir le responsable
4. Chercher "Ciment" dans le catalogue → ajouter
5. Ajouter "Blocs béton" via catalogue
6. Ajouter une ligne libre "Outillage divers" → quantité 1 → unité U
7. Réordonner les lignes via drag-and-drop
8. Cliquer "Générer les 3 documents →"
9. Vérifier redirection vers `/lists/[id]/print`

- [ ] **Step 5: Vérifier les 3 documents**

1. ① Bon de transport : accent orange, tableau avec désignation/quantité/unité, 2 zones signature
2. ② Fiche chargement : accent vert, colonnes ✓ et Chargé en plus
3. ③ Bon de suivi : accent bleu marine, lien magasinier visible

- [ ] **Step 6: Tester l'impression**

Cliquer "Imprimer les 3 bons" → dialog navigateur → aperçu 3 pages A4 séparées.

- [ ] **Step 7: Tester la fiche magasinier**

1. Copier le lien magasinier depuis la page print
2. Ouvrir en navigation privée
3. Cocher tous les items un par un
4. Vérifier la barre de progression
5. Quand tout est coché → "Chargement complet ✓"

- [ ] **Step 8: Tester l'historique**

`/history` → la liste créée apparaît avec statut "Chargée" (après avoir tout coché) → dupliquer → vérifier nouvelle liste DRAFT créée.

- [ ] **Step 9: Tester le catalogue**

`/catalogue` → ajouter un matériau "Test béton" → vérifier qu'il apparaît dans la recherche de la nouvelle liste.

- [ ] **Step 10: Tester les paramètres**

`/settings` → changer le nom entreprise → vérifier qu'il apparaît dans les documents.

- [ ] **Step 11: Commit final**

```bash
git add -A
git commit -m "chore: complete CamioLoad v1 implementation"
```

---

## Self-Review

**Spec coverage check :**
- ✅ Auth CredentialsProvider NextAuth v5 (Task 3)
- ✅ Nouvelle liste avec DnD, catalog search (Task 6)
- ✅ Édition liste (Task 8)
- ✅ 3 documents imprimables (Task 7)
- ✅ Fiche magasinier publique + toggleItem (Task 12)
- ✅ Historique paginé + filtres + dupliquer + changer statut (Task 9)
- ✅ Catalogue CRUD avec soft delete (Task 10)
- ✅ Settings + upload logo + gestion users (Task 11)
- ✅ Seed (Task 2)
- ✅ Numérotation BT-YYYY-NNNN (Tasks 5 & 7)
- ✅ shareToken auto-généré (schema Prisma, Task 2)
- ✅ CompanySettings singleton (Task 2 & 11)
- ✅ Statut LOADED auto quand tous items cochés (Task 5 items.ts)
- ✅ CSS @media print page-break (Task 7)
- ✅ Vercel Blob upload logo (Task 11)
- ✅ DIRECT_URL Prisma (Task 2 schema)
- ✅ Middleware Next.js redirect (Task 3)
- ✅ Palette couleurs (#F8F7F4, #3D4A5C, #E07B3A) (Tasks 3, 4, 6)

**Types consistency :** `ItemRow` défini dans `ItemsTable.tsx`, importé dans `lists.ts` — cohérent. `FullLoadingList` dans `lib/types.ts` utilisé par les 3 documents — cohérent. `DocumentProps` utilisé partout avec les mêmes champs.

**Placeholders :** Aucun TBD, TODO, ou implémentation manquante.
