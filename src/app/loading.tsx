import { Skeleton } from "@/components/ui/skeleton";

/** Root loading state — warm skeleton mirroring the homepage layout. */
export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="border-b">
        <div className="container flex h-16 items-center justify-between">
          <Skeleton className="h-9 w-40" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-9 rounded-full" />
            <Skeleton className="h-9 w-24" />
          </div>
        </div>
      </div>
      <div className="container flex-1 space-y-8 py-12">
        <Skeleton className="h-[50vh] w-full rounded-lg" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-72 rounded-lg" />
          <Skeleton className="h-72 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
