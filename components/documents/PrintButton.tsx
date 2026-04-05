"use client";

import { useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

interface Props {
  targetId: string;
}

export function PrintButton({ targetId }: Props) {
  const contentRef = useRef<Element | null>(null);

  const handlePrint = useReactToPrint({
    contentRef,
  });

  function handleClick() {
    const el = document.getElementById(targetId);
    if (el) {
      contentRef.current = el;
    }
    handlePrint();
  }

  return (
    <Button onClick={handleClick} className="bg-[#E07B3A] hover:bg-[#c96a2a]" size="lg">
      <Printer className="h-5 w-5 mr-2" />
      Imprimer les 3 bons
    </Button>
  );
}
