import { describe, expect, it } from "vitest";

import { claudeCapabilitiesFromHelp } from "../../../../src/lib/agent-plugins/service-runtime/providers/adapters/node-claude";
import { codexCapabilitiesFromHelp } from "../../../../src/lib/agent-plugins/service-runtime/providers/adapters/node-codex";
import type { ProviderCapability } from "@rawr/agent-plugin-lifecycle/ports/providers";

const EXPECTED_CAPABILITIES = Object.freeze([
  "managed-retire",
  "native-plugin-enable",
  "native-plugin-install",
  "visible-hook-inventory",
  "visible-plugin-inventory",
  "visible-skill-inventory",
] satisfies readonly ProviderCapability[]);

const MARKETPLACE_LINES = Object.freeze({
  add: "  add      Add a marketplace",
  list: "  list     List marketplaces",
  remove: "  remove   Remove a marketplace",
});

const CODEX_PLUGIN_LINES = Object.freeze({
  add: "  add          Install a plugin",
  list: "  list         List plugins",
  remove: "  remove       Remove a plugin",
});

const CLAUDE_PLUGIN_LINES = Object.freeze({
  enable: "  enable [options] <plugin>            Enable a plugin",
  install: "  install|i [options] <plugin>         Install a plugin",
  list: "  list [options]                       List plugins",
  uninstall: "  uninstall|remove [options] <plugin>  Uninstall a plugin",
});

type CapabilityProbe = (pluginHelp: string, marketplaceHelp: string) => readonly ProviderCapability[];
type HelpSurface = "plugin" | "marketplace";

interface PrerequisiteCase {
  readonly provider: "Codex" | "Claude";
  readonly probe: CapabilityProbe;
  readonly pluginHelp: string;
  readonly marketplaceHelp: string;
  readonly surface: HelpSurface;
  readonly command: string;
  readonly line: string;
  readonly removedCapabilities: readonly ProviderCapability[];
}

const MARKETPLACE_HELP = renderHelp(Object.values(MARKETPLACE_LINES));
const CODEX_PLUGIN_HELP = renderHelp(Object.values(CODEX_PLUGIN_LINES));
const CLAUDE_PLUGIN_HELP = renderHelp(Object.values(CLAUDE_PLUGIN_LINES));

const PREREQUISITE_CASES = Object.freeze([
  prerequisite("Codex", codexCapabilitiesFromHelp, CODEX_PLUGIN_HELP, "plugin", "add", CODEX_PLUGIN_LINES.add, [
    "native-plugin-enable",
    "native-plugin-install",
  ]),
  prerequisite("Codex", codexCapabilitiesFromHelp, CODEX_PLUGIN_HELP, "plugin", "list", CODEX_PLUGIN_LINES.list, [
    "native-plugin-enable",
    "visible-hook-inventory",
    "visible-plugin-inventory",
    "visible-skill-inventory",
  ]),
  prerequisite("Codex", codexCapabilitiesFromHelp, CODEX_PLUGIN_HELP, "plugin", "remove", CODEX_PLUGIN_LINES.remove, [
    "managed-retire",
  ]),
  prerequisite("Codex", codexCapabilitiesFromHelp, CODEX_PLUGIN_HELP, "marketplace", "add", MARKETPLACE_LINES.add, [
    "native-plugin-install",
  ]),
  prerequisite("Codex", codexCapabilitiesFromHelp, CODEX_PLUGIN_HELP, "marketplace", "list", MARKETPLACE_LINES.list, [
    "managed-retire",
    "native-plugin-install",
  ]),
  prerequisite("Codex", codexCapabilitiesFromHelp, CODEX_PLUGIN_HELP, "marketplace", "remove", MARKETPLACE_LINES.remove, [
    "managed-retire",
  ]),
  prerequisite("Claude", claudeCapabilitiesFromHelp, CLAUDE_PLUGIN_HELP, "plugin", "enable", CLAUDE_PLUGIN_LINES.enable, [
    "native-plugin-enable",
  ]),
  prerequisite("Claude", claudeCapabilitiesFromHelp, CLAUDE_PLUGIN_HELP, "plugin", "install|i", CLAUDE_PLUGIN_LINES.install, [
    "native-plugin-install",
  ]),
  prerequisite("Claude", claudeCapabilitiesFromHelp, CLAUDE_PLUGIN_HELP, "plugin", "list", CLAUDE_PLUGIN_LINES.list, [
    "native-plugin-enable",
    "visible-hook-inventory",
    "visible-plugin-inventory",
    "visible-skill-inventory",
  ]),
  prerequisite("Claude", claudeCapabilitiesFromHelp, CLAUDE_PLUGIN_HELP, "plugin", "uninstall|remove", CLAUDE_PLUGIN_LINES.uninstall, [
    "managed-retire",
  ]),
  prerequisite("Claude", claudeCapabilitiesFromHelp, CLAUDE_PLUGIN_HELP, "marketplace", "add", MARKETPLACE_LINES.add, [
    "native-plugin-install",
  ]),
  prerequisite("Claude", claudeCapabilitiesFromHelp, CLAUDE_PLUGIN_HELP, "marketplace", "list", MARKETPLACE_LINES.list, [
    "managed-retire",
    "native-plugin-install",
  ]),
  prerequisite("Claude", claudeCapabilitiesFromHelp, CLAUDE_PLUGIN_HELP, "marketplace", "remove", MARKETPLACE_LINES.remove, [
    "managed-retire",
  ]),
] satisfies readonly PrerequisiteCase[]);

describe("node provider capability probes", () => {
  it.each([
    ["Codex", codexCapabilitiesFromHelp, CODEX_PLUGIN_HELP],
    ["Claude", claudeCapabilitiesFromHelp, CLAUDE_PLUGIN_HELP],
  ] as const)("derives the complete %s capability profile from observed commands", (_provider, probe, pluginHelp) => {
    expect(probe(pluginHelp, MARKETPLACE_HELP)).toEqual(EXPECTED_CAPABILITIES);
  });

  it.each(PREREQUISITE_CASES)(
    "$provider removes $removedCapabilities when $surface command $command is absent",
    ({ probe, pluginHelp, marketplaceHelp, surface, line, removedCapabilities }) => {
      const observed = probe(
        surface === "plugin" ? withoutLine(pluginHelp, line) : pluginHelp,
        surface === "marketplace" ? withoutLine(marketplaceHelp, line) : marketplaceHelp,
      );

      for (const capability of removedCapabilities) expect(observed).not.toContain(capability);
    },
  );
});

function prerequisite(
  provider: PrerequisiteCase["provider"],
  probe: CapabilityProbe,
  pluginHelp: string,
  surface: HelpSurface,
  command: string,
  line: string,
  removedCapabilities: readonly ProviderCapability[],
): PrerequisiteCase {
  return Object.freeze({
    provider,
    probe,
    pluginHelp,
    marketplaceHelp: MARKETPLACE_HELP,
    surface,
    command,
    line,
    removedCapabilities: Object.freeze([...removedCapabilities]),
  });
}

function renderHelp(lines: readonly string[]): string {
  return `Commands:\n${lines.join("\n")}\n`;
}

function withoutLine(help: string, line: string): string {
  const removed = help.replace(`${line}\n`, "");
  if (removed === help) throw new Error("capability prerequisite fixture line is missing");
  return removed;
}
