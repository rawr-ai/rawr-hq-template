import { module } from "./module";

const assessInstallState = module.assessInstallState.handler(async ({ context, input }) => {
  return await context.repo.assessInstallState(input);
});

const planInstallRepair = module.planInstallRepair.handler(async ({ context, input }) => {
  return context.repo.planInstallRepair(input);
});

export const router = module.router({
  assessInstallState,
  planInstallRepair,
});
