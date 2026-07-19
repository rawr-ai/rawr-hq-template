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
  { command: "hq up", description: "Start the managed HQ runtime" },
  { command: "hq down", description: "Stop the managed HQ runtime" },
  { command: "hq status", description: "Show managed HQ runtime status" },
  { command: "hq restart", description: "Restart the managed HQ runtime" },
  { command: "hq attach", description: "Attach to the managed HQ runtime log stream" },
  { command: "hq graph", description: "Launch the Nx graph explorer on demand" },
  { command: "routine check", description: "Run doctor + security + tests" },
  { command: "routine snapshot", description: "Write a routine snapshot packet" },
  { command: "tools export", description: "Export a list of known CLI commands" },
  { command: "sessions list", description: "List Claude/Codex sessions (provided by template example plugin)" },
  { command: "sessions resolve <id>", description: "Resolve a session id/path to a file (example plugin)" },
  { command: "sessions search --query-metadata <q>", description: "Search sessions by metadata (example plugin)" },
  { command: "sessions search --query <regex>", description: "Search sessions by transcript content (example plugin)" },
  { command: "sessions extract <id>", description: "Extract a session transcript (example plugin)" },
  { command: "agent plugins check", description: "Inspect curated source and release eligibility" },
  { command: "agent plugins vendors status", description: "Inspect declared vendor state" },
  { command: "agent plugins vendors update", description: "Author one reviewable declared vendor update" },
  { command: "agent plugins build", description: "Build immutable curated release artifacts" },
  { command: "agent plugins test", description: "Test explicit release artifacts against explicit provider homes" },
  { command: "agent plugins package", description: "Render a deterministic package at an explicit output" },
  { command: "agent plugins export", description: "Converge a managed explicit export destination" },
  { command: "agent plugins sync", description: "Converge an accepted channel at explicit provider homes" },
  { command: "agent plugins status", description: "Inspect accepted channel and provider state" },
  { command: "agent plugins retire", description: "Retire receipt-owned state from explicit provider homes" },
  { command: "agent plugins undo", description: "Replay the current controller-owned export capsule" },
  { command: "agent plugins attest-promotion", description: "Validate and attest governed promotion authority" },
  { command: "plugins install <pkg>", description: "Install an external oclif plugin (Channel A)" },
  { command: "plugins link <path>", description: "Link an external oclif plugin for development (Channel A)" },
  { command: "plugins list", description: "List external oclif plugins" },
  { command: "plugins inspect <pkg>", description: "Inspect an external oclif plugin" },
  { command: "plugins update [pkg]", description: "Update external oclif plugins" },
  { command: "plugins reset", description: "Reset external oclif plugin state" },
  { command: "plugins uninstall <pkg>", description: "Uninstall an external oclif plugin" },
  { command: "security check", description: "Run security checks" },
  { command: "security report", description: "Show the last security report" },
  { command: "security posture", description: "Write a security posture summary packet" },
  { command: "journal tail", description: "Show recent journal snippets" },
  { command: "journal search --query <q>", description: "Search journal snippets" },
  { command: "journal show <id>", description: "Show a specific snippet" },
  { command: "reflect", description: "Suggest commands/workflows based on journal" },
  { command: "workflow harden", description: "Run snapshot + security + posture workflow" },
  { command: "cli command create <topic> <name>", description: "Create one official CLI command" },
  { command: "cli extension create <id> --destination <path>", description: "Create portable external extension source" },
  { command: "agent plugins create <id> --content-workspace <path>", description: "Create curated agent-plugin content" },
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
