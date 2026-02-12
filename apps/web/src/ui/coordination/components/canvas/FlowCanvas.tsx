import type React from "react";

export function FlowCanvas({ children }: { children: React.ReactNode }) {
  return <div className="coordination__canvas-body">{children}</div>;
}
