import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { BonTransport } from "@/components/documents/BonTransport";
import { FicheChargement } from "@/components/documents/FicheChargement";
import { BonSuivi } from "@/components/documents/BonSuivi";
import { PrintButton } from "@/components/documents/PrintButton";
import { CopyUrlButton } from "@/components/documents/CopyUrlButton";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getBonNumber } from "@/lib/utils/bonNumber";

export default async function PrintPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await params;

  const list = await prisma.loadingList.findUnique({
    where: { id },
    include: {
      chantier: true,
      chauffeur: true,
      items: { orderBy: { order: "asc" } },
    },
  });

  if (!list) notFound();

  const company = (await prisma.companySettings.findUnique({
    where: { id: "singleton" },
  })) ?? {
    id: "singleton",
    name: "Mon Entreprise",
    logoUrl: null,
    address: null,
    phone: null,
  };

  // Calculate bon number: count lists created same year up to and including this one
  const yearStart = new Date(`${list.createdAt.getFullYear()}-01-01`);
  const sequenceIndex = await prisma.loadingList.count({
    where: { createdAt: { gte: yearStart, lte: list.createdAt } },
  });
  const bonNumber = getBonNumber(list.createdAt, sequenceIndex);

  const shareUrl = `${process.env.NEXTAUTH_URL ?? process.env.AUTH_URL ?? "http://localhost:3000"}/check/${list.shareToken}`;

  return (
    <div>
      {/* Action bar — hidden on print */}
      <div className="print:hidden flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[#3D4A5C]">
            Aperçu des documents — {bonNumber}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Chantier : {list.chantier.name} · Chauffeur : {list.chauffeur.name}
          </p>
        </div>
        <div className="flex gap-3 items-center">
          <div className="flex items-center gap-2 text-sm text-muted-foreground border rounded px-3 py-2 bg-white">
            <span className="font-mono text-xs truncate max-w-48">{shareUrl}</span>
            <CopyUrlButton url={shareUrl} />
          </div>
          <Button variant="outline" asChild>
            <Link href={`/lists/${list.id}`}>← Modifier</Link>
          </Button>
          <PrintButton targetId="print-area" />
        </div>
      </div>

      {/* Print area */}
      <div id="print-area" className="space-y-8 print:space-y-0">
        <BonTransport list={list} company={company} bonNumber={bonNumber} />
        <FicheChargement list={list} company={company} bonNumber={bonNumber} />
        <BonSuivi list={list} company={company} bonNumber={bonNumber} shareUrl={shareUrl} />
      </div>
    </div>
  );
}
