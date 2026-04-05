"use client";

import { useState } from "react";
import type { MateriauStats } from "@/lib/types";
import { ConsommationForm } from "./consommation-form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

// Circumference for r=13: 2 * Math.PI * 13 ≈ 81.68
const CIRC = 2 * Math.PI * 13;

function donutColor(pct: number): string {
  if (pct >= 90) return "#ef4444";
  if (pct >= 70) return "#f59e0b";
  return "#10b981";
}

function MateriauDonut({
  alloue,
  consomme,
}: {
  alloue: number | null;
  consomme: number;
}) {
  if (alloue === null || alloue === 0) {
    return (
      <svg width="48" height="48" viewBox="0 0 36 36" aria-hidden>
        <circle
          cx="18" cy="18" r="13"
          fill="none" stroke="#e2e8f0" strokeWidth="5.5"
        />
        <text
          x="18" y="21"
          textAnchor="middle" fontSize="6" fill="#94a3b8"
        >
          —
        </text>
      </svg>
    );
  }
  const pct = Math.min((consomme / alloue) * 100, 100);
  const filled = (pct / 100) * CIRC;
  const empty = CIRC - filled;
  const stroke = donutColor(pct);

  return (
    <svg width="48" height="48" viewBox="0 0 36 36" aria-hidden>
      <circle
        cx="18" cy="18" r="13"
        fill="none" stroke="#e2e8f0" strokeWidth="5.5"
      />
      <circle
        cx="18" cy="18" r="13"
        fill="none" stroke={stroke} strokeWidth="5.5"
        strokeDasharray={`${filled} ${empty}`}
        strokeDashoffset="0"
        transform="rotate(-90 18 18)"
      />
      <text
        x="18" y="21"
        textAnchor="middle" fontSize="7" fill={stroke} fontWeight="bold"
      >
        {Math.round(pct)}%
      </text>
    </svg>
  );
}

function ProjectionBadge({ value }: { value: number | null }) {
  if (value === null)
    return <span className="text-muted-foreground text-xs">∞</span>;
  if (value === 0)
    return <Badge variant="destructive">⚠ Dépassé</Badge>;
  if (value < 2)
    return (
      <Badge variant="destructive">⚠ Urgent ({value.toFixed(1)} sem.)</Badge>
    );
  if (value < 8)
    return (
      <span className="text-xs text-orange-600 font-medium tabular-nums">
        {value.toFixed(1)} sem.
      </span>
    );
  return (
    <span className="text-xs text-slate-500 tabular-nums">
      {value.toFixed(1)} sem.
    </span>
  );
}

type Props = {
  materiauStats: MateriauStats[];
  chantiers: { id: string; name: string }[];
  materiaux: { id: string; designation: string; unit: string }[];
};

export function MaterialCardList({
  materiauStats,
  chantiers,
  materiaux,
}: Props) {
  const [formMat, setFormMat] = useState<{ materiauId: string } | null>(null);

  if (materiauStats.length === 0) {
    return (
      <p className="text-muted-foreground text-sm text-center py-8">
        Aucun matériau actif. Ajoutez-en depuis le catalogue.
      </p>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        {materiauStats.map((m) => {
          const pct =
            m.alloue && m.alloue > 0
              ? (m.consomme / m.alloue) * 100
              : null;
          const barColor =
            pct === null
              ? "#e2e8f0"
              : pct >= 90
              ? "#ef4444"
              : pct >= 70
              ? "#f59e0b"
              : "#10b981";
          const isLow =
            m.restant !== null &&
            m.alloue !== null &&
            m.alloue > 0 &&
            m.restant < m.alloue * 0.1;

          return (
            <div
              key={m.materiauId}
              className="bg-white border border-slate-200 rounded-lg p-4"
              style={{ borderLeft: `4px solid ${m.color}` }}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-sm text-slate-800">
                  {m.materiauDesignation}
                </span>
                <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                  {m.unit}
                </span>
              </div>

              {/* Body: donut + stats */}
              <div className="flex gap-3 items-center">
                <MateriauDonut alloue={m.alloue} consomme={m.consomme} />
                <div className="flex-1 space-y-1">
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Alloué</span>
                    <strong className="text-slate-700">
                      {m.alloue !== null ? `${m.alloue} ${m.unit}` : "—"}
                    </strong>
                  </div>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>🚛 Transporté</span>
                    <strong className="text-slate-700">
                      {m.transporte > 0 ? `${m.transporte} ${m.unit}` : "—"}
                    </strong>
                  </div>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Consommé</span>
                    <strong className="text-slate-700">
                      {m.consomme > 0 ? `${m.consomme} ${m.unit}` : "—"}
                    </strong>
                  </div>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Restant</span>
                    <strong className={cn("text-slate-700", isLow && "text-red-600")}>
                      {m.restant !== null ? `${m.restant} ${m.unit}` : "—"}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-3 bg-slate-100 rounded-full h-1.5">
                <div
                  className="h-1.5 rounded-full transition-all"
                  style={{
                    width: `${Math.min(pct ?? 0, 100)}%`,
                    background: barColor,
                  }}
                />
              </div>

              {/* Footer */}
              <div className="mt-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ProjectionBadge value={m.projectionSemaines} />
                  {m.chantierCount > 0 && (
                    <span className="text-xs text-slate-400">
                      {m.chantierCount} chantier
                      {m.chantierCount > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => setFormMat({ materiauId: m.materiauId })}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Conso.
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {formMat && (
        <ConsommationForm
          chantiers={chantiers}
          materiaux={materiaux}
          defaultMateriauId={formMat.materiauId}
          open={true}
          onOpenChange={(open) => {
            if (!open) setFormMat(null);
          }}
        />
      )}
    </>
  );
}
