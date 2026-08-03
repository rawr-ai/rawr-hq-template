import { gateEnable } from "./router/gate-enable";
import { getSecurityReport } from "./router/get-security-report";
import { securityCheck } from "./router/security-check";

/** Completed Security operation tree consumed by the HQ Ops service router. */
export const router = {
  securityCheck,
  gateEnable,
  getSecurityReport,
};
