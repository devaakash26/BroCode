import { forwardRef } from "react";
import { Button } from "@/components/ui/button";
import { Loading } from "@/components/ui/loading";
import { cn } from "@/app/lib/utils";

const ActionButton = forwardRef(({
  children,
  isLoading = false,
  loadingText,
  className,
  ...props
}, ref) => {
  return (
    <Button
      ref={ref}
      className={cn("relative", className)}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <Loading size="sm" />
        </span>
      )}
      <span className={cn(isLoading && "invisible")}>
        {isLoading && loadingText ? loadingText : children}
      </span>
    </Button>
  );
});

ActionButton.displayName = "ActionButton";

export { ActionButton }; 
