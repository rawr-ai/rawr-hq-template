import type React from "react";
import type { StatusTone } from "../../types/workflow";

export function StatusBadge({
  children,
  tone = "",
}: {
  children: React.ReactNode;
  tone?: StatusTone;
}) {
  const className = tone ? `coordination__chip ${tone}` : "coordination__chip";
  return <span className={className}>{children}</span>;
}
