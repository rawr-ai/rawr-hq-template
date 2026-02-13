import { useTheme as useHostTheme } from "../../theme/theme-provider";

export function useTheme() {
  const { theme, resolvedTheme, setTheme } = useHostTheme();
  return {
    theme,
    resolvedTheme,
    setTheme,
  };
}
