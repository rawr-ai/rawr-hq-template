import type { Theme } from "../../../theme/theme-provider";

interface ThemeToggleProps {
  value: Theme;
  onChange: (theme: Theme) => void;
}

const OPTIONS: readonly { value: Theme; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

export function ThemeToggle({ value, onChange }: ThemeToggleProps) {
  return (
    <div className="flex items-center border border-border rounded-lg p-0.5 transition-colors duration-200" role="radiogroup" aria-label="Theme">
      {OPTIONS.map((option) => {
        const isActive = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => onChange(option.value)}
            className={`
              px-2.5 py-1 text-[12px] font-medium rounded-md transition-colors
              ${isActive ? "text-white bg-accent" : "text-text-muted hover:text-text-secondary"}
            `}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
