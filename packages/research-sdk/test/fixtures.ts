import type {
  CellKey,
  DigestIdentity,
  Portable,
  SolverTerminal,
  StageOutput,
  StageOutputKey,
  UnresolvedExecutionResidue,
  UnresolvedExecutionResidueValue,
} from "../src/contracts/index.js";

export function digestIdentity(preimageKind: string, value: unknown): DigestIdentity {
  const preimage = JSON.stringify(value);
  return {
    algorithm: "sha256",
    preimageKind,
    value: new Bun.CryptoHasher("sha256").update(preimage).digest("hex"),
  };
}

export function cellKey(instanceId = "original-1"): CellKey {
  return {
    study: { studyId: "shared-sdk-compatibility", revision: "1" },
    caseId: "case-1",
    conditionId: "candidate",
    profileId: "model-free",
    instance: { kind: "Original", instanceId },
  };
}

export function stageOutput<Value>(value: Value & Portable<Value>): StageOutput<"Example", Value> {
  return {
    ...stageOutputKey(),
    outputDigest: digestIdentity("research-sdk.stage-value.v1", value),
    value,
  };
}

export function stageOutputKey(): StageOutputKey<"Example"> {
  return {
    stage: "Example",
    cell: cellKey(),
    frozenInputDigest: digestIdentity("research-sdk.frozen-input.v1", {
      fixture: "case-1",
    }),
    implementationRevision: "sdk-1",
    predecessors: { kind: "Set", digests: [] },
  };
}

export function solverTerminal(): SolverTerminal<
  { readonly traceId: string },
  { readonly kind: "Completed" }
> {
  const key = {
    stage: "SolverTerminal" as const,
    cell: cellKey(),
    frozenInputDigest: digestIdentity("research-sdk.frozen-input.v1", {
      fixture: "case-1",
    }),
    implementationRevision: "sdk-1",
    predecessors: { kind: "Set" as const, digests: [] },
  };
  const attemptValue = {
    terminal: key,
    attemptId: "attempt-1",
  };
  const value = {
    attempt: {
      attemptId: attemptValue.attemptId,
      attemptDigest: digestIdentity("research-sdk.execution-attempt.v1", attemptValue),
    },
    observation: { traceId: "trace-1" },
    agentExecution: { kind: "Completed" } as const,
    artifact: { kind: "Empty" } as const,
  };

  return {
    ...key,
    outputDigest: digestIdentity("research-sdk.solver-terminal-value.v1", value),
    value,
  };
}

export function digestSolverTerminalValue(value: unknown): DigestIdentity {
  return digestIdentity("research-sdk.solver-terminal-value.v1", value);
}

export function unresolvedResidue(residueVersion = "first"): UnresolvedExecutionResidue {
  const value: UnresolvedExecutionResidueValue = {
    cell: cellKey(),
    outcome: {
      kind: "ProcessTerminationUnconfirmed",
      processLocator: "pid:42",
      requestedSignal: "SIGKILL",
      detailDigest: digestIdentity("research-sdk.command-termination-detail.v1", residueVersion),
    },
    sandboxLocator: "sandbox:case-1",
  };

  return {
    ...value,
    residueDigest: digestExecutionResidueValue(value),
  };
}

export function digestExecutionResidueValue(
  value: UnresolvedExecutionResidueValue
): DigestIdentity {
  return digestIdentity("research-sdk.execution-residue.v1", value);
}
