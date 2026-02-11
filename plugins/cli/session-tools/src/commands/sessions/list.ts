import { Flags } from "@oclif/core";
import { RawrCommand } from "@rawr/core";
import { formatSessionTable, listSessions, type SessionSourceFilter } from "@rawr/session-tools";
import { ensureDir, writeJsonFile } from "../../lib/out-dir";

export default class SessionsList extends RawrCommand {
  static description = "List Claude/Codex sessions";

  static flags = {
    ...RawrCommand.baseFlags,
    source: Flags.string({
      description: "Session source",
      options: ["claude", "codex", "all"],
      default: "all",
    }),
    limit: Flags.integer({
      description: "Max sessions to return (0 = unlimited)",
      default: 5,
      min: 0,
      max: 50_000,
    }),
    project: Flags.string({ description: "Filter Claude sessions by project (path or name substring)" }),
    "cwd-contains": Flags.string({ description: "Filter by cwd substring" }),
    branch: Flags.string({ description: "Filter by git branch substring" }),
    model: Flags.string({ description: "Filter by model substring" }),
    since: Flags.string({ description: "Filter by modified time >= since (ISO or YYYY-MM-DD)" }),
    until: Flags.string({ description: "Filter by modified time <= until (ISO or YYYY-MM-DD)" }),
    table: Flags.boolean({ description: "Pretty table output", default: false }),
    "out-dir": Flags.string({ description: "Write results to a directory (search-results.json)" }),
    quiet: Flags.boolean({ description: "Suppress human output", default: false }),
  } as const;

  async run() {
    const { flags } = await this.parseRawr(SessionsList);
    const baseFlags = RawrCommand.extractBaseFlags(flags);
    const source = String(flags.source) as SessionSourceFilter;
    const limit = Number(flags.limit);

    const sessions = await listSessions({
      source,
      limit,
      filters: {
        project: flags.project ? String(flags.project) : undefined,
        cwdContains: flags["cwd-contains"] ? String(flags["cwd-contains"]) : undefined,
        branch: flags.branch ? String(flags.branch) : undefined,
        model: flags.model ? String(flags.model) : undefined,
        since: flags.since ? String(flags.since) : undefined,
        until: flags.until ? String(flags.until) : undefined,
      },
    });

    const outDir = flags["out-dir"] ? String(flags["out-dir"]) : null;
    if (outDir) {
      await ensureDir(outDir);
      await writeJsonFile(outDir, "search-results.json", { mode: "list", sessions });
    }

    const result = this.ok({ sessions, outDir });
    this.outputResult(result, {
      flags: baseFlags,
      human: () => {
        if (flags.quiet) return;
        if (flags.table) {
          this.log(formatSessionTable(sessions));
          return;
        }
        for (const s of sessions) {
          const id = s.sessionId ? s.sessionId.slice(0, 10) : "?";
          const title = (s.title ?? "").replaceAll(/\s+/g, " ").slice(0, 120);
          this.log(`${s.source} ${id}  ${title}  (${s.path})`);
        }
      },
    });
  }
}
