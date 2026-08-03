import { gateEnable } from "./gate-enable";
import { getSecurityReport } from "./get-security-report";
import { securityCheck } from "./security-check";

/** Security contract tree consumed by the HQ Ops service contract. */
export const contract = {
  securityCheck,
  gateEnable,
  getSecurityReport,
};
