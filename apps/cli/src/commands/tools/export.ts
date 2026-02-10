import { RawrCommand } from "@rawr/core";

type ToolExport = {
  command: string;
  description: string;
  args?: string[];
};

const TOOLS: ToolExport[] = [
  { command: "config show", description: "Show rawr.config.ts (if present)" },
  { command: "config validate", description: "Validate rawr.config.ts (if present)" },
  { command: "doctor", description: "Sanity-check the RAWR HQ-Template repo wiring" },
  { command: "dev up", description: "Start server + web dev stack" },
  { command: "routine check", description: "Run doctor + security + tests" },
  { command: "routine start", description: "Start dev stack (alias)" },
  { command: "routine snapshot", description: "Write a routine snapshot packet" },
  { command: "tools export", description: "Export a list of known CLI commands" },
  { command: "sessions list", description: "List Claude/Codex sessions (provided by template example plugin)" },
  { command: "sessions resolve <id>", description: "Resolve a session id/path to a file (example plugin)" },
  { command: "sessions search --query-metadata <q>", description: "Search sessions by metadata (example plugin)" },
  { command: "sessions search --query <regex>", description: "Search sessions by transcript content (example plugin)" },
  { command: "sessions extract <id>", description: "Extract a session transcript (example plugin)" },
  { command: "plugins web list", description: "List workspace runtime web plugins" },
  { command: "plugins web enable <id>", description: "Enable a workspace runtime web plugin (gated)" },
  { command: "plugins web disable <id>", description: "Disable a workspace runtime web plugin (persisted)" },
  { command: "plugins web status", description: "Show whether workspace runtime web plugins are enabled" },
  { command: "plugins web enable all", description: "Enable all workspace runtime web plugins (gated)" },
  { command: "plugins cli install all", description: "Link all workspace command plugins into the local oclif manager" },
  { command: "plugins sync all", description: "Canonical full plugin sync (Codex + Claude + Cowork + orphan retirement)" },
  { command: "plugins sync <plugin-ref>", description: "Sync a single plugin source (focused/debug path)" },
  { command: "plugins sync drift", description: "Report material plugin drift (ignores metadata-only upserts by default)" },
  { command: "plugins sync sources list", description: "List explicit sync sources from ~/.rawr/config.json" },
  { command: "plugins sync sources add <path>", description: "Add an explicit sync source path to ~/.rawr/config.json" },
  { command: "plugins sync sources remove <path>", description: "Remove an explicit sync source path from ~/.rawr/config.json" },
  { command: "undo", description: "Undo the last undo-capable mutating command (currently: plugin sync)" },
  { command: "plugins install <pkg>", description: "Install an external oclif plugin (Channel A)" },
  { command: "plugins link <path>", description: "Link an external oclif plugin for development (Channel A)" },
  { command: "security check", description: "Run security checks" },
  { command: "security report", description: "Show the last security report" },
  { command: "security posture", description: "Write a security posture summary packet" },
  { command: "journal tail", description: "Show recent journal snippets" },
  { command: "journal search --query <q>", description: "Search journal snippets" },
  { command: "journal show <id>", description: "Show a specific snippet" },
  { command: "reflect", description: "Suggest commands/workflows based on journal" },
  { command: "workflow harden", description: "Run snapshot + security + posture workflow" },
  { command: "workflow forge-command", description: "Forge a new durable command via plugin scaffolding" },
  { command: "workflow demo-mfe", description: "Enable + build + verify micro-frontend demo plugin" },
  { command: "workflow coord create --id <workflow-id>", description: "Create a typed coordination workflow scaffold" },
  { command: "workflow coord validate <workflow-id>", description: "Validate a coordination workflow" },
  { command: "workflow coord run <workflow-id>", description: "Run a coordination workflow" },
  { command: "workflow coord status <run-id>", description: "Show coordination run status" },
  { command: "workflow coord trace <run-id>", description: "Show trace links for a coordination run" },
  { command: "plugins scaffold command <topic> <name>", description: "Generate a new CLI command + test" },
  { command: "plugins scaffold workflow <name>", description: "Generate a new workflow command + test" },
  { command: "plugins scaffold web-plugin <dirName>", description: "Generate a new plugin package skeleton" },
];

export default class ToolsExport extends RawrCommand {
  static description = "Export a list of known CLI commands";

  static flags = {
    ...RawrCommand.baseFlags,
  } as const;

  async run() {
    const { flags } = await this.parseRawr(ToolsExport);
    const baseFlags = RawrCommand.extractBaseFlags(flags);

    const result = this.ok({ tools: TOOLS });
    this.outputResult(result, {
      flags: baseFlags,
      human: () => {
        for (const tool of TOOLS) this.log(`${tool.command} - ${tool.description}`);
      },
    });
  }
}
