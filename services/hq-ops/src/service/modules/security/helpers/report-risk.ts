import type { RiskTolerance, SecurityFinding } from "../entities";
import { severityRank } from "./report-format";

export function toleranceToMaxSeverity(riskTolerance: RiskTolerance): SecurityFinding["severity"] | null {
  switch (riskTolerance) {
    case "off":
      return "critical";
    case "permissive":
      return "high";
    case "balanced":
      return "medium";
    case "strict":
      return null;
  }
}

export function maxFindingSeverity(findings: SecurityFinding[]): SecurityFinding["severity"] {
  return findings.reduce<SecurityFinding["severity"]>(
    (acc, finding) => (severityRank(finding.severity) > severityRank(acc) ? finding.severity : acc),
    "info",
  );
}

