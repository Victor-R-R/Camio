"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ItemsTable } from "./ItemsTable";
import type { ItemRow } from "./ItemsTable";
import { createList, updateList } from "@/lib/actions/lists";
import { createChauffeurInline } from "@/lib/actions/catalogue";

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

export function ListForm({ chantiers, chauffeurs: initialChauffeurs, defaultValues, listId }: Props) {
  const router = useRouter();
  const [items, setItems] = useState<ItemRow[]>(defaultValues?.items ?? []);
  const [chantierId, setChantierId] = useState(defaultValues?.chantierId ?? "");
  const [chauffeurId, setChauffeurId] = useState(defaultValues?.chauffeurId ?? "");
  const [chauffeurs, setChauffeurs] = useState(initialChauffeurs);
  const [isPending, startTransition] = useTransition();

  // New chauffeur dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  async function handleCreateChauffeur() {
    if (!newName.trim()) return;
    setIsCreating(true);
    const created = await createChauffeurInline({ name: newName.trim(), phone: newPhone.trim() || undefined });
    setChauffeurs((prev) => [...prev, { id: created.id, name: created.name }].sort((a, b) => a.name.localeCompare(b.name)));
    setChauffeurId(created.id);
    setDialogOpen(false);
    setNewName("");
    setNewPhone("");
    setIsCreating(false);
  }

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
          <div className="flex items-center justify-between">
            <Label>Chauffeur *</Label>
            <button
              type="button"
              className="text-xs text-[#E07B3A] hover:underline"
              onClick={() => setDialogOpen(true)}
            >
              + Nouveau
            </button>
          </div>
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Nouveau chauffeur</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="new-chauffeur-name">Nom *</Label>
              <Input
                id="new-chauffeur-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nom du chauffeur"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-chauffeur-phone">Téléphone</Label>
              <Input
                id="new-chauffeur-phone"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="06 …"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isCreating}>
              Annuler
            </Button>
            <Button
              className="bg-[#E07B3A] hover:bg-[#c96a2a]"
              onClick={handleCreateChauffeur}
              disabled={!newName.trim() || isCreating}
            >
              {isCreating ? "Création…" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  );
}
