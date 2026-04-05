import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { duplicateList, updateListStatus } from "@/lib/actions/lists";
import { DeleteListButton } from "@/components/lists/DeleteListButton";
import { ListStatus } from "@/lib/generated/prisma/enums";

const STATUS_LABELS: Record<ListStatus, string> = {
  DRAFT: "Brouillon", GENERATED: "Générée", LOADED: "Chargée", DELIVERED: "Livrée",
};

const NEXT_STATUS: Partial<Record<ListStatus, ListStatus>> = {
  DRAFT: ListStatus.GENERATED,
  GENERATED: ListStatus.LOADED,
  LOADED: ListStatus.DELIVERED,
};

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const { q: qParam, status: statusParam, page: pageParam } = await searchParams;

  const page = parseInt(pageParam ?? "1");
  const perPage = 20;
  const q = qParam ?? "";
  const statusFilter = statusParam as ListStatus | undefined;

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
      statusFilter && Object.values(ListStatus).includes(statusFilter) ? { status: statusFilter } : {},
    ],
  };

  const [lists, total] = await Promise.all([
    prisma.loadingList.findMany({
      where,
      include: {
        chantier: true,
        chauffeur: true,
        items: { select: { checked: true } },
      },
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

      <div className="border rounded-md overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead className="bg-muted/50">
            <tr>
              <th className="p-3 text-left">Date</th>
              <th className="p-3 text-left">Chantier</th>
              <th className="p-3 text-left">Chauffeur</th>
              <th className="p-3 text-center">Chargement</th>
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
                <td className="p-3 text-center">
                  {(() => {
                    const total = list.items.length;
                    const checked = list.items.filter((i) => i.checked).length;
                    if (total === 0) return <span className="text-muted-foreground">—</span>;
                    if (checked === total)
                      return (
                        <span className="inline-flex items-center gap-1 text-green-700 font-medium">
                          <span>✓</span> {total}/{total}
                        </span>
                      );
                    return (
                      <span className="text-amber-600">
                        {checked}/{total}
                      </span>
                    );
                  })()}
                </td>
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
                    <DeleteListButton id={list.id} />
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
