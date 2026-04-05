"use client";

import { useState, useTransition } from "react";
import { toggleItem } from "@/lib/actions/items";
import { CheckCircle2, Circle } from "lucide-react";

interface Item {
  id: string;
  designation: string;
  quantity: number;
  unit: string;
  checked: boolean;
}

interface Props {
  items: Item[];
  listId: string;
}

export function ChecklistView({ items: initialItems, listId }: Props) {
  const [items, setItems] = useState(initialItems);
  const [, startTransition] = useTransition();

  function handleToggle(itemId: string, checked: boolean) {
    setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, checked } : i)));
    startTransition(async () => {
      try {
        await toggleItem(itemId, listId, checked);
      } catch {
        // revert optimistic update
        setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, checked: !checked } : i)));
      }
    });
  }

  const checkedCount = items.filter((i) => i.checked).length;
  const allChecked = checkedCount === items.length && items.length > 0;

  return (
    <div className="space-y-4">
      {/* Barre de progression */}
      <div className="space-y-1">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>{checkedCount} / {items.length} articles chargés</span>
          <span>{items.length > 0 ? Math.round((checkedCount / items.length) * 100) : 0}%</span>
        </div>
        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#059669] transition-all duration-300"
            style={{ width: `${items.length > 0 ? (checkedCount / items.length) * 100 : 0}%` }}
          />
        </div>
      </div>

      {allChecked && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center text-green-800 font-semibold">
          ✓ Chargement complet !
        </div>
      )}

      <div className="space-y-2">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => handleToggle(item.id, !item.checked)}
            className={`w-full flex items-center gap-4 p-4 rounded-lg border-2 text-left transition-colors ${
              item.checked
                ? "bg-green-50 border-green-300 text-green-800"
                : "bg-white border-gray-200 hover:border-gray-300"
            }`}
          >
            {item.checked ? (
              <CheckCircle2 className="h-6 w-6 text-green-600 shrink-0" />
            ) : (
              <Circle className="h-6 w-6 text-gray-400 shrink-0" />
            )}
            <div className="flex-1">
              <div className={`font-medium ${item.checked ? "line-through" : ""}`}>
                {item.designation}
              </div>
              <div className="text-sm text-muted-foreground font-mono">
                {item.quantity} {item.unit}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
