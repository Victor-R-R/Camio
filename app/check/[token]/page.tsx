import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { ChecklistView } from "@/components/check/ChecklistView";
import { Truck } from "lucide-react";

export default async function CheckPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const list = await prisma.loadingList.findUnique({
    where: { shareToken: token },
    include: {
      chantier: true,
      chauffeur: true,
      items: { orderBy: { order: "asc" } },
    },
  });

  if (!list) notFound();

  return (
    <div className="min-h-screen bg-[#F8F7F4]">
      <div className="bg-[#3D4A5C] text-white p-4">
        <div className="max-w-lg mx-auto flex items-center gap-2">
          <Truck className="h-5 w-5 text-[#E07B3A]" />
          <span className="font-bold">Camio</span>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">
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

        <ChecklistView
          items={list.items.map((i) => ({
            id: i.id,
            designation: i.designation,
            quantity: i.quantity,
            unit: i.unit as string,
            checked: i.checked,
          }))}
          listId={list.id}
        />
      </div>
    </div>
  );
}
