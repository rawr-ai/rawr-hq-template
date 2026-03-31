import { module } from "./module";

const securityCheck = module.securityCheck.handler(async ({ context, input }) => {
  return await context.repo.securityCheck(input.mode);
});

const gateEnable = module.gateEnable.handler(async ({ context, input }) => {
  return await context.repo.gateEnable(input.pluginId, input.riskTolerance, input.mode);
});

const getSecurityReport = module.getSecurityReport.handler(async ({ context }) => {
  return await context.repo.getSecurityReport();
});

export const router = module.router({
  securityCheck,
  gateEnable,
  getSecurityReport,
});
