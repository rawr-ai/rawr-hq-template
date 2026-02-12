import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/cn";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium tracking-[0.01em] transition-colors",
  {
    variants: {
      variant: {
        neutral: "border-border/90 bg-muted/60 text-muted-foreground",
        success: "border-success/50 bg-success/15 text-success",
        warning: "border-warning/50 bg-warning/15 text-warning",
        destructive: "border-destructive/50 bg-destructive/15 text-destructive",
        accent: "border-primary/45 bg-primary/15 text-primary",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  },
);

export type BadgeProps = React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>;

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
