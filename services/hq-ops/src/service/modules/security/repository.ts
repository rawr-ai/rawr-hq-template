import type { SecurityRuntime } from "../../shared/ports/security-runtime";
import type { RiskTolerance } from "./types.js";

export function createRepository(securityRuntime: SecurityRuntime, repoRoot: string) {
  return {
    async securityCheck(mode: "staged" | "repo") {
      return await securityRuntime.securityCheck(repoRoot, mode);
    },
    async gateEnable(pluginId: string, riskTolerance: RiskTolerance, mode: "staged" | "repo") {
      return await securityRuntime.gateEnable(repoRoot, pluginId, riskTolerance, mode);
    },
    async getSecurityReport() {
      return await securityRuntime.getSecurityReport(repoRoot);
    },
  };
}
