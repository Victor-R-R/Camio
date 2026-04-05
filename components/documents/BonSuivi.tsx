import type { DocumentProps } from "@/lib/types";

interface BonSuiviProps extends DocumentProps {
  shareUrl: string;
}

export function BonSuivi({ list, company, bonNumber, shareUrl }: BonSuiviProps) {
  return (
    <div className="page-break font-sans text-sm text-gray-900 bg-white p-8 min-h-[297mm]">
      <div className="flex justify-between items-start mb-6 pb-4 border-b-4 border-[#1E3A5F]">
        <div>
          {company.logoUrl && (
            <img src={company.logoUrl} alt="Logo" className="h-16 object-contain mb-2" />
          )}
          <div className="font-bold text-base">{company.name}</div>
          {company.address && <div className="text-xs text-gray-500">{company.address}</div>}
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-[#1E3A5F]">BON DE SUIVI</div>
          <div className="font-mono text-lg font-bold">{bonNumber}</div>
          <div className="text-xs text-gray-500 mt-1">
            {new Date(list.date).toLocaleDateString("fr-FR", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="space-y-1">
          <div><span className="font-semibold">Chantier :</span> {list.chantier.name}</div>
          <div><span className="font-semibold">Responsable :</span> {list.responsable}</div>
        </div>
        <div className="space-y-1">
          <div><span className="font-semibold">Chauffeur :</span> {list.chauffeur.name}</div>
          <div><span className="font-semibold">Départ prévu :</span> {list.departureTime}</div>
        </div>
      </div>

      <table className="w-full border-collapse mb-6">
        <thead>
          <tr className="bg-[#1E3A5F] text-white">
            <th className="border border-blue-300 p-2 text-left">Désignation</th>
            <th className="border border-blue-300 p-2 text-center w-24">Quantité</th>
            <th className="border border-blue-300 p-2 text-center w-20">Unité</th>
          </tr>
        </thead>
        <tbody>
          {list.items.map((item, i) => (
            <tr key={item.id} className={i % 2 === 0 ? "bg-white" : "bg-blue-50"}>
              <td className="border border-gray-200 p-2">{item.designation}</td>
              <td className="border border-gray-200 p-2 text-center font-mono">{item.quantity}</td>
              <td className="border border-gray-200 p-2 text-center">{item.unit}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {list.notes && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
          <span className="font-semibold">Notes : </span>{list.notes}
        </div>
      )}

      <div className="mb-6 p-3 bg-gray-50 border rounded text-xs">
        <span className="font-semibold">Lien suivi magasinier : </span>
        <span className="font-mono">{shareUrl}</span>
      </div>

      <div className="grid grid-cols-3 gap-4 mt-6">
        <div className="border-t-2 border-gray-300 pt-2">
          <div className="text-xs text-gray-500 mb-16">Date retour</div>
        </div>
        <div className="border-t-2 border-gray-300 pt-2">
          <div className="text-xs text-gray-500 mb-16">Signature bureau</div>
        </div>
        <div className="border-t-2 border-gray-300 pt-2">
          <div className="text-xs text-gray-500 mb-16">Signature client</div>
        </div>
      </div>
    </div>
  );
}
