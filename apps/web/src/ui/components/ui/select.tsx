import * as React from "react";
import { cn } from "../../lib/cn";

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
};

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "h-10 w-full rounded-sm border border-input bg-card px-3 py-2 text-sm text-foreground shadow-sm transition focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
  >
    {children}
  </select>
));
Select.displayName = "Select";

export { Select };
