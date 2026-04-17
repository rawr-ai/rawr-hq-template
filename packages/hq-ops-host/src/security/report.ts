import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { SecurityReport } from "./runtime";

const DEFAULT_MAX_REPORT_BYTES = 250_000;

function safeIsoForFilename(iso: string): string {
  return iso.replaceAll(":", "-").replaceAll(".", "-");
}

function estimateSizeBytes(value: unknown): number {
  return Buffer.byteLength(JSON.stringify(value), "utf8");
}

function capFindings(report: SecurityReport, maxBytes: number): SecurityReport {
  if (estimateSizeBytes(report) <= maxBytes) return report;

  const capped: SecurityReport = {
    ...report,
    findings: report.findings.slice(),
    summary: `${report.summary} (truncated)`,
  };

  capped.findings = capped.findings.map((finding) => {
    if (finding.kind === "untrustedDependencyScripts") {
      return { ...finding, rawOutput: finding.rawOutput?.slice(0, 2_000) };
    }
    if (finding.kind === "secret") {
      return { ...finding, match: finding.match.slice(0, 32) };
    }
    return finding;
  });

  if (estimateSizeBytes(capped) <= maxBytes) return capped;

  let n = Math.min(capped.findings.length, 50);
  for (; n >= 1; n = Math.floor(n / 2)) {
    const attempt: SecurityReport = { ...capped, findings: capped.findings.slice(0, n) };
    if (estimateSizeBytes(attempt) <= maxBytes) return attempt;
  }

  return { ...capped, findings: [] };
}

export async function writeSecurityReport(opts: {
  repoRoot: string;
  report: SecurityReport;
  maxReportBytes?: number;
}): Promise<{ reportDir: string; reportPath: string; latestPath: string }> {
  const maxBytes = opts.maxReportBytes ?? DEFAULT_MAX_REPORT_BYTES;
  const reportDir = join(opts.repoRoot, ".rawr", "security");
  await mkdir(reportDir, { recursive: true });

  const capped = capFindings(opts.report, maxBytes);
  const json = JSON.stringify(capped, null, 2);
  const fileName = `report-${safeIsoForFilename(capped.timestamp)}.json`;
  const reportPath = join(reportDir, fileName);
  const latestPath = join(reportDir, "latest.json");

  await writeFile(reportPath, json, "utf8");
  await writeFile(latestPath, json, "utf8");

  return { reportDir, reportPath, latestPath };
}
