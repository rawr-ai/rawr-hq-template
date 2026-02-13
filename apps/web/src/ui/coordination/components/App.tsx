import React, { useCallback, useState } from "react";
import { Sidebar, ShellHeader } from "./shell";
import { CoordinationPage } from "./CoordinationPage";
import { useTheme } from "../hooks/useTheme";

export function CoordinationApp() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  const handleToggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

  const handleCloseSidebar = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  return (
    <div className="min-h-screen w-full max-w-[1700px] mx-auto bg-page text-text-primary p-2 transition-colors duration-200">
      <a
        href="#coordination-main"
        className="fixed left-2 top-2 z-50 -translate-y-40 rounded-sm border border-border bg-surface px-3 py-2 text-xs font-semibold text-text-primary transition-transform focus-visible:translate-y-0"
      >
        Skip to main content
      </a>

      <Sidebar isOpen={sidebarOpen} onClose={handleCloseSidebar} />

      <main id="coordination-main" className="min-w-0 lg:ml-[280px] transition-[margin] duration-300">
        <ShellHeader
          onToggleSidebar={handleToggleSidebar}
          sidebarOpen={sidebarOpen}
          theme={theme}
          onThemeChange={setTheme}
        />

        <div className="bg-surface border border-border rounded-xl p-3 sm:p-5 min-h-[calc(100vh-72px)] transition-colors duration-200">
          <CoordinationPage />
        </div>
      </main>
    </div>
  );
}
