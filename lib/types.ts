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
