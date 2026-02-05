import type React from "react";

export function AppShell({
  sidebar,
  children,
}: {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        fontFamily: "ui-sans-serif, system-ui",
        background: "#0b0b0f",
        color: "#e8e8ef",
      }}
    >
      <aside
        style={{
          width: 260,
          padding: 16,
          borderRight: "1px solid rgba(255,255,255,0.08)",
          background: "#0f1016",
        }}
      >
        {sidebar}
      </aside>
      <main style={{ flex: 1, padding: 24 }}>{children}</main>
    </div>
  );
}

