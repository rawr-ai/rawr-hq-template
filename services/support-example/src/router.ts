import { triageRouter } from "./modules";

export const supportExampleRouter = {
  triage: triageRouter,
} as const;

export type SupportExampleRouter = typeof supportExampleRouter;
