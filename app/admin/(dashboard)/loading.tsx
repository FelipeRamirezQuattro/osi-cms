import { Skeleton } from "@/components/admin/ui/skeleton";

export default function AdminLoading() {
  return (
    <div className="space-y-6" aria-label="Loading admin screen" role="status">
      <Skeleton className="h-8 w-52" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-28" />
        ))}
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}
