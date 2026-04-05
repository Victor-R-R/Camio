import type { DocumentProps } from "@/lib/types";

export function BonTransport({ list, company, bonNumber }: DocumentProps) {
  return (
    <div className="page-break font-sans text-sm text-gray-900 bg-white p-8 min-h-[297mm]">
      {/* En-tête */}
      <div className="flex justify-between items-start mb-6 pb-4 border-b-4 border-[#E07B3A]">
        <div>
          {company.logoUrl && (
            <img src={company.logoUrl} alt="Logo" className="h-16 object-contain mb-2" />
          )}
          <div className="font-bold text-base">{company.name}</div>
          {company.address && <div className="text-xs text-gray-500">{company.address}</div>}
          {company.phone && <div className="text-xs text-gray-500">{company.phone}</div>}
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-[#E07B3A]">BON DE TRANSPORT</div>
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

      {/* Infos */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="space-y-1">
          <div><span className="font-semibold">Chantier :</span> {list.chantier.name}</div>
          {list.chantier.address && (
            <div className="text-xs text-gray-500">{list.chantier.address}</div>
          )}
          <div><span className="font-semibold">Responsable :</span> {list.responsable}</div>
        </div>
        <div className="space-y-1">
          <div><span className="font-semibold">Chauffeur :</span> {list.chauffeur.name}</div>
          <div><span className="font-semibold">Départ prévu :</span> {list.departureTime}</div>
        </div>
      </div>

      {/* Tableau */}
      <table className="w-full border-collapse mb-6">
        <thead>
          <tr className="bg-[#E07B3A] text-white">
            <th className="border border-orange-300 p-2 text-left">Désignation</th>
            <th className="border border-orange-300 p-2 text-center w-24">Quantité</th>
            <th className="border border-orange-300 p-2 text-center w-20">Unité</th>
          </tr>
        </thead>
        <tbody>
          {list.items.map((item, i) => (
            <tr key={item.id} className={i % 2 === 0 ? "bg-white" : "bg-orange-50"}>
              <td className="border border-gray-200 p-2">{item.designation}</td>
              <td className="border border-gray-200 p-2 text-center font-mono">{item.quantity}</td>
              <td className="border border-gray-200 p-2 text-center">{item.unit}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {list.notes && (
        <div className="mb-6 p-3 bg-orange-50 border border-orange-200 rounded text-sm">
          <span className="font-semibold">Notes : </span>{list.notes}
        </div>
      )}

      {/* Signatures */}
      <div className="grid grid-cols-2 gap-8 mt-8">
        <div className="border-t-2 border-gray-300 pt-2">
          <div className="text-xs text-gray-500 mb-16">Signature chauffeur</div>
        </div>
        <div className="border-t-2 border-gray-300 pt-2">
          <div className="text-xs text-gray-500 mb-16">Réception chantier</div>
        </div>
      </div>
    </div>
  );
}
