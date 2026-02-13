import { ThemeToggle } from "./ThemeToggle";
import type { Theme } from "../../../theme/theme-provider";
import { MenuIcon } from "../../../components/icons";

interface ShellHeaderProps {
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
}

export function ShellHeader({
  onToggleSidebar,
  sidebarOpen,
  theme,
  onThemeChange,
}: ShellHeaderProps) {
  return (
    <header className="sticky top-2 z-20 mb-2 flex items-center justify-between gap-3 bg-surface border border-border rounded-xl px-3 py-2 transition-colors duration-200">
      <div className="flex items-center gap-2.5">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden flex items-center justify-center w-7 h-7 text-text-secondary hover:text-text-primary hover:bg-raised rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          aria-expanded={sidebarOpen}
          aria-controls="app-shell-sidebar"
          aria-label={sidebarOpen ? "Close navigation" : "Open navigation"}
        >
          <MenuIcon className="h-4 w-4" />
        </button>
        <span className="text-[13px] font-medium text-text-secondary">Coordination</span>
      </div>

      <ThemeToggle value={theme} onChange={onThemeChange} />
    </header>
  );
}
