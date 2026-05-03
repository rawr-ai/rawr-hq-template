import type { SecurityFinding, SecurityMode, SecurityReport } from "../entities";

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
  const untrusted = findings.filter((finding) => finding.kind === "untrustedDependencyScripts").length;
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

