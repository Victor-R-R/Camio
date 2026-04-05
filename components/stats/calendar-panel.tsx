"use client";

import { useState, useMemo } from "react";
import type { CalendarEntry } from "@/lib/types";
import { cn } from "@/lib/utils";

type Props = {
  entries: CalendarEntry[];
  colorMap: Record<string, string>; // materiauId → hex color
};

const MONTHS_FR = [
  "Janv", "Févr", "Mars", "Avr", "Mai", "Juin",
  "Juil", "Août", "Sept", "Oct", "Nov", "Déc",
];
const WEEKDAYS_FR = ["L", "M", "M", "J", "V", "S", "D"];

export function CalendarPanel({ entries, colorMap }: Props) {
  const [view, setView] = useState<"mois" | "annee">("annee");
  const [month, setMonth] = useState(() => new Date().getMonth()); // 0-11
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const todayStr = new Date().toISOString().split("T")[0];

  // ── Annual chart ──────────────────────────────────────────────────────
  // Group all entries by (year-month, materiauId) → sum quantities
  const annualData = useMemo(() => {
    const map = new Map<string, Map<string, number>>();
    for (const e of entries) {
      const [y, m] = e.date.split("-");
      const key = `${y}-${m}`;
      if (!map.has(key)) map.set(key, new Map());
      const inner = map.get(key)!;
      inner.set(e.materiauId, (inner.get(e.materiauId) ?? 0) + e.quantity);
    }
    return map;
  }, [entries]);

  const { bars, maxMonthTotal } = useMemo(() => {
    let max = 0;
    const result = Array.from({ length: 12 }, (_, i) => {
      const key = `${year}-${String(i + 1).padStart(2, "0")}`;
      const matMap = annualData.get(key) ?? new Map<string, number>();
      const stacks: { materiauId: string; total: number; color: string }[] = [];
      let monthTotal = 0;
      for (const [matId, total] of matMap) {
        stacks.push({
          materiauId: matId,
          total,
          color: colorMap[matId] ?? "#e2e8f0",
        });
        monthTotal += total;
      }
      if (monthTotal > max) max = monthTotal;
      return { month: i, stacks, monthTotal };
    });
    return { bars: result, maxMonthTotal: max };
  }, [annualData, year, colorMap]);

  // Unique materials that appear in entries (for legend)
  const legendMats = useMemo(() => {
    const seen = new Map<string, { designation: string; color: string }>();
    for (const e of entries) {
      if (!seen.has(e.materiauId)) {
        seen.set(e.materiauId, {
          designation: e.materiauDesignation,
          color: colorMap[e.materiauId] ?? "#e2e8f0",
        });
      }
    }
    return [...seen.entries()].map(([id, v]) => ({ id, ...v }));
  }, [entries, colorMap]);

  // ── Monthly calendar ──────────────────────────────────────────────
  // Days in current month that have at least one entry
  const datesWithData = useMemo(() => {
    const set = new Set<string>();
    for (const e of entries) {
      const [y, m] = e.date.split("-");
      if (parseInt(y) === year && parseInt(m) === month + 1) set.add(e.date);
    }
    return set;
  }, [entries, year, month]);

  // Entries for selected day
  const dayEntries = useMemo(() => {
    if (!selectedDate) return [];
    return entries.filter((e) => e.date === selectedDate);
  }, [entries, selectedDate]);

  // Build calendar grid cells
  const cells = useMemo(() => {
    const firstDow = (new Date(year, month, 1).getDay() + 6) % 7; // Mon=0
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const result: { day: number | null; dateStr: string | null }[] = [];
    for (let i = 0; i < firstDow; i++) result.push({ day: null, dateStr: null });
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      result.push({ day: d, dateStr });
    }
    return result;
  }, [year, month]);

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
    setSelectedDate(null);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
    setSelectedDate(null);
  }

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 sticky top-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="font-bold text-sm text-slate-800">Calendrier</span>
        <div className="flex gap-0.5 bg-slate-100 rounded-md p-0.5">
          <button
            className={cn(
              "rounded px-2.5 py-1 text-xs font-medium transition-colors",
              view === "mois"
                ? "bg-white text-blue-800 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            )}
            onClick={() => setView("mois")}
          >
            Mois
          </button>
          <button
            className={cn(
              "rounded px-2.5 py-1 text-xs font-medium transition-colors",
              view === "annee"
                ? "bg-white text-blue-800 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            )}
            onClick={() => setView("annee")}
          >
            Année
          </button>
        </div>
      </div>

      {/* ── ANNUAL VIEW ─────────────────────────────────────────────── */}
      {view === "annee" && (
        <>
          <div className="flex items-center justify-between mb-2">
            <button
              className="text-slate-400 hover:text-slate-600 px-1 text-sm"
              onClick={() => setYear((y) => y - 1)}
            >
              ‹
            </button>
            <span className="text-sm font-semibold text-slate-700">{year}</span>
            <button
              className="text-slate-400 hover:text-slate-600 px-1 text-sm"
              onClick={() => setYear((y) => y + 1)}
            >
              ›
            </button>
          </div>

          {/* Bar chart */}
          <div className="flex items-end gap-0.5 h-20">
            {bars.map(({ month: m, stacks, monthTotal }) => (
              <div
                key={m}
                className="flex-1 flex flex-col items-center gap-0.5 cursor-pointer"
                title={`${MONTHS_FR[m]} — ${monthTotal.toFixed(0)}`}
                onClick={() => {
                  setMonth(m);
                  setView("mois");
                  setSelectedDate(null);
                }}
              >
                <div className="flex-1 w-full flex flex-col-reverse items-stretch justify-start gap-px">
                  {stacks.length === 0 ? (
                    <div
                      className="w-full rounded-sm"
                      style={{ height: 2, background: "#e2e8f0" }}
                    />
                  ) : (
                    stacks.map((s) => {
                      const h =
                        maxMonthTotal > 0
                          ? Math.max(2, (s.total / maxMonthTotal) * 72)
                          : 2;
                      return (
                        <div
                          key={s.materiauId}
                          className="w-full rounded-sm"
                          style={{ height: h, background: s.color }}
                        />
                      );
                    })
                  )}
                </div>
                <span
                  className={cn(
                    "text-[8px] text-slate-400",
                    m === currentMonth &&
                      year === currentYear &&
                      "text-blue-600 font-bold"
                  )}
                >
                  {MONTHS_FR[m]}
                </span>
              </div>
            ))}
          </div>

          {/* Legend */}
          {legendMats.length > 0 && (
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3 pt-2 border-t border-slate-100">
              {legendMats.map((mat) => (
                <div key={mat.id} className="flex items-center gap-1">
                  <div
                    className="w-2 h-2 rounded-sm flex-shrink-0"
                    style={{ background: mat.color }}
                  />
                  <span className="text-[9px] text-slate-500">
                    {mat.designation}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── MONTHLY VIEW ────────────────────────────────────────────── */}
      {view === "mois" && (
        <>
          <div className="flex items-center justify-between mb-3">
            <button
              className="bg-slate-100 hover:bg-slate-200 rounded px-2 py-1 text-xs text-slate-600"
              onClick={prevMonth}
            >
              ‹
            </button>
            <span className="text-sm font-semibold text-slate-700">
              {MONTHS_FR[month]} {year}
            </span>
            <button
              className="bg-slate-100 hover:bg-slate-200 rounded px-2 py-1 text-xs text-slate-600"
              onClick={nextMonth}
            >
              ›
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 text-center mb-1">
            {WEEKDAYS_FR.map((d, i) => (
              <span
                key={i}
                className="text-[9px] text-slate-400 font-semibold py-1"
              >
                {d}
              </span>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-px">
            {cells.map((cell, i) => {
              if (!cell.day) return <div key={`e${i}`} className="h-6" />;
              const isToday = cell.dateStr === todayStr;
              const hasData = cell.dateStr ? datesWithData.has(cell.dateStr) : false;
              const isSelected = cell.dateStr === selectedDate;
              return (
                <button
                  key={cell.dateStr}
                  className={cn(
                    "h-6 text-[10px] flex items-center justify-center transition-colors",
                    isToday &&
                      "bg-blue-700 text-white font-bold rounded-full w-6 mx-auto",
                    !isToday &&
                      hasData &&
                      "bg-blue-100 text-blue-700 font-bold rounded cursor-pointer hover:bg-blue-200",
                    !isToday && !hasData && "text-slate-400",
                    isSelected && !isToday && "ring-1 ring-blue-400 rounded"
                  )}
                  onClick={() => {
                    if (!hasData || !cell.dateStr) return;
                    setSelectedDate(
                      cell.dateStr === selectedDate ? null : cell.dateStr
                    );
                  }}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>

          {/* Day detail */}
          {selectedDate && dayEntries.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-100">
              <p className="text-[10px] font-bold text-slate-500 mb-2">
                {new Date(selectedDate + "T12:00:00").toLocaleDateString(
                  "fr-FR",
                  { day: "numeric", month: "long" }
                )}
              </p>
              <div className="space-y-1.5">
                {dayEntries.map((e, i) => (
                  <div key={i} className="flex items-center gap-2 text-[10px]">
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{
                        background: colorMap[e.materiauId] ?? "#e2e8f0",
                      }}
                    />
                    <span className="flex-1 text-slate-600 truncate">
                      {e.materiauDesignation} — {e.chantierName}
                    </span>
                    <span className="font-semibold tabular-nums whitespace-nowrap">
                      {e.quantity} {e.unit}
                    </span>
                    <span className="text-slate-400 text-[9px]">
                      {e.source}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
