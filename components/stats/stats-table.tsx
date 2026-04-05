"use client";

import { useState } from "react";
import type { StatsRow } from "@/lib/types";
import { AllocationCell } from "./allocation-cell";
import { ConsommationForm } from "./consommation-form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

type FormTarget = {
  chantierId: string;
  chantierName: string;
  materiauId: string;
  materiauDesignation: string;
  unit: string;
};

export function StatsTable({ statsRows }: { statsRows: StatsRow[] }) {
  const [formTarget, setFormTarget] = useState<FormTarget | null>(null);

  if (statsRows.length === 0) {
    return (
      <p className="text-muted-foreground text-sm mt-12 text-center">
        Aucune donnée. Livrez des bons ou définissez des allocations pour voir
        les statistiques.
      </p>
    );
  }

  return (
    <>
      <div className="rounded-md border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 border-b">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                Chantier
              </th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                Matériau
              </th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">
                Alloué
              </th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">
                Transporté
              </th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">
                Consommé
              </th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">
                Restant
              </th>
              <th className="px-4 py-3 font-medium text-muted-foreground w-36">
                Progression
              </th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">
                Projection
              </th>
              <th className="px-4 py-3 w-10" />
            </tr>
          </thead>
          <tbody>
            {statsRows.map((row) => {
              const pct =
                row.alloue && row.alloue > 0
                  ? (row.consomme / row.alloue) * 100
                  : null;
              const barColor =
                pct === null
                  ? "bg-gray-300"
                  : pct >= 90
                  ? "bg-red-500"
                  : pct >= 70
                  ? "bg-orange-400"
                  : "bg-green-500";
              const rowKey = `${row.chantierId}|${row.materiauId}`;

              return (
                <tr
                  key={rowKey}
                  className="border-t hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-3 font-medium">{row.chantierName}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {row.materiauDesignation}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <AllocationCell
                      chantierId={row.chantierId}
                      materiauId={row.materiauId}
                      unit={row.unit}
                      value={row.alloue}
                    />
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {row.transporte > 0
                      ? `${row.transporte} ${row.unit}`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {row.consomme > 0 ? `${row.consomme} ${row.unit}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {row.restant === null ? (
                      "—"
                    ) : row.restant <= 0 ? (
                      <span className="text-red-600 font-medium">
                        {row.restant} {row.unit}
                      </span>
                    ) : (
                      `${row.restant} ${row.unit}`
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {pct !== null ? (
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={cn(
                            "h-2 rounded-full transition-all",
                            barColor
                          )}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <ProjectionBadge value={row.projectionSemaines} />
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() =>
                        setFormTarget({
                          chantierId: row.chantierId,
                          chantierName: row.chantierName,
                          materiauId: row.materiauId,
                          materiauDesignation: row.materiauDesignation,
                          unit: row.unit,
                        })
                      }
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Conso.
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {formTarget && (
        <ConsommationForm
          {...formTarget}
          open={true}
          onOpenChange={(open) => {
            if (!open) setFormTarget(null);
          }}
        />
      )}
    </>
  );
}

function ProjectionBadge({ value }: { value: number | null }) {
  if (value === null)
    return <span className="text-muted-foreground text-xs">∞</span>;
  if (value === 0) return <Badge variant="destructive">⚠ Dépassé</Badge>;
  if (value < 2)
    return (
      <Badge variant="destructive">⚠ Urgent ({value.toFixed(1)} sem.)</Badge>
    );
  return <span className="tabular-nums">{value.toFixed(1)} sem.</span>;
}
