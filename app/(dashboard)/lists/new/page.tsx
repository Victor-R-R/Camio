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
