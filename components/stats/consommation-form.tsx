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

type ChantierOption = { id: string; name: string };
type MateriauOption = {
  id: string;
  designation: string;
  unit: string;
};

type Props = {
  chantiers: ChantierOption[];
  defaultChantierId?: string;
  materiaux: MateriauOption[];
  defaultMateriauId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ConsommationForm({
  chantiers,
  defaultChantierId,
  materiaux,
  defaultMateriauId,
  open,
  onOpenChange,
}: Props) {
  // Component unmounts between opens (parent uses conditional render), so initializers run fresh.
  const [selectedChantierId, setSelectedChantierId] = useState(
    defaultChantierId ?? chantiers[0]?.id ?? ""
  );
  const [selectedMateriauId, setSelectedMateriauId] = useState(
    defaultMateriauId ?? materiaux[0]?.id ?? ""
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
    if (isNaN(qty) || qty <= 0 || !selectedChantierId || !selectedMateriauId) return;
    startTransition(async () => {
      await createConsommationEntry({
        chantierId: selectedChantierId,
        materiauId: selectedMateriauId,
        quantity: qty,
        unit,
        date,
        notes: notes || null,
      });
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Saisir consommation</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1">
            <Label htmlFor="conso-chantier">Chantier</Label>
            <Select
              value={selectedChantierId}
              onValueChange={setSelectedChantierId}
            >
              <SelectTrigger id="conso-chantier">
                <SelectValue placeholder="Choisir un chantier" />
              </SelectTrigger>
              <SelectContent>
                {chantiers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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
            <Button
              type="submit"
              disabled={isPending || !selectedChantierId || !selectedMateriauId}
            >
              {isPending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
