import React from "react";
import { Calendar, Clock } from "lucide-react";
import { Input } from "./input";
import { cn } from "@/lib/utils";

const DateTimePicker = React.forwardRef(({ 
  className, 
  icon = <Calendar className="h-4 w-4 text-muted-foreground" />,
  onChange,
  value,
  ...props 
}, ref) => {
  return (
    <div className="relative">
      <div className="absolute left-3 top-1/2 -translate-y-1/2">
        {icon}
      </div>
      <Input
        type="datetime-local"
        className={cn("pl-10", className)}
        ref={ref}
        value={value}
        onChange={onChange}
        {...props}
      />
    </div>
  );
});

DateTimePicker.displayName = "DateTimePicker";

export { DateTimePicker }; 
