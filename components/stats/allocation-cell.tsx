"use client";

import { useState, useTransition } from "react";
import { upsertAllocation } from "@/lib/actions/stats";

type Props = {
  chantierId: string;
  materiauId: string;
  unit: string;
  value: number | null;
};

export function AllocationCell({ chantierId, materiauId, unit, value }: Props) {
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState(value?.toString() ?? "");
  const [isPending, startTransition] = useTransition();

  function handleBlur() {
    const qty = parseFloat(inputValue);
    if (!isNaN(qty) && qty > 0) {
      startTransition(async () => {
        await upsertAllocation({ chantierId, materiauId, quantity: qty, unit });
        setEditing(false);
      });
    } else {
      setEditing(false);
      setInputValue(value?.toString() ?? "");
    }
  }

  if (editing) {
    return (
      <input
        type="number"
        className="w-24 px-1 py-0.5 border rounded text-sm text-right"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") {
            setEditing(false);
            setInputValue(value?.toString() ?? "");
          }
        }}
        autoFocus
        disabled={isPending}
        min={0}
        step={0.01}
      />
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="text-right hover:bg-gray-100 rounded px-1 py-0.5 min-w-[5rem] text-sm w-full"
      title="Cliquer pour modifier"
    >
      {value !== null ? (
        `${value} ${unit}`
      ) : (
        <span className="text-gray-400 italic text-xs">— Définir</span>
      )}
    </button>
  );
}
