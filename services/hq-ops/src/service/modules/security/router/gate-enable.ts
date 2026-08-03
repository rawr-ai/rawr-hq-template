import { bunAuditFindings, untrustedDependencyFinding } from "../model/policy/audit";
import {
  securityReport,
  securityReportDocument,
  severityRank,
  sortFindings,
} from "../model/policy/report-format";
import { maxFindingSeverity, toleranceToMaxSeverity } from "../model/policy/report-risk";
import { secretFindings } from "../model/policy/secrets";
import { module } from "../module";

const decoder = new TextDecoder();
const encoder = new TextEncoder();

function decode(bytes: Uint8Array): string {
  return decoder.decode(bytes);
}

function listedPaths(bytes: Uint8Array): string[] {
  return decode(bytes)
    .split("\n")
    .map((value) => value.trim())
    .filter(Boolean);
}

/** Applies configured risk tolerance to a freshly observed security report. */
export const gateEnable = module.gateEnable.handler(async ({ context, input }) => {
  const repoRootRun = await context.process.exec("git", ["rev-parse", "--show-toplevel"], {
    cwd: context.repoRoot,
    timeoutMs: 5_000,
  });
  const repoRoot =
    repoRootRun.exitCode === 0 ? decode(repoRootRun.stdout).trim() : context.repoRoot;
  const timestamp = new Date().toISOString();

  const auditRun = await context.process.exec("bun", ["audit", "--json"], {
    cwd: repoRoot,
    timeoutMs: 60_000,
  });
  const findings = bunAuditFindings(`${decode(auditRun.stdout)}${decode(auditRun.stderr)}`);
  const untrustedRun = await context.process.exec("bun", ["pm", "untrusted"], {
    cwd: repoRoot,
    timeoutMs: 60_000,
  });
  const untrusted = untrustedDependencyFinding(
    untrustedRun.exitCode,
    `${decode(untrustedRun.stdout)}${decode(untrustedRun.stderr)}`
  );
  if (untrusted) findings.push(untrusted);

  if (input.mode === "staged") {
    const pathsRun = await context.process.exec(
      "git",
      ["diff", "--cached", "--name-only", "--diff-filter=ACMR"],
      { cwd: repoRoot, timeoutMs: 10_000 }
    );
    if (pathsRun.exitCode === 0) {
      for (const filePath of listedPaths(pathsRun.stdout)) {
        const blobRun = await context.process.exec("git", ["show", `:${filePath}`], {
          cwd: repoRoot,
          timeoutMs: 10_000,
        });
        if (blobRun.exitCode === 0) findings.push(...secretFindings(blobRun.stdout, filePath));
      }
    }
  } else {
    const pathsRun = await context.process.exec("git", ["ls-files"], {
      cwd: repoRoot,
      timeoutMs: 10_000,
    });
    if (pathsRun.exitCode === 0) {
      for (const filePath of listedPaths(pathsRun.stdout)) {
        const raw = await context.fs.readText(context.path.join(repoRoot, filePath));
        if (raw !== null) findings.push(...secretFindings(encoder.encode(raw), filePath));
      }
    }
  }

  const baseReport = securityReport({
    findings: sortFindings(findings),
    mode: input.mode,
    timestamp,
    repoRoot,
  });
  const reportDir = context.path.join(repoRoot, ".rawr", "security");
  await context.fs.mkdir(reportDir);
  const document = securityReportDocument(baseReport);
  const reportPath = context.path.join(reportDir, document.fileName);
  const latestPath = context.path.join(reportDir, "latest.json");
  await context.fs.writeText(reportPath, document.contents);
  await context.fs.writeText(latestPath, document.contents);
  const report = {
    ok: baseReport.ok,
    findings: baseReport.findings,
    summary: baseReport.summary,
    timestamp: baseReport.timestamp,
    mode: input.mode,
    meta: { pluginId: input.pluginId, repoRoot: baseReport.meta?.repoRoot },
    reportPath,
  };

  if (report.ok) return { allowed: true, report, requiresForce: false };
  if (input.riskTolerance === "strict") return { allowed: false, report, requiresForce: true };

  const maxAllowed = toleranceToMaxSeverity(input.riskTolerance);
  if (!maxAllowed) return { allowed: false, report, requiresForce: true };

  const allowed = severityRank(maxFindingSeverity(report.findings)) <= severityRank(maxAllowed);
  return { allowed, report, requiresForce: !allowed };
});
