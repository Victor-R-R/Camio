import type { LoadingList, LoadingListItem, Chantier, Chauffeur, CompanySettings } from "@/lib/generated/prisma/client";

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

export interface ItemRow {
  id: string;
  designation: string;
  quantity: number;
  unit: string;
  materiauId?: string;
}

export type StatsRow = {
  chantierId: string;
  chantierName: string;
  materiauId: string;
  materiauDesignation: string;
  unit: string;
  alloue: number | null;       // null = no allocation defined
  transporte: number;          // sum of DELIVERED LoadingListItem.quantity
  consomme: number;            // sum of ConsommationEntry.quantity (period-filtered)
  restant: number | null;      // alloue - consomme, null if no allocation
  projectionSemaines: number | null; // null = no cadence; 0 = already exceeded
};

export type MateriauStats = {
  materiauId: string;
  materiauDesignation: string;
  unit: string;
  alloue: number | null;            // sum of allocations across chantiers (null if none)
  transporte: number;               // sum of DELIVERED LoadingListItem quantities
  consomme: number;                 // sum of all ConsommationEntry quantities (all-time)
  restant: number | null;           // alloue - consomme, null if no allocation
  projectionSemaines: number | null; // worst (min) projection across chantiers
  chantierCount: number;            // number of chantiers with data for this material
  color: string;                    // hex color from palette, assigned by index
};

export type CalendarEntry = {
  date: string;               // "YYYY-MM-DD"
  materiauId: string;
  materiauDesignation: string;
  chantierId: string;
  chantierName: string;
  quantity: number;
  unit: string;
  source: "Manuel" | "Bon";  // ConsommationEntry = Manuel, DELIVERED LoadingListItem = Bon
};

export type KpiData = {
  listsCreated: number;
  listsDelivered: number;
  criticalCount: number;   // materials with allocation pct >= 90%
  trackedCount: number;    // materials with at least one allocation
};
