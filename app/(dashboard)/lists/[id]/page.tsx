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

export default async function ListDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const list = await prisma.loadingList.findUnique({
    where: { id },
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
            unit: i.unit as string,
            materiauId: i.materiauId ?? undefined,
          })),
        }}
        listId={list.id}
      />
    </div>
  );
}
