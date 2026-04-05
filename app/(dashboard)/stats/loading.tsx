import { Skeleton } from "@/components/ui/skeleton";

export default function StatsLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="flex gap-3">
        <Skeleton className="h-10 w-52" />
        <Skeleton className="h-10 w-52" />
        <Skeleton className="h-10 w-40" />
      </div>
      <div className="rounded-md border overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-4 px-4 py-3 border-t">
            {Array.from({ length: 8 }).map((_, j) => (
              <Skeleton key={j} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
