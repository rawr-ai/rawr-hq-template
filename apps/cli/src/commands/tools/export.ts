import { RawrCommand } from "@rawr/core";

type ToolExport = {
  command: string;
  description: string;
  args?: string[];
};

const TOOLS: ToolExport[] = [
  { command: "doctor", description: "Sanity-check the RAWR HQ repo wiring" },
  { command: "dev up", description: "Start server + web dev stack" },
  { command: "routine check", description: "Run doctor + security + tests" },
  { command: "routine start", description: "Start dev stack (alias)" },
  { command: "routine snapshot", description: "Write a routine snapshot packet" },
  { command: "tools export", description: "Export a list of known CLI commands" },
  { command: "plugins list", description: "List workspace plugins" },
  { command: "plugins enable <id>", description: "Enable a workspace plugin (gated)" },
  { command: "plugins disable <id>", description: "Disable a workspace plugin (persisted)" },
  { command: "plugins status", description: "Show whether workspace plugins are enabled" },
  { command: "security check", description: "Run security checks" },
  { command: "security report", description: "Show the last security report" },
  { command: "journal tail", description: "Show recent journal snippets" },
  { command: "journal search --query <q>", description: "Search journal snippets" },
  { command: "journal show <id>", description: "Show a specific snippet" },
  { command: "reflect", description: "Suggest commands/workflows based on journal" },
  { command: "workflow harden", description: "Run snapshot + security + posture workflow" },
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
