import { Skeleton } from "@/components/ui/skeleton";

export function CardSkeleton() {
  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-4">
      <div className="space-y-3">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-4 w-4/5" />
        <div className="flex items-center space-x-4 pt-2">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-[100px]" />
            <Skeleton className="h-3 w-[120px]" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function TableRowSkeleton() {
  return (
    <div className="flex items-center space-x-4 p-4">
      <Skeleton className="h-12 w-12" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-[250px]" />
        <Skeleton className="h-3 w-[200px]" />
      </div>
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-[150px]" />
          <Skeleton className="h-4 w-[200px]" />
        </div>
      </div>
      <div className="space-y-4">
        <Skeleton className="h-8 w-[250px]" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-8 w-[180px]" />
      </div>
    </div>
  );
}

export function FormSkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-5 w-[80px]" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-5 w-[100px]" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-5 w-[120px]" />
        <Skeleton className="h-32 w-full" />
      </div>
      <div className="flex justify-end">
        <Skeleton className="h-10 w-[100px]" />
      </div>
    </div>
  );
} 

export function GroupChatSkeleton() {
  return (
    <div className="space-y-4 p-4 border rounded-lg">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-[150px]" />
        <Skeleton className="h-6 w-[100px]" />
      </div>
      <div className="space-y-4">
        {Array(3).fill(null).map((_, i) => (
          <div key={i} className="flex items-start space-x-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-[120px]" />
              <Skeleton className="h-16 w-full" />
            </div>
          </div>
        ))}
      </div>
      <Skeleton className="h-10 w-full mt-4" />
    </div>
  );
}

export function LeaderboardSkeleton() {
  return (
    <div className="space-y-4 p-4 border rounded-lg">
      <Skeleton className="h-8 w-[200px]" />
      <div className="space-y-3">
        {Array(5).fill(null).map((_, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Skeleton className="h-6 w-6" />
              <Skeleton className="h-4 w-[150px]" />
            </div>
            <Skeleton className="h-4 w-[80px]" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ChallengeSkeleton() {
  return (
    <div className="space-y-6 p-4 border rounded-lg">
      <div className="space-y-3">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      <div className="space-y-4">
        {Array(2).fill(null).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-6 w-[200px]" />
            <Skeleton className="h-20 w-full" />
          </div>
        ))}
      </div>
      <div className="flex justify-end space-x-3">
        <Skeleton className="h-10 w-[100px]" />
        <Skeleton className="h-10 w-[100px]" />
      </div>
    </div>
  );
}

export function ProblemSkeleton() {
  return (
    <div className="space-y-8 p-4 border rounded-lg">
      <div className="space-y-4">
        <Skeleton className="h-10 w-3/4" />
        <div className="flex space-x-4">
          <Skeleton className="h-6 w-[100px]" />
          <Skeleton className="h-6 w-[100px]" />
        </div>
      </div>
      <div className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-6 w-[150px]" />
        <Skeleton className="h-32 w-full" />
      </div>
      <div className="flex justify-end space-x-3">
        <Skeleton className="h-10 w-[120px]" />
        <Skeleton className="h-10 w-[120px]" />
      </div>
    </div>
  );
} 
