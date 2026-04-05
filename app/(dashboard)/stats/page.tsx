import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ListStatus } from "@/lib/generated/prisma/enums";
import type { StatsRow, MateriauStats, CalendarEntry } from "@/lib/types";
import { StatsFilters } from "@/components/stats/stats-filters";
import { KpiCards } from "@/components/stats/kpi-cards";
import { MaterialCardList } from "@/components/stats/material-card-list";
import { CalendarPanel } from "@/components/stats/calendar-panel";

type SearchParams = Promise<{
  chantierId?: string;
  materiauId?: string;
}>;

const PALETTE = [
  "#f59e0b",
  "#ef4444",
  "#10b981",
  "#8b5cf6",
  "#3b82f6",
  "#ec4899",
];

export default async function StatsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { chantierId, materiauId } = await searchParams;

  // Always compute 4-week window for projection cadence
  const now = new Date();
  const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);

  const chantierWhere = chantierId ? { chantierId } : {};
  const materiauWhere = materiauId ? { materiauId } : {};

  const [
    allocations,
    allConsommations,
    transportedItems,
    chantiers,
    materiaux,
    listsCreated,
    listsDelivered,
  ] = await Promise.all([
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
    prisma.loadingList.count({
      where: chantierId ? { chantierId } : {},
    }),
    prisma.loadingList.count({
      where: {
        status: ListStatus.DELIVERED,
        ...(chantierId ? { chantierId } : {}),
      },
    }),
  ]);

  // ── Build StatsRow[] (per chantier × matériau) ──────────────────────
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

  for (const a of allocations) {
    const row = getOrCreate(
      a.chantierId,
      a.chantier.name,
      a.materiauId,
      a.materiau.designation,
      a.unit as string
    );
    row.alloue = a.quantity;
  }

  for (const item of transportedItems) {
    if (!item.materiauId || !item.materiau) continue;
    const row = getOrCreate(
      item.list.chantierId,
      item.list.chantier.name,
      item.materiauId,
      item.materiau.designation,
      item.unit as string
    );
    row.transporte += item.quantity;
  }

  for (const c of allConsommations) {
    const row = getOrCreate(
      c.chantierId,
      c.chantier.name,
      c.materiauId,
      c.materiau.designation,
      c.unit as string
    );
    row.consommeEntries.push({ date: c.date, quantity: c.quantity });
  }

  const statsRows: StatsRow[] = Array.from(rowsMap.values())
    .map((row): StatsRow => {
      // All-time consommé (no period filter)
      const consomme = row.consommeEntries.reduce(
        (sum, e) => sum + e.quantity,
        0
      );

      // 4-week cadence for projection (always based on last 4 weeks)
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

  // ── Build MateriauStats[] (all active materials, seeded from materiaux) ─
  const matMap = new Map<string, MateriauStats>();
  for (const mat of materiaux) {
    matMap.set(mat.id, {
      materiauId: mat.id,
      materiauDesignation: mat.designation,
      unit: mat.defaultUnit as string,
      alloue: null,
      transporte: 0,
      consomme: 0,
      restant: null,
      projectionSemaines: null,
      chantierCount: 0,
      color: PALETTE[matMap.size % PALETTE.length],
    });
  }

  for (const row of statsRows) {
    const m = matMap.get(row.materiauId);
    if (!m) continue;
    m.transporte += row.transporte;
    m.consomme += row.consomme;
    m.chantierCount += 1;
    if (row.alloue !== null) m.alloue = (m.alloue ?? 0) + row.alloue;
    if (row.projectionSemaines !== null) {
      if (m.projectionSemaines === null)
        m.projectionSemaines = row.projectionSemaines;
      else
        m.projectionSemaines = Math.min(
          m.projectionSemaines,
          row.projectionSemaines
        );
    }
  }

  for (const m of matMap.values()) {
    m.restant = m.alloue !== null ? m.alloue - m.consomme : null;
  }

  const materiauStats = [...matMap.values()];

  // ── KPI counts ────────────────────────────────────────────────────────
  const criticalCount = materiauStats.filter(
    (m) => m.alloue && m.alloue > 0 && (m.consomme / m.alloue) * 100 >= 90
  ).length;
  const trackedCount = materiauStats.filter((m) => m.alloue !== null).length;

  // ── colorMap for CalendarPanel ────────────────────────────────────────
  const colorMap: Record<string, string> = {};
  for (const m of materiauStats) colorMap[m.materiauId] = m.color;

  // ── CalendarEntry[] ───────────────────────────────────────────────────
  const calendarEntries: CalendarEntry[] = [
    ...allConsommations.map((c) => ({
      date: c.date.toISOString().split("T")[0],
      materiauId: c.materiauId,
      materiauDesignation: c.materiau.designation,
      chantierId: c.chantierId,
      chantierName: c.chantier.name,
      quantity: c.quantity,
      unit: c.unit as string,
      source: "Manuel" as const,
    })),
    ...transportedItems
      .filter((item) => item.materiauId && item.materiau)
      .map((item) => ({
        date: item.list.date.toISOString().split("T")[0],
        materiauId: item.materiauId!,
        materiauDesignation: item.materiau!.designation,
        chantierId: item.list.chantierId,
        chantierName: item.list.chantier.name,
        quantity: item.quantity,
        unit: item.unit as string,
        source: "Bon" as const,
      })),
  ];

  // ── materiauOptions for component props ──────────────────────────────
  const materiauOptions = materiaux.map((m) => ({
    id: m.id,
    designation: m.designation,
    unit: m.defaultUnit as string,
  }));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-[#3D4A5C]">Statistiques</h1>
      <StatsFilters
        chantiers={chantiers}
        materiaux={materiaux}
        current={{ chantierId, materiauId }}
      />
      <KpiCards
        listsCreated={listsCreated}
        listsDelivered={listsDelivered}
        criticalCount={criticalCount}
        trackedCount={trackedCount}
      />
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 items-start">
        <MaterialCardList
          materiauStats={materiauStats}
          chantiers={chantiers}
          materiaux={materiauOptions}
        />
        <CalendarPanel entries={calendarEntries} colorMap={colorMap} />
      </div>
    </div>
  );
}
