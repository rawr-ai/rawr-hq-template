import { RawrCommand } from "@rawr/core";
import { Flags } from "@oclif/core";
import fs from "node:fs/promises";
import path from "node:path";
import { findWorkspaceRoot } from "../../lib/workspace-plugins";

type SecurityFinding = {
  kind: string;
  severity: string;
};

type SecurityReport = {
  ok: boolean;
  findings: SecurityFinding[];
  summary?: string;
  timestamp?: string;
  mode?: string;
};

type PostureSummary = {
  ok: boolean;
  timestamp: string;
  sourceReportTimestamp?: string;
  counts: {
    byKind: Record<string, number>;
    bySeverity: Record<string, number>;
  };
  topFindings: SecurityFinding[];
  nextActions: string[];
};

export default class SecurityPosture extends RawrCommand {
  static description = "Generate a deterministic security posture summary from the latest security report";

  static flags = {
    ...RawrCommand.baseFlags,
    out: Flags.string({ description: "Directory to write posture output", default: "" }),
    limit: Flags.integer({ description: "Max findings to include", default: 20, min: 1, max: 200 }),
  } as const;

  async run() {
    const { flags } = await this.parseRawr(SecurityPosture);
    const baseFlags = RawrCommand.extractBaseFlags(flags);
    const outArg = String(flags.out ?? "");
    const limit = Number(flags.limit);

    const workspaceRoot = await findWorkspaceRoot(process.cwd());
    if (!workspaceRoot) {
      const result = this.fail("Unable to locate workspace root (expected a ./plugins directory)");
      this.outputResult(result, { flags: baseFlags });
      this.exit(2);
      return;
    }

    const reportPath = path.join(workspaceRoot, ".rawr", "security", "latest.json");
    const report = await readLatestReport(reportPath);
    if (!report) {
      const result = this.fail("No security report found. Run `rawr security check` first.", {
        code: "SECURITY_REPORT_MISSING",
        details: { reportPath },
      });
      this.outputResult(result, { flags: baseFlags });
      this.exit(1);
      return;
    }

    const posture = buildPosture(report, Number.isFinite(limit) ? limit : 20);
    const outDir = outArg ? path.resolve(process.cwd(), outArg) : path.join(workspaceRoot, ".rawr", "security", "posture");
    const jsonPath = path.join(outDir, "latest.json");
    const mdPath = path.join(outDir, "latest.md");

    if (baseFlags.dryRun) {
      const result = this.ok({ posture, outDir, jsonPath, mdPath });
      this.outputResult(result, {
        flags: baseFlags,
        human: () => {
          this.log(`would write: ${jsonPath}`);
          this.log(`would write: ${mdPath}`);
        },
      });
      return;
    }

    await fs.mkdir(outDir, { recursive: true });
    await fs.writeFile(jsonPath, JSON.stringify({ posture, report }, null, 2), "utf8");
    await fs.writeFile(mdPath, renderMarkdown(posture), "utf8");

    const result = this.ok({ posture, outDir, jsonPath, mdPath });
    this.outputResult(result, {
      flags: baseFlags,
      human: () => {
        this.log(`wrote: ${jsonPath}`);
        this.log(`wrote: ${mdPath}`);
        this.log(`ok: ${posture.ok ? "true" : "false"}`);
      },
    });
  }
}

async function readLatestReport(p: string): Promise<SecurityReport | null> {
  try {
    return JSON.parse(await fs.readFile(p, "utf8")) as SecurityReport;
  } catch {
    return null;
  }
}

function buildPosture(report: SecurityReport, limit: number): PostureSummary {
  const byKind: Record<string, number> = {};
  const bySeverity: Record<string, number> = {};
  for (const f of report.findings ?? []) {
    byKind[f.kind] = (byKind[f.kind] ?? 0) + 1;
    bySeverity[f.severity] = (bySeverity[f.severity] ?? 0) + 1;
  }

  const topFindings = (report.findings ?? []).slice(0, limit);
  const nextActions = suggestNextActions(byKind);

  return {
    ok: Boolean(report.ok),
    timestamp: new Date().toISOString(),
    sourceReportTimestamp: report.timestamp,
    counts: { byKind, bySeverity },
    topFindings,
    nextActions,
  };
}

function suggestNextActions(byKind: Record<string, number>): string[] {
  const actions: string[] = [];
  if ((byKind.secret ?? 0) > 0) {
    actions.push("Remove committed secrets; rotate exposed credentials; add scanners + pre-commit guardrails.");
  }
  if ((byKind.vulnerability ?? 0) > 0) {
    actions.push("Review vulnerabilities; upgrade dependencies; re-run `rawr security check` until clean.");
  }
  if ((byKind.untrustedDependencyScripts ?? 0) > 0) {
    actions.push("Audit install scripts; tighten bun trustedDependencies; prefer pinned, reviewed packages.");
  }
  if ((byKind.toolError ?? 0) > 0) {
    actions.push("Fix security tooling errors; posture is only as good as the checks that ran.");
  }
  if (actions.length === 0) actions.push("No findings: keep checks on, and re-run after dependency changes.");
  return actions;
}

function renderMarkdown(posture: PostureSummary): string {
  const lines: string[] = [];
  lines.push("# RAWR security posture");
  lines.push("");
  lines.push(`- ok: ${posture.ok ? "true" : "false"}`);
  lines.push(`- generatedAt: ${posture.timestamp}`);
  if (posture.sourceReportTimestamp) lines.push(`- sourceReportTimestamp: ${posture.sourceReportTimestamp}`);
  lines.push("");
  lines.push("## Counts");
  lines.push("");
  lines.push("### By kind");
  lines.push("");
  for (const [k, v] of Object.entries(posture.counts.byKind).sort()) lines.push(`- ${k}: ${v}`);
  lines.push("");
  lines.push("### By severity");
  lines.push("");
  for (const [k, v] of Object.entries(posture.counts.bySeverity).sort()) lines.push(`- ${k}: ${v}`);
  lines.push("");
  lines.push("## Next actions");
  lines.push("");
  for (const a of posture.nextActions) lines.push(`- ${a}`);
  lines.push("");
  lines.push("## Top findings");
  lines.push("");
  for (const f of posture.topFindings) lines.push(`- ${f.kind} (${f.severity})`);
  lines.push("");
  return lines.join("\n");
}
