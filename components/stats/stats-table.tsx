"use client";

import React from "react";
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
  materiaux: { id: string; designation: string; unit: string }[];
};

// Circumference for r=13: 2 * π * 13 ≈ 81.68
const CIRC = 2 * Math.PI * 13;

function donutColor(pct: number): string {
  if (pct >= 90) return "#ef4444";
  if (pct >= 70) return "#f59e0b";
  return "#10b981";
}

function ChantierDonut({ pct }: { pct: number | null }) {
  if (pct === null) {
    return (
      <svg width="32" height="32" viewBox="0 0 36 36" aria-hidden>
        <circle cx="18" cy="18" r="13" fill="none" stroke="#e2e8f0" strokeWidth="5.5" />
      </svg>
    );
  }
  const clamped = Math.min(pct, 100);
  const consumed = (clamped / 100) * CIRC;
  const remaining = CIRC - consumed;
  const color = donutColor(pct);

  return (
    <svg width="32" height="32" viewBox="0 0 36 36" aria-hidden>
      <circle cx="18" cy="18" r="13" fill="none" stroke="#e2e8f0" strokeWidth="5.5" />
      <circle
        cx="18" cy="18" r="13" fill="none"
        stroke={color} strokeWidth="5.5"
        strokeDasharray={`${consumed} ${remaining}`}
        strokeDashoffset="0"
        transform="rotate(-90 18 18)"
      />
      <text
        x="18" y="21"
        textAnchor="middle"
        fontSize="7"
        fill={color}
        fontWeight="bold"
      >
        {Math.round(clamped)}%
      </text>
    </svg>
  );
}

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

  // Group rows by chantierId, preserving sort order
  const groupOrder: string[] = [];
  const groups = new Map<string, StatsRow[]>();
  for (const row of statsRows) {
    if (!groups.has(row.chantierId)) {
      groupOrder.push(row.chantierId);
      groups.set(row.chantierId, []);
    }
    groups.get(row.chantierId)!.push(row);
  }

  return (
    <>
      <div className="rounded-md border overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead>
            <tr className="bg-muted/50 border-b">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                Chantier / Matériau
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
            {groupOrder.map((chantierId) => {
              const rows = groups.get(chantierId)!;
              const chantierName = rows[0].chantierName;

              // Aggregate totals for the group header
              const hasAnyAlloc = rows.some((r) => r.alloue !== null);
              const totalAlloue = hasAnyAlloc
                ? rows.reduce((s, r) => s + (r.alloue ?? 0), 0)
                : null;
              const totalConsomme = rows.reduce((s, r) => s + r.consomme, 0);
              const totalTransporte = rows.reduce((s, r) => s + r.transporte, 0);
              const totalRestant =
                totalAlloue !== null ? totalAlloue - totalConsomme : null;

              // Only compute meaningful aggregates when all materials share the same unit
              const units = [...new Set(rows.map((r) => r.unit))];
              const singleUnit = units.length === 1 ? units[0] : null;

              const pct =
                singleUnit && totalAlloue && totalAlloue > 0
                  ? (totalConsomme / totalAlloue) * 100
                  : null;

              // Worst (lowest) projection among sub-rows that have a value
              const projValues = rows
                .map((r) => r.projectionSemaines)
                .filter((v): v is number => v !== null);
              const worstProjection =
                projValues.length > 0
                  ? projValues.reduce((min, v) => Math.min(min, v), Infinity)
                  : null;

              const barColor =
                pct === null
                  ? "bg-gray-300"
                  : pct >= 90
                  ? "bg-red-500"
                  : pct >= 70
                  ? "bg-orange-400"
                  : "bg-green-500";

              const materiaux = rows.map((r) => ({
                id: r.materiauId,
                designation: r.materiauDesignation,
                unit: r.unit,
              }));

              return (
                <React.Fragment key={chantierId}>
                  {/* Group header row */}
                  <tr className="border-t bg-blue-50/60">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <ChantierDonut pct={pct} />
                        <div>
                          <div className="font-semibold text-blue-900">
                            {chantierName}
                          </div>
                          {pct !== null && singleUnit && (
                            <div className="text-xs text-muted-foreground">
                              {totalConsomme} {singleUnit} consommé · {totalRestant} {singleUnit} restant
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground text-xs">
                      {totalAlloue !== null && singleUnit ? `${totalAlloue} ${singleUnit}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {totalTransporte > 0 && singleUnit ? `${totalTransporte} ${singleUnit}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold">
                      {totalConsomme > 0 && singleUnit ? `${totalConsomme} ${singleUnit}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {totalRestant === null || !singleUnit ? (
                        "—"
                      ) : totalRestant <= 0 ? (
                        <span className="text-red-600 font-medium">
                          {totalRestant} {singleUnit}
                        </span>
                      ) : (
                        `${totalRestant} ${singleUnit}`
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {pct !== null ? (
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={cn("h-2 rounded-full transition-all", barColor)}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ProjectionBadge value={worstProjection} />
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() =>
                          setFormTarget({ chantierId, chantierName, materiaux })
                        }
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Conso.
                      </Button>
                    </td>
                  </tr>

                  {/* Sub-rows per matériau */}
                  {rows.map((row) => {
                    const subPct =
                      row.alloue && row.alloue > 0
                        ? (row.consomme / row.alloue) * 100
                        : null;
                    const subBarColor =
                      subPct === null
                        ? "bg-gray-300"
                        : subPct >= 90
                        ? "bg-red-500"
                        : subPct >= 70
                        ? "bg-orange-400"
                        : "bg-green-500";

                    return (
                      <tr
                        key={`${row.chantierId}|${row.materiauId}`}
                        className="border-t hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-4 py-2 pl-14 text-muted-foreground">
                          {row.materiauDesignation}
                        </td>
                        <td className="px-4 py-2 text-right">
                          <AllocationCell
                            chantierId={row.chantierId}
                            materiauId={row.materiauId}
                            unit={row.unit}
                            value={row.alloue}
                          />
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums">
                          {row.transporte > 0
                            ? `${row.transporte} ${row.unit}`
                            : "—"}
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums">
                          {row.consomme > 0
                            ? `${row.consomme} ${row.unit}`
                            : "—"}
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums">
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
                        <td className="px-4 py-2">
                          {subPct !== null ? (
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className={cn(
                                  "h-2 rounded-full transition-all",
                                  subBarColor
                                )}
                                style={{ width: `${Math.min(subPct, 100)}%` }}
                              />
                            </div>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-4 py-2 text-right">
                          <ProjectionBadge value={row.projectionSemaines} />
                        </td>
                        <td className="px-4 py-2" />
                      </tr>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {formTarget && (
        <ConsommationForm
          chantierId={formTarget.chantierId}
          chantierName={formTarget.chantierName}
          materiaux={formTarget.materiaux}
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
