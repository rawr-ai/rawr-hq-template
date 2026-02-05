export type SecurityMode = "staged" | "repo";

export type FindingSeverity = "info" | "low" | "medium" | "high" | "critical";

export type VulnerabilityFinding = {
  kind: "vulnerability";
  severity: FindingSeverity;
  packageName: string;
  title: string;
  url?: string;
  advisoryId?: number;
  vulnerableVersions?: string;
  cvssScore?: number;
  cwe?: string[];
};

export type UntrustedDependencyScriptsFinding = {
  kind: "untrustedDependencyScripts";
  severity: "high";
  count: number;
  rawOutput?: string;
};

export type SecretFinding = {
  kind: "secret";
  severity: "high" | "critical";
  path: string;
  patternId: string;
  match: string;
  index: number;
};

export type ToolErrorFinding = {
  kind: "toolError";
  severity: "high";
  tool: string;
  message: string;
  rawOutput?: string;
};

export type SecurityFinding =
  | VulnerabilityFinding
  | UntrustedDependencyScriptsFinding
  | SecretFinding
  | ToolErrorFinding;

export type SecurityReport = {
  ok: boolean;
  findings: SecurityFinding[];
  summary: string;
  timestamp: string;
  mode: SecurityMode;
  meta?: {
    pluginId?: string;
    repoRoot?: string;
  };
};

export type RiskTolerance = "strict" | "balanced" | "permissive" | "off";

export type GateEnableInput = {
  pluginId: string;
  riskTolerance: RiskTolerance;
  mode: SecurityMode;
};

export type GateEnableResult = {
  allowed: boolean;
  report: SecurityReport & { reportPath?: string };
  requiresForce: boolean;
};
