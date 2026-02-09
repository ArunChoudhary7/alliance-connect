import { Skeleton } from "@/components/ui/skeleton";

export function PostSkeleton() {
  return (
    <div className="super-card mb-8 opacity-60">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-2 w-16" />
        </div>
      </div>

      {/* Content */}
      <div className="space-y-3">
        <Skeleton className="h-4 w-[90%]" />
        <Skeleton className="h-4 w-[40%]" />
        {/* Media Box */}
        <Skeleton className="h-64 w-full rounded-[2rem]" />
      </div>

      {/* Footer */}
      <div className="flex items-center gap-4 mt-6 pt-4 border-t border-white/5">
        <Skeleton className="h-8 w-16 rounded-full" />
        <Skeleton className="h-8 w-16 rounded-full" />
      </div>
    </div>
  );
}

export function FeedSkeleton() {
  return (
    <div className="space-y-6">
      {/* Create Post Skeleton */}
      <div className="super-card mb-8 opacity-40">
        <div className="flex gap-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <Skeleton className="h-14 flex-1 rounded-2xl" />
        </div>
      </div>
      
      {/* Post Skeletons */}
      <PostSkeleton />
      <PostSkeleton />
    </div>
  );
}