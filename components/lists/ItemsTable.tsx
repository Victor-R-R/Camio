"use client";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CatalogSearch } from "./CatalogSearch";
import { GripVertical, Trash2, Plus } from "lucide-react";

export interface ItemRow {
  id: string;
  designation: string;
  quantity: number;
  unit: string;
  materiauId?: string;
}

const UNITS = ["U", "M", "M2", "M3", "KG", "T", "L", "ROULEAU", "SAC", "PALETTE"] as const;

function SortableRow({
  item,
  onChange,
  onRemove,
}: {
  item: ItemRow;
  onChange: (id: string, field: keyof ItemRow, value: string | number) => void;
  onRemove: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <tr ref={setNodeRef} style={style} className="border-t">
      <td className="p-2 w-8">
        <button {...attributes} {...listeners} className="cursor-grab text-muted-foreground touch-none">
          <GripVertical className="h-4 w-4" />
        </button>
      </td>
      <td className="p-2">
        <Input
          value={item.designation}
          onChange={(e) => onChange(item.id, "designation", e.target.value)}
          placeholder="Désignation"
        />
      </td>
      <td className="p-2 w-28">
        <Input
          type="number"
          min="0"
          step="0.01"
          value={item.quantity}
          onChange={(e) => onChange(item.id, "quantity", parseFloat(e.target.value) || 0)}
        />
      </td>
      <td className="p-2 w-36">
        <Select value={item.unit} onValueChange={(v) => onChange(item.id, "unit", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
          </SelectContent>
        </Select>
      </td>
      <td className="p-2 w-10">
        <Button variant="ghost" size="icon" onClick={() => onRemove(item.id)}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </td>
    </tr>
  );
}

interface Props {
  items: ItemRow[];
  onChange: (items: ItemRow[]) => void;
}

export function ItemsTable({ items, onChange }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);
      onChange(arrayMove(items, oldIndex, newIndex));
    }
  }

  function updateItem(id: string, field: keyof ItemRow, value: string | number) {
    onChange(items.map((i) => (i.id === id ? { ...i, [field]: value } : i)));
  }

  function removeItem(id: string) {
    onChange(items.filter((i) => i.id !== id));
  }

  function addBlankItem() {
    onChange([
      ...items,
      { id: crypto.randomUUID(), designation: "", quantity: 1, unit: "U" },
    ]);
  }

  return (
    <div className="space-y-3">
      <CatalogSearch
        onSelect={(m) =>
          onChange([
            ...items,
            {
              id: crypto.randomUUID(),
              designation: m.designation,
              quantity: 1,
              unit: m.defaultUnit,
              materiauId: m.id,
            },
          ])
        }
      />
      <div className="border rounded-md overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="p-2 w-8" />
              <th className="p-2 text-left">Désignation</th>
              <th className="p-2 text-left w-28">Quantité</th>
              <th className="p-2 text-left w-36">Unité</th>
              <th className="p-2 w-10" />
            </tr>
          </thead>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
              <tbody>
                {items.map((item) => (
                  <SortableRow key={item.id} item={item} onChange={updateItem} onRemove={removeItem} />
                ))}
              </tbody>
            </SortableContext>
          </DndContext>
        </table>
      </div>
      <Button variant="outline" size="sm" onClick={addBlankItem} type="button">
        <Plus className="h-4 w-4 mr-1" /> Ajouter une ligne libre
      </Button>
    </div>
  );
}
