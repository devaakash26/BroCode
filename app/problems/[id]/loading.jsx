import { Skeleton } from "@/components/ui/skeleton";

export default function ProblemDetailLoading() {
  return (
    <div className="container py-10 animate-in fade-in duration-300">
      {/* Back button */}
      <div className="mb-8">
        <Skeleton className="h-5 w-32" />
      </div>

      {/* Problem Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <Skeleton className="h-8 w-3/4 mb-3" />
            <div className="flex gap-3">
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-6 w-28 rounded-full" />
            </div>
          </div>
          <Skeleton className="h-10 w-32 rounded-lg" />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Side - Problem Description */}
        <div className="space-y-6">
          {/* Description Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <Skeleton className="h-5 w-5 rounded-full" />
              <Skeleton className="h-6 w-32" />
            </div>
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>

          {/* Examples Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <Skeleton className="h-5 w-5 rounded-full" />
              <Skeleton className="h-6 w-32" />
            </div>
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-16 w-full rounded" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-12 w-full rounded" />
                </div>
              ))}
            </div>
          </div>

          {/* Constraints Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <Skeleton className="h-5 w-5 rounded-full" />
              <Skeleton className="h-6 w-32" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/5" />
            </div>
          </div>
        </div>

        {/* Right Side - Code Editor */}
        <div className="space-y-4">
          {/* Editor Toolbar */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
            <div className="flex items-center justify-between mb-4">
              <Skeleton className="h-10 w-32" />
              <div className="flex gap-2">
                <Skeleton className="h-10 w-24" />
                <Skeleton className="h-10 w-24" />
              </div>
            </div>
          </div>

          {/* Code Editor Area */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden" style={{ height: '500px' }}>
            <div className="h-full p-4 space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-64" />
              <Skeleton className="h-4 w-56" />
              <Skeleton className="h-4 w-72" />
              <Skeleton className="h-4 w-44" />
              <Skeleton className="h-4 w-68" />
              <Skeleton className="h-4 w-52" />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Skeleton className="h-12 flex-1 rounded-lg" />
            <Skeleton className="h-12 w-40 rounded-lg" />
          </div>

          {/* Test Results Area */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <Skeleton className="h-6 w-32 mb-4" />
            <div className="space-y-3">
              <Skeleton className="h-20 w-full rounded-lg" />
              <Skeleton className="h-20 w-full rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
