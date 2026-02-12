import type React from "react";
import { useEffect, useState } from "react";
import "../styles/tokens.css";
import "../styles/app-shell.css";

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

  const sidebarClasses = `app-shell__sidebar${isMobile && sidebarOpen ? " is-open" : ""}`;
  const backdropClasses = `app-shell__backdrop${isMobile && sidebarOpen ? " is-open" : ""}`;

  return (
    <div className="app-shell">
      <a href="#app-shell-main" className="app-shell__skip-link">
        Skip to main content
      </a>

      <button
        type="button"
        className={backdropClasses}
        aria-hidden={!isMobile || !sidebarOpen}
        tabIndex={isMobile && sidebarOpen ? 0 : -1}
        onClick={() => setSidebarOpen(false)}
      />

      <aside id={SIDEBAR_ID} className={sidebarClasses}>
        {sidebar}
      </aside>

      <main className="app-shell__main">
        <div className="app-shell__mobile-bar">
          <button
            type="button"
            className="app-shell__menu-button"
            aria-expanded={isMobile ? sidebarOpen : true}
            aria-controls={SIDEBAR_ID}
            onClick={() => setSidebarOpen((prev) => !prev)}
          >
            Navigation
          </button>
        </div>
        <div id="app-shell-main" className="app-shell__content">
          {children}
        </div>
      </main>
    </div>
  );
}
