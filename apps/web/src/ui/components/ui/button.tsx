import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm text-sm font-semibold transition focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "border border-border/80 bg-card text-card-foreground shadow-sm hover:border-border hover:bg-muted/60",
        primary:
          "border border-primary/45 bg-primary text-primary-foreground hover:bg-primary/90",
        secondary:
          "border border-border/80 bg-secondary text-secondary-foreground hover:bg-secondary/85",
        ghost: "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
        destructive:
          "border border-destructive/50 bg-destructive text-destructive-foreground hover:bg-destructive/90",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-sm px-3 text-xs",
        lg: "h-10 rounded-md px-6",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type = "button", ...props }, ref) => {
    return <button ref={ref} type={type} className={cn(buttonVariants({ variant, size, className }))} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
