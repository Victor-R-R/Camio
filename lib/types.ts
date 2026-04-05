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
