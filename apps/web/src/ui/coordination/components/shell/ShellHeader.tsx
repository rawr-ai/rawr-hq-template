import { ThemeToggle } from "./ThemeToggle";

export function ShellHeader() {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="kicker m-0">Coordination Host</p>
        <p className="m-0 text-sm text-muted-foreground">Canvas-first shell with unified theming</p>
      </div>
      <ThemeToggle />
    </div>
  );
}
