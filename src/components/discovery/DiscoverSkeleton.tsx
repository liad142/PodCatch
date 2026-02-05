import { Skeleton } from '@/components/ui/skeleton';

export function DiscoverSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Semantic Search */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 py-6 space-y-8">
        {/* Daily Mix Hero Skeleton */}
        <section>
          <div className="mb-4">
            <Skeleton className="h-6 w-32 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
          <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="w-[320px] sm:w-[400px] h-[200px] rounded-2xl flex-shrink-0" />
            ))}
          </div>
        </section>

        {/* Brand Shelf Skeleton */}
        <section>
          <Skeleton className="h-5 w-32 mb-3" />
          <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <Skeleton className="w-16 h-16 sm:w-20 sm:h-20 rounded-full" />
                <Skeleton className="w-14 h-3" />
              </div>
            ))}
          </div>
        </section>

        {/* Curiosity Feed Skeleton */}
        <section>
          <Skeleton className="h-5 w-32 mb-4" />
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-xl" />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
