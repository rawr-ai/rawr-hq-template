import { Args, Flags } from "@oclif/core";
import { RawrCommand } from "@rawr/core";
import { resolveSession, type OutputFormat, type SessionSourceFilter } from "@rawr/session-tools";
import { ensureDir, writeJsonFile } from "../../lib/out-dir";

function formatResolveHuman(input: unknown, format: OutputFormat): string {
  if (format === "json") return JSON.stringify(input, null, 2);
  if (format === "markdown") {
    return ["# Session Resolve", "", "```json", JSON.stringify(input, null, 2), "```", ""].join("\n");
  }
  const resolved = input as any;
  const p = resolved?.resolved?.path ? String(resolved.resolved.path) : JSON.stringify(input);
  return p;
}

export default class SessionsResolve extends RawrCommand {
  static description = "Resolve a session id/path to a concrete file";

  static args = {
    session: Args.string({ required: true, description: "Session id/prefix or path" }),
  } as const;

  static flags = {
    ...RawrCommand.baseFlags,
    source: Flags.string({
      description: "Session source",
      options: ["claude", "codex", "all"],
      default: "all",
    }),
    format: Flags.string({
      description: "Human output format",
      options: ["json", "text", "markdown"],
      default: "json",
    }),
    "out-dir": Flags.string({ description: "Write metadata.json to a directory" }),
    quiet: Flags.boolean({ description: "Suppress human output", default: false }),
  } as const;

  async run() {
    const { args, flags } = await this.parseRawr(SessionsResolve);
    const baseFlags = RawrCommand.extractBaseFlags(flags);
    const source = String(flags.source) as SessionSourceFilter;
    const session = String(args.session);
    const format = String(flags.format) as OutputFormat;

    const resolved = await resolveSession(session, source);
    if ("error" in resolved) {
      const result = this.fail(resolved.error, { code: "SESSION_NOT_FOUND" });
      this.outputResult(result, { flags: baseFlags });
      this.exit(2);
      return;
    }

    const outDir = flags["out-dir"] ? String(flags["out-dir"]) : null;
    if (outDir) {
      await ensureDir(outDir);
      await writeJsonFile(outDir, "metadata.json", resolved);
    }

    const result = this.ok({ resolved, outDir });
    this.outputResult(result, {
      flags: baseFlags,
      human: () => {
        if (flags.quiet) return;
        const human = formatResolveHuman(resolved, format);
        this.log(human);
      },
    });
  }
}
