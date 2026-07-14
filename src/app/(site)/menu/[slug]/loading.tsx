import { Skeleton } from "@/components/ui/skeleton";

export default function ProductLoading() {
  return (
    <div className="container space-y-10 py-10">
      <Skeleton className="h-4 w-80 max-w-full" />
      <div className="grid gap-10 lg:grid-cols-2">
        <div className="space-y-3">
          <Skeleton className="aspect-[4/3] w-full rounded-lg" />
          <div className="flex gap-2">
            <Skeleton className="h-16 w-20 rounded-md" />
            <Skeleton className="h-16 w-20 rounded-md" />
          </div>
        </div>
        <div className="space-y-4">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    </div>
  );
}
