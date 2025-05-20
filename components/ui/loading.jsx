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