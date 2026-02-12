import { useTheme, type Theme } from "./theme-provider";
import { Button } from "../components/ui/button";
import { cn } from "../lib/cn";

const OPTIONS: ReadonlyArray<{ label: string; value: Theme }> = [
  { label: "Light", value: "light" },
  { label: "Dark", value: "dark" },
  { label: "System", value: "system" },
];

export function ThemeSwitcher() {
  const { theme, resolvedTheme, setTheme } = useTheme();

  return (
    <section className="flex items-center gap-2" aria-label="Theme controls">
      <div className="inline-flex items-center rounded-md border border-border/80 bg-card/70 p-1 shadow-sm">
        {OPTIONS.map((option) => {
          const active = theme === option.value;
          return (
            <Button
              key={option.value}
              variant={active ? "primary" : "ghost"}
              size="sm"
              className={cn("min-w-[4.3rem]", active ? "shadow-sm" : "text-muted-foreground")}
              onClick={() => setTheme(option.value)}
              aria-pressed={active}
            >
              {option.label}
            </Button>
          );
        })}
      </div>
      <span className="hidden text-xs text-muted-foreground md:inline">Active: {resolvedTheme}</span>
    </section>
  );
}
