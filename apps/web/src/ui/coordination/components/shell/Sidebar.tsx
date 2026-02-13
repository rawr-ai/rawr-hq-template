import { useEffect } from "react";
import type { CoordinationNavItem } from "./NavItem";
import { NavItem } from "./NavItem";
import { CloseIcon } from "../../../components/icons";

const NAV_ITEMS: readonly CoordinationNavItem[] = [
  { label: "Home", to: "/", icon: "home" },
  { label: "Mounts", to: "/mounts", icon: "layers" },
  { label: "Coordination", to: "/coordination", icon: "network" },
];

export function Sidebar({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  return (
    <>
      {isOpen ? (
        <button
          type="button"
          className="fixed inset-0 bg-overlay z-30 lg:hidden"
          aria-label="Close navigation"
          onClick={onClose}
        />
      ) : null}

      <aside
        id="app-shell-sidebar"
        className={`
          fixed top-2 left-2 z-40 w-[264px] flex flex-col
          bg-surface border border-border rounded-xl p-3
          transition-all duration-200 ease-out
          ${isOpen ? "translate-x-0" : "-translate-x-[calc(100%+16px)]"}
          lg:translate-x-0
        `}
        style={{ height: "calc(100vh - 16px)" }}
      >
        <div className="pb-3 mb-3 border-b border-border-subtle">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[1.2px] text-text-muted mb-0.5">Host Shell</p>
              <p className="text-[16px] font-semibold tracking-[-0.3px] text-text-primary">RAWR HQ-Template</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="lg:hidden p-1 -mr-0.5 text-text-muted hover:text-text-primary rounded-md transition-colors"
              aria-label="Close navigation"
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        <nav aria-label="Primary" className="flex flex-col gap-0.5">
          {NAV_ITEMS.map((item) => (
            <NavItem key={item.to} item={item} />
          ))}
        </nav>
      </aside>
    </>
  );
}
