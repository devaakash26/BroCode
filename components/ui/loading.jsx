import { cn } from "@/app/lib/utils";

export function Loading({ size = "default", className, ...props }) {
  const sizeClasses = {
    sm: "h-4 w-4",
    default: "h-6 w-6",
    lg: "h-8 w-8",
    xl: "h-10 w-10",
  };

  return (
    <div
      className={cn("flex items-center justify-center", className)}
      {...props}
    >
      <div className="relative">
        <div
          className={cn(
            "animate-spin rounded-full border-2 border-current border-t-transparent text-primary",
            sizeClasses[size] || sizeClasses.default
          )}
        />
      </div>
    </div>
  );
}

export function LoadingPage() {
  return (
    <div className="flex h-[calc(100vh-4rem)] w-full items-center justify-center">
      <Loading size="lg" />
    </div>
  );
}

export function LoadingOverlay({ message }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="flex flex-col items-center space-y-4">
        <Loading size="lg" />
        {message && <p className="text-sm text-muted-foreground">{message}</p>}
      </div>
    </div>
  );
}

export function GroupsSkeleton() {
  return (
    <div className="container py-8">
      {/* Hero Section Skeleton */}
      <div className="bg-gradient-to-r from-indigo-600 to-blue-500 rounded-xl shadow-lg overflow-hidden mb-10 animate-pulse">
        <div className="px-8 py-12 sm:px-12">
          <div className="h-8 w-48 bg-white/20 rounded mb-3"></div>
          <div className="h-4 w-96 bg-white/20 rounded"></div>
        </div>
      </div>

      {/* My Groups Section Skeleton */}
      <div className="mb-12">
        <div className="flex justify-between items-center mb-6">
          <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
              <div className="p-6">
                <div className="h-6 w-3/4 bg-gray-200 dark:bg-gray-700 rounded mb-3"></div>
                <div className="h-4 w-full bg-gray-100 dark:bg-gray-600 rounded mb-4"></div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 
