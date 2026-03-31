import { gateEnable, getSecurityReport, securityCheck } from "./support.js";
import type { RiskTolerance } from "./types.js";

export function createRepository(repoRoot: string) {
  return {
    async securityCheck(mode: "staged" | "repo") {
      return await securityCheck({ mode, cwd: repoRoot });
    },
    async gateEnable(pluginId: string, riskTolerance: RiskTolerance, mode: "staged" | "repo") {
      return await gateEnable({ pluginId, riskTolerance, mode, cwd: repoRoot });
    },
    async getSecurityReport() {
      return await getSecurityReport({ cwd: repoRoot });
    },
  };
}
