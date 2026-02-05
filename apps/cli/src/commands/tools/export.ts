import { RawrCommand } from "@rawr/core";

type ToolExport = {
  command: string;
  description: string;
  args?: string[];
};

const TOOLS: ToolExport[] = [
  { command: "doctor", description: "Sanity-check the RAWR HQ repo wiring" },
  { command: "dev up", description: "Start server + web dev stack" },
  { command: "tools export", description: "Export a list of known CLI commands" },
  { command: "plugins list", description: "List workspace plugins" },
  { command: "plugins enable <id>", description: "Enable a workspace plugin (gated)" },
  { command: "security check", description: "Run security checks" },
  { command: "security report", description: "Show the last security report" },
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
