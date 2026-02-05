import { Flags } from "@oclif/core";
import { RawrCommand } from "@rawr/core";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { findWorkspaceRoot } from "../../lib/workspace-plugins";
import { resolveCliEntrypoint } from "../../lib/subprocess";

type Snapshot = {
  timestamp: string;
  workspaceRoot: string;
  rawrVersion: string;
  bunVersion: string;
  toolsExport: unknown;
  pluginsList: unknown;
  securityReport: unknown;
};

function runCapture(cmd: string, args: string[], cwd: string): { status: number; stdout: string; stderr: string } {
  const proc = spawnSync(cmd, args, {
    cwd,
    encoding: "utf8",
    stdio: "pipe",
    env: { ...process.env },
  });
  return {
    status: proc.status ?? 1,
    stdout: proc.stdout ?? "",
    stderr: proc.stderr ?? "",
  };
}

export default class RoutineSnapshot extends RawrCommand {
  static description = "Write a routine snapshot packet under .rawr/";

  static flags = {
    ...RawrCommand.baseFlags,
    out: Flags.string({
      description: "Output directory (default: .rawr/routines/<timestamp>)",
    }),
  } as const;

  async run() {
    const { flags } = await this.parseRawr(RoutineSnapshot);
    const baseFlags = RawrCommand.extractBaseFlags(flags);

    const workspaceRoot = await findWorkspaceRoot(process.cwd());
    if (!workspaceRoot) {
      const result = this.fail("Unable to locate workspace root (expected a ./plugins directory)");
      this.outputResult(result, { flags: baseFlags });
      this.exit(2);
      return;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const outFlag = typeof flags.out === "string" ? flags.out : undefined;
    const outDir = outFlag
      ? path.isAbsolute(outFlag)
        ? outFlag
        : path.join(workspaceRoot, outFlag)
      : path.join(workspaceRoot, ".rawr", "routines", timestamp);

    if (baseFlags.dryRun) {
      const result = this.ok({
        outDir,
        files: [path.join(outDir, "snapshot.json"), path.join(outDir, "snapshot.md")],
      });
      this.outputResult(result, {
        flags: baseFlags,
        human: () => {
          this.log(`[dry-run] ${outDir}`);
        },
      });
      return;
    }

    await mkdir(outDir, { recursive: true });

    const entrypoint = resolveCliEntrypoint();

    const rawrVersion = runCapture("bun", [entrypoint, "--version"], workspaceRoot).stdout.trim();
    const bunVersion = runCapture("bun", ["--version"], workspaceRoot).stdout.trim();
    const toolsExport = safeJson(runCapture("bun", [entrypoint, "tools", "export", "--json"], workspaceRoot).stdout);
    const pluginsList = safeJson(
      runCapture("bun", [entrypoint, "hq", "plugins", "list", "--json"], workspaceRoot).stdout,
    );
    const securityReport = safeJson(
      runCapture("bun", [entrypoint, "security", "report", "--json"], workspaceRoot).stdout,
    );

    const snapshot: Snapshot = {
      timestamp: new Date().toISOString(),
      workspaceRoot,
      rawrVersion,
      bunVersion,
      toolsExport,
      pluginsList,
      securityReport,
    };

    const jsonPath = path.join(outDir, "snapshot.json");
    const mdPath = path.join(outDir, "snapshot.md");

    await writeFile(jsonPath, JSON.stringify(snapshot, null, 2), "utf8");
    await writeFile(mdPath, renderMarkdown(snapshot), "utf8");

    const result = this.ok({ outDir, jsonPath, mdPath });
    this.outputResult(result, {
      flags: baseFlags,
      human: () => {
        this.log(`wrote: ${jsonPath}`);
        this.log(`wrote: ${mdPath}`);
      },
    });
  }
}

function safeJson(input: string): unknown {
  try {
    return JSON.parse(input);
  } catch {
    return { ok: false, error: "invalid_json", raw: input };
  }
}

function renderMarkdown(s: Snapshot): string {
  return [
    `# RAWR routine snapshot`,
    ``,
    `- Timestamp: \`${s.timestamp}\``,
    `- Workspace: \`${s.workspaceRoot}\``,
    `- rawr: \`${s.rawrVersion}\``,
    `- bun: \`${s.bunVersion}\``,
    ``,
    `## Tools`,
    "```json",
    JSON.stringify(s.toolsExport, null, 2),
    "```",
    ``,
    `## Plugins`,
    "```json",
    JSON.stringify(s.pluginsList, null, 2),
    "```",
    ``,
    `## Security report`,
    "```json",
    JSON.stringify(s.securityReport, null, 2),
    "```",
    ``,
  ].join("\n");
}
