"use client";

import { useRouter, usePathname } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  chantiers: { id: string; name: string }[];
  materiaux: { id: string; designation: string }[];
  current: {
    chantierId?: string;
    materiauId?: string;
    periode?: string;
  };
};

export function StatsFilters({ chantiers, materiaux, current }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  function update(key: string, value: string) {
    const merged = { ...current, [key]: value };
    const params = new URLSearchParams();
    if (merged.chantierId && merged.chantierId !== "all")
      params.set("chantierId", merged.chantierId);
    if (merged.materiauId && merged.materiauId !== "all")
      params.set("materiauId", merged.materiauId);
    if (merged.periode && merged.periode !== "all")
      params.set("periode", merged.periode);
    const qs = params.toString();
    router.push(pathname + (qs ? `?${qs}` : ""));
  }

  return (
    <div className="flex gap-3 flex-wrap">
      <Select
        value={current.chantierId ?? "all"}
        onValueChange={(v) => update("chantierId", v)}
      >
        <SelectTrigger className="w-52">
          <SelectValue placeholder="Tous les chantiers" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous les chantiers</SelectItem>
          {chantiers.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={current.materiauId ?? "all"}
        onValueChange={(v) => update("materiauId", v)}
      >
        <SelectTrigger className="w-52">
          <SelectValue placeholder="Tous les matériaux" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous les matériaux</SelectItem>
          {materiaux.map((m) => (
            <SelectItem key={m.id} value={m.id}>
              {m.designation}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={current.periode ?? "all"}
        onValueChange={(v) => update("periode", v)}
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Tout" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tout</SelectItem>
          <SelectItem value="month">Ce mois</SelectItem>
          <SelectItem value="3months">3 mois</SelectItem>
          <SelectItem value="6months">6 mois</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
