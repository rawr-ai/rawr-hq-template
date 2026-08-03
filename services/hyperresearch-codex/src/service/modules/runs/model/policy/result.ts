import type {
  HyperresearchIntegrityFinding,
  HyperresearchV8RunLedger,
  V8RunStatus,
} from "../../../../model/entities";

export function allPendingAgentJobs(ledger: HyperresearchV8RunLedger) {
  return ledger.agentJobs.filter((job) => job.status === "pending");
}

export function resultStatus(input: {
  ledger: HyperresearchV8RunLedger;
  integrity: HyperresearchIntegrityFinding[];
}): V8RunStatus {
  if (input.integrity.some((finding) => finding.severity === "blocking")) return "blocked";
  if (input.ledger.completed) return "complete";
  if (allPendingAgentJobs(input.ledger).length > 0) return "awaiting_agents";
  return "running";
}

export function makeResult(input: {
  ledgerPath: string;
  ledger: HyperresearchV8RunLedger;
  integrity: HyperresearchIntegrityFinding[];
}) {
  return {
    ledgerPath: input.ledgerPath,
    status: resultStatus({ ledger: input.ledger, integrity: input.integrity }),
    ledger: input.ledger,
    pendingAgentJobs: allPendingAgentJobs(input.ledger),
    integrity: input.integrity,
  };
}
