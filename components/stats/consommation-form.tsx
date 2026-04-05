"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createConsommationEntry } from "@/lib/actions/stats";

type Props = {
  chantierId: string;
  chantierName: string;
  materiauId: string;
  materiauDesignation: string;
  unit: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ConsommationForm({
  chantierId,
  chantierName,
  materiauId,
  materiauDesignation,
  unit,
  open,
  onOpenChange,
}: Props) {
  const [quantity, setQuantity] = useState("");
  const [date, setDate] = useState(
    () => new Date().toISOString().split("T")[0]
  );
  const [notes, setNotes] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) return;
    startTransition(async () => {
      await createConsommationEntry({
        chantierId,
        materiauId,
        quantity: qty,
        unit,
        date,
        notes: notes || null,
      });
      onOpenChange(false);
      setQuantity("");
      setNotes("");
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Saisir consommation</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {chantierName} — {materiauDesignation}
          </p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1">
            <Label htmlFor="conso-qty">Quantité ({unit})</Label>
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
            <Button type="submit" disabled={isPending}>
              {isPending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
