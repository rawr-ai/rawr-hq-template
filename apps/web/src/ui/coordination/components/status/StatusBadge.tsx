import type React from "react";
import type { StatusKind } from "../../types/workflow";
import { cn } from "../../../lib/cn";

function statusClass(status?: StatusKind): string {
  if (status === "success") return "text-emerald-700 bg-emerald-500/10 border-emerald-500/30 dark:text-emerald-300";
  if (status === "warning") return "text-amber-700 bg-amber-500/10 border-amber-500/30 dark:text-amber-300";
  if (status === "error") return "text-red-700 bg-red-500/10 border-red-500/30 dark:text-red-300";
  if (status === "info") return "text-sky-700 bg-sky-500/10 border-sky-500/30 dark:text-sky-300";
  return "text-text-secondary bg-raised border-border";
}

export function StatusBadge({
  children,
  status = "neutral",
  className,
}: {
  children: React.ReactNode;
  status?: StatusKind;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold tracking-wide border transition-colors duration-200",
        statusClass(status),
        className,
      )}
    >
      {children}
    </span>
  );
}
