# Stats — Table groupée par chantier Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructurer la page `/stats` pour afficher une ligne de groupe par chantier avec donut consommé/restant, des sous-lignes par matériau, et le bouton "+ Conso." au niveau chantier avec picker matériau.

**Architecture:** Tout le travail est côté client dans `components/stats/`. La logique de groupement se fait dans `StatsTable` à partir du `StatsRow[]` existant (aucun changement serveur). `ConsommationForm` est modifié pour recevoir une liste de matériaux à la place d'un matériau fixe.

**Tech Stack:** React 19, shadcn/ui (Dialog, Select, Button, Label, Input, Badge), Tailwind CSS v4, SVG inline pour le donut.

---

## Fichiers modifiés

| Fichier | Rôle |
|---|---|
| `components/stats/consommation-form.tsx` | Remplace les props matériau fixes par `materiaux[]` + picker Select |
| `components/stats/stats-table.tsx` | Groupement par chantier, ligne header + donut, sous-lignes, nouveau formTarget |

Aucun autre fichier ne change.

---

### Task 1 : Modifier `ConsommationForm` — picker matériau dynamique

**Files:**
- Modify: `components/stats/consommation-form.tsx`

- [ ] **Step 1 : Remplacer le composant entier par la version avec picker**

Remplacer le contenu de `components/stats/consommation-form.tsx` par :

```tsx
"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createConsommationEntry } from "@/lib/actions/stats";

type MateriauOption = {
  id: string;
  designation: string;
  unit: string;
};

type Props = {
  chantierId: string;
  chantierName: string;
  materiaux: MateriauOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ConsommationForm({
  chantierId,
  chantierName,
  materiaux,
  open,
  onOpenChange,
}: Props) {
  const [selectedMateriauId, setSelectedMateriauId] = useState(
    materiaux[0]?.id ?? ""
  );
  const [quantity, setQuantity] = useState("");
  const [date, setDate] = useState(
    () => new Date().toISOString().split("T")[0]
  );
  const [notes, setNotes] = useState("");
  const [isPending, startTransition] = useTransition();

  const selectedMateriau = materiaux.find((m) => m.id === selectedMateriauId);
  const unit = selectedMateriau?.unit ?? "";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0 || !selectedMateriauId) return;
    startTransition(async () => {
      await createConsommationEntry({
        chantierId,
        materiauId: selectedMateriauId,
        quantity: qty,
        unit,
        date,
        notes: notes || null,
      });
      onOpenChange(false);
      setQuantity("");
      setNotes("");
      setSelectedMateriauId(materiaux[0]?.id ?? "");
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Saisir consommation</DialogTitle>
          <p className="text-sm text-muted-foreground">{chantierName}</p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1">
            <Label htmlFor="conso-materiau">Matériau</Label>
            <Select
              value={selectedMateriauId}
              onValueChange={setSelectedMateriauId}
            >
              <SelectTrigger id="conso-materiau">
                <SelectValue placeholder="Choisir un matériau" />
              </SelectTrigger>
              <SelectContent>
                {materiaux.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.designation}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="conso-qty">
              Quantité{unit ? ` (${unit})` : ""}
            </Label>
            <Input
              id="conso-qty"
              type="number"
              min={0}
              step={0.01}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="conso-date">Date</Label>
            <Input
              id="conso-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="conso-notes">Notes (optionnel)</Label>
            <Input
              id="conso-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={isPending || !selectedMateriauId}>
              {isPending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2 : Vérifier TypeScript**

```bash
cd /Users/victorrubia/Camio && npx tsc --noEmit 2>&1 | head -30
```

Attendu : erreurs uniquement sur `stats-table.tsx` (qui appelle encore l'ancienne API de `ConsommationForm`). Pas d'erreur dans `consommation-form.tsx`.

- [ ] **Step 3 : Commit**

```bash
git add components/stats/consommation-form.tsx
git commit -m "feat: add materiau picker to ConsommationForm"
```

---

### Task 2 : Refactoriser `StatsTable` — groupement, donut, sous-lignes

**Files:**
- Modify: `components/stats/stats-table.tsx`

- [ ] **Step 1 : Remplacer le composant entier**

Remplacer le contenu de `components/stats/stats-table.tsx` par :

```tsx
"use client";

import { useState } from "react";
import type { StatsRow } from "@/lib/types";
import { AllocationCell } from "./allocation-cell";
import { ConsommationForm } from "./consommation-form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import React from "react";
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
              const pct =
                totalAlloue && totalAlloue > 0
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
                  <tr
                    className="border-t bg-blue-50/60"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <ChantierDonut pct={pct} />
                        <div>
                          <div className="font-semibold text-blue-900">
                            {chantierName}
                          </div>
                          {pct !== null && (
                            <div className="text-xs text-muted-foreground">
                              {totalConsomme} consommé · {totalRestant} restant
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground text-xs">
                      {totalAlloue !== null ? `${totalAlloue}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {totalTransporte > 0 ? totalTransporte : "—"}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold">
                      {totalConsomme > 0 ? totalConsomme : "—"}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {totalRestant === null ? (
                        "—"
                      ) : totalRestant <= 0 ? (
                        <span className="text-red-600 font-medium">
                          {totalRestant}
                        </span>
                      ) : (
                        totalRestant
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
```

- [ ] **Step 2 : Vérifier TypeScript — aucune erreur attendue**

```bash
cd /Users/victorrubia/Camio && npx tsc --noEmit 2>&1 | head -30
```

Attendu : aucune erreur.

- [ ] **Step 3 : Démarrer le dev server et vérifier visuellement**

```bash
cd /Users/victorrubia/Camio && npm run dev
```

Ouvrir http://localhost:3000/stats et vérifier :
- Une ligne de groupe bleue par chantier avec donut
- Sous-lignes indentées par matériau avec barres de progression
- Bouton "+ Conso." sur la ligne chantier uniquement
- Dialog avec dropdown matériau, quantité (unité dynamique), date
- Soumission du dialog → fermeture + données rafraîchies

- [ ] **Step 4 : Commit**

```bash
git add components/stats/stats-table.tsx
git commit -m "feat: group stats by chantier with donut and materiau picker"
```
