import type { SecurityFinding, SecurityMode, SecurityReport } from "../dto/security.dto";

const DEFAULT_MAX_REPORT_BYTES = 250_000;
const textEncoder = new TextEncoder();

export function severityRank(severity: SecurityFinding["severity"]): number {
  switch (severity) {
    case "info":
      return 0;
    case "low":
      return 1;
    case "medium":
      return 2;
    case "high":
      return 3;
    case "critical":
      return 4;
  }
}

export function summarize(findings: SecurityFinding[]): string {
  const vulns = findings.filter((finding) => finding.kind === "vulnerability").length;
  const untrusted = findings.filter(
    (finding) => finding.kind === "untrustedDependencyScripts"
  ).length;
  const secrets = findings.filter((finding) => finding.kind === "secret").length;
  return `vulns=${vulns}, untrusted=${untrusted}, secrets=${secrets}`;
}

export function sortFindings(findings: SecurityFinding[]): SecurityFinding[] {
  const kindOrder: Record<SecurityFinding["kind"], number> = {
    secret: 0,
    untrustedDependencyScripts: 1,
    vulnerability: 2,
    toolError: 3,
  };

  return findings.slice().sort((a, b) => {
    const kind = kindOrder[a.kind] - kindOrder[b.kind];
    if (kind !== 0) return kind;

    const severity = severityRank(b.severity) - severityRank(a.severity);
    if (severity !== 0) return severity;

    if (a.kind === "secret" && b.kind === "secret") {
      const filePath = a.path.localeCompare(b.path);
      if (filePath !== 0) return filePath;
      return a.patternId.localeCompare(b.patternId);
    }

    if (a.kind === "vulnerability" && b.kind === "vulnerability") {
      const pkg = a.packageName.localeCompare(b.packageName);
      if (pkg !== 0) return pkg;
      return a.title.localeCompare(b.title);
    }

    if (a.kind === "untrustedDependencyScripts" && b.kind === "untrustedDependencyScripts") {
      return b.count - a.count;
    }

    return 0;
  });
}

export function securityReport(input: {
  findings: SecurityFinding[];
  mode: SecurityMode;
  timestamp: string;
  repoRoot: string;
}): SecurityReport {
  return {
    ok: input.findings.length === 0,
    findings: input.findings,
    summary: summarize(input.findings),
    timestamp: input.timestamp,
    mode: input.mode,
    meta: { repoRoot: input.repoRoot },
  };
}

function estimateSizeBytes(value: unknown): number {
  return textEncoder.encode(JSON.stringify(value)).byteLength;
}

function capFindings(report: SecurityReport, maxBytes: number): SecurityReport {
  if (estimateSizeBytes(report) <= maxBytes) return report;

  const capped: SecurityReport = {
    ...report,
    findings: report.findings.slice(),
    summary: `${report.summary} (truncated)`,
  };
  if (estimateSizeBytes(capped) <= maxBytes) return capped;

  let count = Math.min(capped.findings.length, 50);
  for (; count >= 1; count = Math.floor(count / 2)) {
    const attempt: SecurityReport = { ...capped, findings: capped.findings.slice(0, count) };
    if (estimateSizeBytes(attempt) <= maxBytes) return attempt;
  }

  return { ...capped, findings: [] };
}

/** Builds the bounded persisted document and timestamp-derived report filename. */
export function securityReportDocument(
  report: SecurityReport,
  maxBytes = DEFAULT_MAX_REPORT_BYTES
): { fileName: string; contents: string } {
  const capped = capFindings(report, maxBytes);
  const timestamp = capped.timestamp.replaceAll(":", "-").replaceAll(".", "-");
  return {
    fileName: `report-${timestamp}.json`,
    contents: JSON.stringify(capped, null, 2),
  };
}

/** Parses the persisted report projection without manufacturing missing data. */
export function parseSecurityReport(raw: string): SecurityReport | null {
  try {
    return JSON.parse(raw) as SecurityReport;
  } catch {
    return null;
  }
}
