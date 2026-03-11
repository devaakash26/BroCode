import { Skeleton } from "@/components/ui/skeleton";

export default function GroupsLoading() {
  return (
    <div className="container py-8 animate-in fade-in duration-300">
      {/* Hero Section Skeleton */}
      <div className="bg-gradient-to-r from-indigo-600 to-blue-500 rounded-xl shadow-lg overflow-hidden mb-10">
        <div className="px-8 py-12 sm:px-12">
          <Skeleton className="h-8 w-48 bg-white/20 rounded mb-3" />
          <Skeleton className="h-4 w-96 bg-white/20 rounded mb-6" />
          <div className="flex gap-3">
            <Skeleton className="h-10 w-32 bg-white/30 rounded-lg" />
            <Skeleton className="h-10 w-32 bg-white/30 rounded-lg" />
          </div>
        </div>
      </div>

      {/* My Groups Section */}
      <div className="mb-12">
        <div className="flex justify-between items-center mb-6">
          <div>
            <Skeleton className="h-8 w-32 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-32 rounded-lg" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden border border-gray-200 dark:border-gray-700">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3 flex-1">
                    <Skeleton className="h-12 w-12 rounded-lg" />
                    <div className="flex-1">
                      <Skeleton className="h-6 w-3/4 mb-2" />
                      <Skeleton className="h-4 w-20 rounded-full" />
                    </div>
                  </div>
                </div>
                
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-5/6 mb-4" />
                
                <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <Skeleton className="h-8 w-8 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Discover Groups Section */}
      <div>
        <div className="mb-6">
          <Skeleton className="h-8 w-40 mb-2" />
          <Skeleton className="h-4 w-80" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden border border-gray-200 dark:border-gray-700 hover:shadow-md transition">
              <div className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <Skeleton className="h-5 w-full max-w-[150px]" />
                </div>
                
                <Skeleton className="h-3 w-full mb-2" />
                <Skeleton className="h-3 w-4/5 mb-4" />
                
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-9 w-20 rounded-lg" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
