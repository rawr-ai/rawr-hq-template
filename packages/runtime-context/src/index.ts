import type { CoordinationRuntimeAdapter } from "@rawr/coordination-inngest";
import type { Inngest } from "inngest";

export type RuntimeRouterContext = {
  repoRoot: string;
  baseUrl: string;
  runtime: CoordinationRuntimeAdapter;
  inngestClient: Inngest;
};
