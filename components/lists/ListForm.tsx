"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ItemsTable } from "./ItemsTable";
import type { ItemRow } from "./ItemsTable";
import { createList, updateList } from "@/lib/actions/lists";

interface DefaultValues {
  chantierId: string;
  chauffeurId: string;
  date: string;
  departureTime: string;
  responsable: string;
  notes: string;
  items: ItemRow[];
}

interface Props {
  chantiers: Array<{ id: string; name: string }>;
  chauffeurs: Array<{ id: string; name: string }>;
  defaultValues?: DefaultValues;
  listId?: string;
}

export function ListForm({ chantiers, chauffeurs, defaultValues, listId }: Props) {
  const router = useRouter();
  const [items, setItems] = useState<ItemRow[]>(defaultValues?.items ?? []);
  const [chantierId, setChantierId] = useState(defaultValues?.chantierId ?? "");
  const [chauffeurId, setChauffeurId] = useState(defaultValues?.chauffeurId ?? "");
  const [isPending, startTransition] = useTransition();

  const today = new Date().toISOString().split("T")[0];

  function buildFormData(form: HTMLFormElement): FormData {
    const formData = new FormData(form);
    formData.set("chantierId", chantierId);
    formData.set("chauffeurId", chauffeurId);
    formData.set("itemsJson", JSON.stringify(items));
    return formData;
  }

  function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = buildFormData(e.currentTarget);
    startTransition(async () => {
      if (listId) {
        await updateList(listId, formData);
      } else {
        await createList(formData, false);
      }
    });
  }

  function handleGenerate() {
    const form = document.querySelector("form") as HTMLFormElement;
    if (!form) return;
    const formData = buildFormData(form);
    startTransition(async () => {
      if (listId) {
        await updateList(listId, formData);
        router.push(`/lists/${listId}/print`);
      } else {
        await createList(formData, true);
      }
    });
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Chantier *</Label>
          <Select value={chantierId} onValueChange={setChantierId}>
            <SelectTrigger><SelectValue placeholder="Sélectionner…" /></SelectTrigger>
            <SelectContent>
              {chantiers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Chauffeur *</Label>
          <Select value={chauffeurId} onValueChange={setChauffeurId}>
            <SelectTrigger><SelectValue placeholder="Sélectionner…" /></SelectTrigger>
            <SelectContent>
              {chauffeurs.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Date de chargement *</Label>
          <Input type="date" name="date" defaultValue={defaultValues?.date ?? today} required />
        </div>
        <div className="space-y-2">
          <Label>Heure de départ</Label>
          <Input type="time" name="departureTime" defaultValue={defaultValues?.departureTime ?? "07:00"} />
        </div>
        <div className="space-y-2 col-span-2">
          <Label>Responsable chantier *</Label>
          <Input name="responsable" placeholder="Nom du responsable" defaultValue={defaultValues?.responsable ?? ""} required />
        </div>
        <div className="space-y-2 col-span-2">
          <Label>Notes</Label>
          <Textarea name="notes" placeholder="Instructions particulières…" rows={2} defaultValue={defaultValues?.notes ?? ""} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Matériel</Label>
        <ItemsTable items={items} onChange={setItems} />
      </div>

      <div className="flex gap-3">
        <Button type="submit" variant="outline" disabled={isPending}>
          {listId ? "Enregistrer les modifications" : "Enregistrer brouillon"}
        </Button>
        <Button
          type="button"
          className="bg-[#E07B3A] hover:bg-[#c96a2a]"
          disabled={isPending}
          onClick={handleGenerate}
        >
          Générer les 3 documents →
        </Button>
      </div>
    </form>
  );
}
