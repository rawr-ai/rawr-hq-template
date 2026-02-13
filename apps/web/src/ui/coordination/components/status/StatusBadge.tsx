import type React from "react";
import type { StatusTone } from "../../types/workflow";
import { cn } from "../../../lib/cn";

function toneClass(tone?: StatusTone): string {
  if (tone === "is-success") return "text-emerald-700 bg-emerald-500/10 border-emerald-500/30 dark:text-emerald-300";
  if (tone === "is-warning") return "text-amber-700 bg-amber-500/10 border-amber-500/30 dark:text-amber-300";
  if (tone === "is-error") return "text-red-700 bg-red-500/10 border-red-500/30 dark:text-red-300";
  return "text-text-secondary bg-raised border-border";
}

export function StatusBadge({
  children,
  tone = "",
  className,
}: {
  children: React.ReactNode;
  tone?: StatusTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold tracking-wide border transition-colors duration-200",
        toneClass(tone),
        className,
      )}
    >
      {children}
    </span>
  );
}
