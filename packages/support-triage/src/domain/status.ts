import { Type, type Static } from "typebox";

export const TriageJobStatusSchema = Type.Union(
  [
    Type.Literal("queued", { description: "Job is accepted and waiting for an agent to start triage." }),
    Type.Literal("running", { description: "Job is actively being triaged." }),
    Type.Literal("completed", { description: "Job finished successfully with triage output." }),
    Type.Literal("failed", { description: "Job failed and requires follow-up or retry." }),
  ],
  {
    description: "Lifecycle status for support-triage jobs.",
  },
);

export type TriageJobStatus = Static<typeof TriageJobStatusSchema>;

export function isTerminalTriageJobStatus(status: TriageJobStatus): boolean {
  return status === "completed" || status === "failed";
}

export function canTransitionTriageJobStatus(from: TriageJobStatus, to: TriageJobStatus): boolean {
  if (from === to) return true;
  if (from === "queued") return to === "running";
  if (from === "running") return to === "completed" || to === "failed";
  return false;
}
