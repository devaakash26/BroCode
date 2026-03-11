import { Skeleton } from "@/components/ui/skeleton";

export default function GroupDetailLoading() {
  return (
    <div className="animate-in fade-in duration-300">
      {/* Hero Banner */}
      <div className="relative h-48 bg-gradient-to-r from-indigo-900/40 to-violet-900/40 mb-8">
        <div className="absolute inset-0 flex items-end p-8">
          <div className="flex items-end gap-6 w-full">
            <Skeleton className="h-24 w-24 rounded-xl bg-white/20" />
            <div className="flex-1 pb-2">
              <Skeleton className="h-8 w-64 bg-white/30 rounded mb-2" />
              <div className="flex gap-3">
                <Skeleton className="h-6 w-20 bg-white/20 rounded-full" />
                <Skeleton className="h-6 w-24 bg-white/20 rounded-full" />
                <Skeleton className="h-6 w-28 bg-white/20 rounded-full" />
              </div>
            </div>
            <Skeleton className="h-10 w-32 bg-white/30 rounded-lg" />
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="container mx-auto px-4 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content - Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* About Section */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              <Skeleton className="h-6 w-32 mb-4" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>

            {/* Challenges Section */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-10 w-36 rounded-lg" />
              </div>
              
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <Skeleton className="h-5 w-64 mb-2" />
                        <Skeleton className="h-4 w-32 rounded-full" />
                      </div>
                      <Skeleton className="h-6 w-20 rounded-full" />
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Chat Section */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <Skeleton className="h-6 w-32" />
              </div>
              <div className="h-96 p-4 space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex gap-3">
                    <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-12 w-full rounded-lg" />
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <Skeleton className="h-12 w-full rounded-lg" />
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Leaderboard Card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-5 w-5 rounded" />
              </div>
              
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
                    <Skeleton className="h-6 w-6 rounded-full" />
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-24 mb-1" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                    <Skeleton className="h-5 w-8 rounded" />
                  </div>
                ))}
              </div>
            </div>

            {/* Members Card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-9 w-28 rounded-lg" />
              </div>
              
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-32 mb-1" />
                      <Skeleton className="h-3 w-20 rounded-full" />
                    </div>
                    <Skeleton className="h-2 w-2 rounded-full" />
                  </div>
                ))}
              </div>
              
              <Skeleton className="h-10 w-full rounded-lg mt-4" />
            </div>

            {/* Quick Stats Card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
              <Skeleton className="h-6 w-32 mb-4" />
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-5 w-12 rounded-full" />
                </div>
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
