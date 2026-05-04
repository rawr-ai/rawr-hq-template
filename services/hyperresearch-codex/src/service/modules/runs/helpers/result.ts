import { validateHyperresearchRunIntegrity } from "./integrity";
import type {
  HyperresearchV8RunLedger,
  V8RunStatus,
} from "../../../shared/entities";
import type { HyperresearchCodexIO } from "../../../shared/resources";

export function allPendingAgentJobs(ledger: HyperresearchV8RunLedger) {
  return ledger.agentJobs.filter((job) => job.status === "pending");
}

export function resultStatus(input: {
  ledger: HyperresearchV8RunLedger;
  integrity: Awaited<ReturnType<typeof validateHyperresearchRunIntegrity>>;
}): V8RunStatus {
  if (input.integrity.some((finding) => finding.severity === "blocking")) return "blocked";
  if (input.ledger.completed) return "complete";
  if (allPendingAgentJobs(input.ledger).length > 0) return "awaiting_agents";
  return "running";
}

export async function makeResult(input: {
  ledgerPath: string;
  ledger: HyperresearchV8RunLedger;
  io: HyperresearchCodexIO;
}) {
  const integrity = await validateHyperresearchRunIntegrity({
    ledger: input.ledger,
    io: input.io,
  });
  return {
    ledgerPath: input.ledgerPath,
    status: resultStatus({ ledger: input.ledger, integrity }),
    ledger: input.ledger,
    pendingAgentJobs: allPendingAgentJobs(input.ledger),
    integrity,
  };
}
