import type {
  GateEnableResult,
  RiskTolerance,
  SecurityMode,
  SecurityReport,
} from "../../modules/security/types";

export interface SecurityRuntime {
  securityCheck(repoRoot: string, mode: SecurityMode): Promise<
    Pick<SecurityReport, "ok" | "findings" | "summary" | "timestamp" | "mode" | "meta"> & { reportPath?: string }
  >;
  gateEnable(
    repoRoot: string,
    pluginId: string,
    riskTolerance: RiskTolerance,
    mode: SecurityMode,
  ): Promise<GateEnableResult>;
  getSecurityReport(repoRoot: string): Promise<SecurityReport | null>;
}
