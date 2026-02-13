import * as React from "react";
import { cn } from "../../../lib/cn";

export function Toggle({
  pressed,
  onPressedChange,
  className,
  children,
  ...props
}: {
  pressed: boolean;
  onPressedChange: (next: boolean) => void;
  className?: string;
  children: React.ReactNode;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange" | "onClick">) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={() => onPressedChange(!pressed)}
      className={cn(
        "inline-flex items-center rounded-md border px-2.5 py-1.5 text-xs font-medium transition",
        pressed
          ? "border-primary/45 bg-primary text-primary-foreground"
          : "border-border bg-card text-muted-foreground hover:bg-muted",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
