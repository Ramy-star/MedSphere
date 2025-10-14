import { Skeleton } from "@/components/ui/skeleton";

export default function EmptyStateSkeleton() {
  return (
    <div className="w-full max-w-sm space-y-3">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="flex items-center space-x-4">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-4 flex-1" />
        </div>
      ))}
    </div>
  );
}
