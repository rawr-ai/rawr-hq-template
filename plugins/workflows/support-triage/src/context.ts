import type { Inngest } from "inngest";

export type SupportTriageWorkflowContext = {
  baseUrl: string;
  inngestClient: Inngest;
  requestId?: string;
  correlationId?: string;
};
