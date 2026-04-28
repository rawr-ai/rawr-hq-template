import type { HqOpsResources } from "../../../shared/ports/resources";
import type { SecurityReport } from "../entities";

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

  if (estimateSizeBytes(capped) <= maxBytes) return capped;

  let n = Math.min(capped.findings.length, 50);
  for (; n >= 1; n = Math.floor(n / 2)) {
    const attempt: SecurityReport = { ...capped, findings: capped.findings.slice(0, n) };
    if (estimateSizeBytes(attempt) <= maxBytes) return attempt;
  }

  return { ...capped, findings: [] };
}

export async function writeSecurityReport(
  resources: HqOpsResources,
  opts: {
    repoRoot: string;
    report: SecurityReport;
    maxReportBytes?: number;
  },
): Promise<{ reportDir: string; reportPath: string; latestPath: string }> {
  const maxBytes = opts.maxReportBytes ?? DEFAULT_MAX_REPORT_BYTES;
  const reportDir = resources.path.join(opts.repoRoot, ".rawr", "security");
  await resources.fs.mkdir(reportDir);

  const capped = capFindings(opts.report, maxBytes);
  const json = JSON.stringify(capped, null, 2);
  const fileName = `report-${safeIsoForFilename(capped.timestamp)}.json`;
  const reportPath = resources.path.join(reportDir, fileName);
  const latestPath = resources.path.join(reportDir, "latest.json");

  await resources.fs.writeText(reportPath, json);
  await resources.fs.writeText(latestPath, json);

  return { reportDir, reportPath, latestPath };
}

export async function readLatestSecurityReport(
  resources: HqOpsResources,
  repoRoot: string,
): Promise<SecurityReport | null> {
  const latestPath = resources.path.join(repoRoot, ".rawr", "security", "latest.json");
  const raw = await resources.fs.readText(latestPath);
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as SecurityReport;
  } catch {
    return null;
  }
}

