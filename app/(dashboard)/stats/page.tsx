import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ListStatus } from "@/lib/generated/prisma/enums";
import type { StatsRow } from "@/lib/types";
import { StatsFilters } from "@/components/stats/stats-filters";
import { StatsTable } from "@/components/stats/stats-table";

type SearchParams = Promise<{
  chantierId?: string;
  materiauId?: string;
  periode?: string;
}>;

export default async function StatsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { chantierId, materiauId, periode } = await searchParams;

  // Compute date filter for period
  const now = new Date();
  let dateFrom: Date | undefined;
  if (periode === "month")
    dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  else if (periode === "3months")
    dateFrom = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  else if (periode === "6months")
    dateFrom = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);

  // Always compute 4-week window for projection cadence (independent of UI filter)
  const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);

  const chantierWhere = chantierId ? { chantierId } : {};
  const materiauWhere = materiauId ? { materiauId } : {};

  const [allocations, allConsommations, transportedItems, chantiers, materiaux] =
    await Promise.all([
      prisma.allocation.findMany({
        where: { ...chantierWhere, ...materiauWhere },
        include: { chantier: true, materiau: true },
      }),
      prisma.consommationEntry.findMany({
        where: { ...chantierWhere, ...materiauWhere },
        include: { chantier: true, materiau: true },
      }),
      prisma.loadingListItem.findMany({
        where: {
          materiauId: materiauId ? materiauId : { not: null },
          list: {
            status: ListStatus.DELIVERED,
            ...chantierWhere,
            ...(dateFrom ? { date: { gte: dateFrom } } : {}),
          },
        },
        include: {
          list: { include: { chantier: true } },
          materiau: true,
        },
      }),
      prisma.chantier.findMany({
        where: { active: true },
        orderBy: { name: "asc" },
      }),
      prisma.materiau.findMany({
        where: { active: true },
        orderBy: { designation: "asc" },
      }),
    ]);

  // Build rows map keyed by `chantierId|materiauId`
  type RowAccumulator = {
    chantierId: string;
    chantierName: string;
    materiauId: string;
    materiauDesignation: string;
    unit: string;
    alloue: number | null;
    transporte: number;
    consommeEntries: { date: Date; quantity: number }[];
  };

  const rowsMap = new Map<string, RowAccumulator>();

  function getOrCreate(
    cId: string,
    cName: string,
    mId: string,
    mDesig: string,
    unit: string
  ): RowAccumulator {
    const key = `${cId}|${mId}`;
    if (!rowsMap.has(key)) {
      rowsMap.set(key, {
        chantierId: cId,
        chantierName: cName,
        materiauId: mId,
        materiauDesignation: mDesig,
        unit,
        alloue: null,
        transporte: 0,
        consommeEntries: [],
      });
    }
    return rowsMap.get(key)!;
  }

  // Populate from allocations
  for (const a of allocations) {
    const row = getOrCreate(
      a.chantierId,
      a.chantier.name,
      a.materiauId,
      a.materiau.designation,
      a.unit
    );
    row.alloue = a.quantity;
  }

  // Populate from transported items
  for (const item of transportedItems) {
    if (!item.materiauId || !item.materiau) continue;
    const row = getOrCreate(
      item.list.chantierId,
      item.list.chantier.name,
      item.materiauId,
      item.materiau.designation,
      item.unit
    );
    row.transporte += item.quantity;
  }

  // Populate from consommation entries
  for (const c of allConsommations) {
    const row = getOrCreate(
      c.chantierId,
      c.chantier.name,
      c.materiauId,
      c.materiau.designation,
      c.unit
    );
    row.consommeEntries.push({ date: c.date, quantity: c.quantity });
  }

  // Compute final StatsRow[]
  const statsRows: StatsRow[] = Array.from(rowsMap.values())
    .map((row): StatsRow => {
      // Period-filtered consommé
      const consomme = row.consommeEntries
        .filter((e) => !dateFrom || e.date >= dateFrom)
        .reduce((sum, e) => sum + e.quantity, 0);

      // 4-week cadence for projection (always based on last 4 weeks, ignores UI period filter)
      const last4wTotal = row.consommeEntries
        .filter((e) => e.date >= fourWeeksAgo)
        .reduce((sum, e) => sum + e.quantity, 0);
      const cadenceHebdo = last4wTotal / 4;

      const restant =
        row.alloue !== null ? row.alloue - consomme : null;

      let projectionSemaines: number | null = null;
      if (restant !== null) {
        if (restant <= 0) {
          projectionSemaines = 0;
        } else if (cadenceHebdo > 0) {
          projectionSemaines = restant / cadenceHebdo;
        }
        // cadenceHebdo === 0 → projectionSemaines stays null (rendered as ∞)
      }

      return {
        chantierId: row.chantierId,
        chantierName: row.chantierName,
        materiauId: row.materiauId,
        materiauDesignation: row.materiauDesignation,
        unit: row.unit,
        alloue: row.alloue,
        transporte: row.transporte,
        consomme,
        restant,
        projectionSemaines,
      };
    })
    .sort(
      (a, b) =>
        a.chantierName.localeCompare(b.chantierName) ||
        a.materiauDesignation.localeCompare(b.materiauDesignation)
    );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[#3D4A5C]">Statistiques</h1>
      <StatsFilters
        chantiers={chantiers}
        materiaux={materiaux}
        current={{ chantierId, materiauId, periode }}
      />
      <StatsTable statsRows={statsRows} />
    </div>
  );
}
