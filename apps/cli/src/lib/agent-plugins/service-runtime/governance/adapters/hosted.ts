import {
  createExactGitBlobPointer,
  sameGitPointer,
} from "@rawr/agent-plugin-lifecycle/ports/governance";
import { parseCanonicalId } from "@rawr/agent-plugin-lifecycle/ports/governance";
import type {
  HostedApprovalQuery,
  HostedApprovalReadResult,
  HostedApprovalReader,
} from "@rawr/agent-plugin-lifecycle/ports/governance";

export interface HostedGovernanceBackend {
  readonly readApproval: (query: HostedApprovalQuery) => Promise<unknown>;
}

export function createHostedApprovalAdapter(
  backend: HostedGovernanceBackend,
): HostedApprovalReader {
  const reader: HostedApprovalReader = {
    read: async (query) => {
      try {
        return parseApproval(await backend.readApproval(query), query);
      } catch (error) {
        return unavailable(error instanceof Error ? error.message : String(error));
      }
    },
  };
  return Object.freeze(reader);
}

function parseApproval(
  input: unknown,
  query: HostedApprovalQuery,
): HostedApprovalReadResult {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    return failure("MissingApproval", "Hosted governance returned no bounded approval observation");
  }
  const record = input as Record<string, unknown>;
  if (!exactKeys(record, ["approverIdentity", "decision", "object", "outcome", "provider", "recordId"])) {
    return failure("WrongObject", "Hosted approval observation has unknown, missing, or extra fields");
  }
  if (record.provider !== "graphite" && record.provider !== "github") {
    return failure("WrongObject", "Hosted approval provider is not Graphite or GitHub");
  }
  if (record.decision !== "approved" && record.decision !== "rejected") {
    return failure("WrongObject", "Hosted approval decision is invalid");
  }
  if (record.outcome !== "accepted") {
    return failure("WrongObject", "Hosted approval does not bind an accepted outcome");
  }
  const object = createExactGitBlobPointer(record.object);
  const recordId = parseCanonicalId(record.recordId, "approval.recordId");
  const approverIdentity = parseCanonicalId(record.approverIdentity, "approval.approverIdentity");
  if (!object.ok || !recordId.ok || !approverIdentity.ok) {
    return failure("WrongObject", "Hosted approval contains noncanonical identity fields");
  }
  if (
    !sameGitPointer(object.value, query.object)
    || approverIdentity.value !== query.approverIdentity
    || record.outcome !== query.outcome
  ) {
    return failure(
      "WrongObject",
      "Hosted approval is bound to another repository/ref/commit/tree/path/blob/approver/outcome",
    );
  }
  return {
    ok: true,
    observation: Object.freeze({
      provider: record.provider,
      recordId: recordId.value,
      object: object.value,
      approverIdentity: approverIdentity.value,
      decision: record.decision,
      outcome: "accepted",
    }),
  };
}

function exactKeys(record: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(record).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function failure(
  code: "MissingApproval" | "WrongObject",
  message: string,
): HostedApprovalReadResult {
  return { ok: false, failure: { code, message } };
}

function unavailable(message: string): HostedApprovalReadResult {
  return { ok: false, failure: { code: "UnavailableApproval", message } };
}
