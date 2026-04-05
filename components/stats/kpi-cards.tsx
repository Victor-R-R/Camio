type Props = {
  listsCreated: number;
  listsDelivered: number;
  criticalCount: number;
  trackedCount: number;
};

export function KpiCards({
  listsCreated,
  listsDelivered,
  criticalCount,
  trackedCount,
}: Props) {
  const cards = [
    { icon: "📋", label: "Listes créées", value: listsCreated, sub: null },
    { icon: "✅", label: "Listes livrées", value: listsDelivered, sub: null },
    {
      icon: "⚠️",
      label: "Matériaux critiques",
      value: criticalCount,
      sub: "budget >90%",
    },
    {
      icon: "📦",
      label: "Matériaux suivis",
      value: trackedCount,
      sub: "avec allocation",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-white border border-slate-200 rounded-lg px-4 py-3"
        >
          <p className="text-xs text-slate-500 mb-1">
            {card.icon} {card.label}
          </p>
          <p className="text-2xl font-bold text-slate-800 leading-none">
            {card.value}
          </p>
          {card.sub && (
            <p className="text-[10px] text-slate-400 mt-0.5">{card.sub}</p>
          )}
        </div>
      ))}
    </div>
  );
}
