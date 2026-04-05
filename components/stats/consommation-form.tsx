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
  // Component unmounts between opens (parent uses conditional render),
  // so this initializer always runs fresh.
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
