import { Skeleton, SkeletonText } from '@/ui/Skeleton';

/** Matches LearningPath's layout (header, action plan, module timeline) to avoid layout shift. */
export default function LearningPathSkeleton({ modules = 3 }: { modules?: number }) {
  return (
    <div className="p-4 md:p-6">
      <Skeleton className="mb-2 h-6 w-40" />
      <Skeleton className="mb-6 h-8 w-3/4 md:h-9" />
      <div className="rounded-card bg-surface-muted p-4 md:p-5">
        <Skeleton className="mb-3 h-6 w-48 bg-border" />
        <SkeletonText lines={5} />
      </div>
      <Skeleton className="mt-8 mb-4 h-6 w-36" />
      <div className="space-y-10 border-l-4 border-dashed border-border pl-6">
        {Array.from({ length: modules }, (_, i) => (
          <Skeleton key={i} className="h-24 rounded-card" />
        ))}
      </div>
    </div>
  );
}
