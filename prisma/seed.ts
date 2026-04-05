import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Role, Unit } from "../lib/generated/prisma/client";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

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
