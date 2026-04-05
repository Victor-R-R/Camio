# Camio

Application web interne de gestion des listes de chargement.

## Stack

- Next.js 16, TypeScript, Tailwind CSS, shadcn/ui
- Prisma 7 + PostgreSQL
- NextAuth v5 (credentials)
- @dnd-kit, react-to-print, @vercel/blob

## Démarrage

```bash
cp .env.local.example .env.local
# Remplir les variables d'env

npx prisma migrate dev
npx prisma db seed
npm run dev
```
