import { Skeleton } from "@/components/ui/skeleton";

export default function ProblemsLoading() {
  return (
    <div className="container mx-auto px-4 py-8 animate-in fade-in duration-300">
      {/* Header Skeleton */}
      <div className="mb-8">
        <Skeleton className="h-10 w-48 mb-2" />
        <Skeleton className="h-5 w-96" />
      </div>

      {/* Filters Skeleton */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>

      {/* Stats Bar Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-lg p-4">
            <Skeleton className="h-4 w-20 mb-2" />
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>

      {/* Problems List Skeleton */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
        {/* Table Header */}
        <div className="bg-gray-50 dark:bg-gray-900 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-12 gap-4">
            <Skeleton className="h-4 w-12 col-span-1" />
            <Skeleton className="h-4 w-32 col-span-5" />
            <Skeleton className="h-4 w-24 col-span-2" />
            <Skeleton className="h-4 w-20 col-span-2" />
            <Skeleton className="h-4 w-16 col-span-2" />
          </div>
        </div>

        {/* Table Rows */}
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
            <div key={i} className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
              <div className="grid grid-cols-12 gap-4 items-center">
                {/* Status */}
                <div className="col-span-1">
                  <Skeleton className="h-5 w-5 rounded-full" />
                </div>
                
                {/* Title */}
                <div className="col-span-5">
                  <Skeleton className="h-5 w-3/4 mb-2" />
                  <div className="flex gap-2">
                    <Skeleton className="h-4 w-16 rounded-full" />
                    <Skeleton className="h-4 w-20 rounded-full" />
                  </div>
                </div>

                {/* Difficulty */}
                <div className="col-span-2">
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>

                {/* Acceptance */}
                <div className="col-span-2">
                  <Skeleton className="h-4 w-16" />
                </div>

                {/* Actions */}
                <div className="col-span-2 flex justify-end gap-2">
                  <Skeleton className="h-8 w-8 rounded" />
                  <Skeleton className="h-8 w-20 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pagination Skeleton */}
      <div className="mt-6 flex items-center justify-between">
        <Skeleton className="h-10 w-32" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-10 rounded" />
          <Skeleton className="h-10 w-10 rounded" />
          <Skeleton className="h-10 w-10 rounded" />
          <Skeleton className="h-10 w-10 rounded" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
    </div>
  );
}
