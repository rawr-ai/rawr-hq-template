import { Type, type Static } from "typebox";

export const TriageWorkItemStatusSchema = Type.Union(
  [
    Type.Literal("queued", { description: "Work item is accepted and waiting for an agent to start triage." }),
    Type.Literal("running", { description: "Work item is actively being triaged." }),
    Type.Literal("completed", { description: "Work item finished successfully with triage output." }),
    Type.Literal("failed", { description: "Work item failed and requires follow-up." }),
  ],
  {
    description: "Lifecycle status for support-triage work items.",
  },
);

export type TriageWorkItemStatus = Static<typeof TriageWorkItemStatusSchema>;

export function isTerminalTriageWorkItemStatus(status: TriageWorkItemStatus): boolean {
  return status === "completed" || status === "failed";
}

export function canTransitionTriageWorkItemStatus(from: TriageWorkItemStatus, to: TriageWorkItemStatus): boolean {
  if (from === to) return true;
  if (from === "queued") return to === "running";
  if (from === "running") return to === "completed" || to === "failed";
  return false;
}
