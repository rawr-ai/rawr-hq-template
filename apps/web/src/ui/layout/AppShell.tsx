import type React from "react";
import { useEffect, useState } from "react";
import { ThemeSwitcher } from "../theme/theme-switcher";
import { Button } from "../components/ui";
import { cn } from "../lib/cn";

const SIDEBAR_ID = "app-shell-sidebar";
const MOBILE_MEDIA_QUERY = "(max-width: 960px)";

export function AppShell({
  sidebar,
  children,
}: {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}) {
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(MOBILE_MEDIA_QUERY);

    const updateMode = () => {
      setIsMobile(media.matches);
      if (!media.matches) {
        setSidebarOpen(false);
      }
    };

    updateMode();

    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", updateMode);
      return () => media.removeEventListener("change", updateMode);
    }

    media.addListener(updateMode);
    return () => media.removeListener(updateMode);
  }, []);

  useEffect(() => {
    if (!isMobile || !sidebarOpen) return;

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSidebarOpen(false);
      }
    };

    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [isMobile, sidebarOpen]);

  return (
    <div className="min-h-screen text-foreground">
      <a
        href="#app-shell-main"
        className="fixed left-2 top-2 z-50 -translate-y-40 rounded-sm border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground transition-transform focus-visible:translate-y-0"
      >
        Skip to main content
      </a>

      {isMobile ? (
        <button
          type="button"
          className={cn(
            "fixed inset-0 z-30 border-0 bg-black/45 p-0 transition-opacity",
            sidebarOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
          )}
          aria-hidden={!sidebarOpen}
          tabIndex={sidebarOpen ? 0 : -1}
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <div className="mx-auto grid min-h-screen w-full max-w-[1700px] grid-cols-1 gap-0 px-2 py-2 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside
          id={SIDEBAR_ID}
          className={cn(
            "surface-card z-40 flex h-[calc(100vh-1rem)] min-h-[600px] flex-col gap-4 p-4 lg:sticky lg:top-2",
            isMobile
              ? "fixed left-2 top-2 h-[calc(100vh-1rem)] w-[min(84vw,280px)] transition-transform duration-200"
              : "translate-x-0",
            isMobile && !sidebarOpen ? "-translate-x-[106%]" : "translate-x-0",
          )}
        >
          {sidebar}
        </aside>

        <main className="min-w-0 lg:pl-2">
          <header className="surface-card sticky top-2 z-20 mb-2 flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div>
              <p className="kicker m-0">Coordination Host</p>
              <p className="m-0 text-sm text-muted-foreground">Canvas-first shell with unified theming</p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                className="lg:hidden"
                variant="secondary"
                size="sm"
                aria-expanded={isMobile ? sidebarOpen : true}
                aria-controls={SIDEBAR_ID}
                onClick={() => setSidebarOpen((prev) => !prev)}
              >
                Navigation
              </Button>
              <ThemeSwitcher />
            </div>
          </header>

          <div id="app-shell-main" className="surface-card min-h-[calc(100vh-6.4rem)] p-4 md:p-5">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
