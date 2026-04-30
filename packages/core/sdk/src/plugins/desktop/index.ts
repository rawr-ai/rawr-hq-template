export type DesktopPluginSurface = "menubar" | "window" | "background";

export interface DesktopPluginInput {
  readonly capability: string;
  readonly entries?: readonly unknown[];
}

export interface DesktopPluginDefinition<TSurface extends DesktopPluginSurface = DesktopPluginSurface> {
  readonly kind: "plugin.desktop";
  readonly surface: TSurface;
  readonly capability: string;
  readonly id: string;
  readonly entries: readonly unknown[];
  readonly importSafety: "cold-declaration";
}

function defineDesktopPlugin<TSurface extends DesktopPluginSurface>(
  surface: TSurface,
  input: DesktopPluginInput,
): DesktopPluginDefinition<TSurface> {
  return {
    kind: "plugin.desktop",
    surface,
    capability: input.capability,
    id: `desktop.${surface}.${input.capability}`,
    entries: input.entries ?? [],
    importSafety: "cold-declaration",
  };
}

export function defineDesktopMenubarPlugin(input: DesktopPluginInput): DesktopPluginDefinition<"menubar"> {
  return defineDesktopPlugin("menubar", input);
}

export function defineDesktopWindowPlugin(input: DesktopPluginInput): DesktopPluginDefinition<"window"> {
  return defineDesktopPlugin("window", input);
}

export function defineDesktopBackgroundPlugin(input: DesktopPluginInput): DesktopPluginDefinition<"background"> {
  return defineDesktopPlugin("background", input);
}
