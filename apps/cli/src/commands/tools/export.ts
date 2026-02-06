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
  { command: "hq plugins list", description: "List RAWR HQ workspace runtime plugins" },
  { command: "hq plugins enable <id>", description: "Enable a RAWR HQ workspace runtime plugin (gated)" },
  { command: "hq plugins disable <id>", description: "Disable a RAWR HQ workspace runtime plugin (persisted)" },
  { command: "hq plugins status", description: "Show whether RAWR HQ workspace runtime plugins are enabled" },
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
  { command: "workflow forge-command", description: "Forge a new durable command via the factory" },
  { command: "workflow demo-mfe", description: "Enable + build + verify micro-frontend demo plugin" },
  { command: "factory command new <topic> <name>", description: "Generate a new CLI command + test" },
  { command: "factory workflow new <name>", description: "Generate a new workflow command + test" },
  { command: "factory plugin new <dirName>", description: "Generate a new plugin package skeleton" },
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
