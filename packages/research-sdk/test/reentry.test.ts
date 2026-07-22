import { Effect } from "effect";
import { describe, expect, test } from "vitest";
import type {
  PortableStageOutput,
  StageOutputShape,
  UnresolvedExecutionResidue,
} from "../src/contracts/index.js";
import type {
  AttemptAdmissionOutcome,
  AttemptQuiescenceEvidence,
  ExecutionAttemptFence,
  ExecutionAttemptValue,
  ReadExact,
  ResidueTerminationEvidence,
} from "../src/core/index.js";
import {
  classifyAttemptReconciliation,
  classifyPublication,
  classifyResidueReconciliation,
  classifySolverTerminalPublication,
  inspectExecutionReentry,
  reconcilePublicationAfterUnknown,
  reconcileSolverTerminalPublicationAfterUnknown,
  stageOutputKeyOf,
} from "../src/core/index.js";
import {
  cellKey,
  digestExecutionResidueValue,
  digestIdentity,
  digestSolverTerminalValue,
  solverTerminal,
  unresolvedResidue,
} from "./fixtures.js";

type AdmissionUncertainty = { readonly operationId: string };
type AdmissionOutcome = AttemptAdmissionOutcome<
  ExecutionAttemptFence,
  UnresolvedExecutionResidue,
  AdmissionUncertainty,
  ReturnType<typeof solverTerminal>
>;

function digestExecutionAttemptValue(value: ExecutionAttemptValue) {
  return digestIdentity("research-sdk.execution-attempt.v1", value);
}

function executionAttempt(attemptId = "attempt-1"): ExecutionAttemptFence {
  const value = {
    terminal: stageOutputKeyOf(solverTerminal()),
    attemptId,
  };
  return { ...value, attemptDigest: digestExecutionAttemptValue(value) };
}

function quiescenceEvidence(attempt: ExecutionAttemptFence): AttemptQuiescenceEvidence {
  return {
    kind: "AttemptQuiescenceConfirmed",
    terminal: attempt.terminal,
    attemptId: attempt.attemptId,
    attemptDigest: attempt.attemptDigest,
    evidenceDigest: digestIdentity("research-sdk.attempt-quiescence.v1", attempt),
  };
}

function residueTerminationEvidence(
  residue: UnresolvedExecutionResidue
): ResidueTerminationEvidence {
  return {
    kind: "ProcessTerminationConfirmed",
    cell: residue.cell,
    residueDigest: residue.residueDigest,
    processLocator: residue.outcome.processLocator,
    sandboxLocator: residue.sandboxLocator,
    evidenceDigest: digestIdentity("research-sdk.process-termination.v1", residue),
  };
}

function inspectAbsentTerminal(input: {
  readonly proposedAttempt: ExecutionAttemptFence;
  readonly admitAttempt: (attempt: ExecutionAttemptFence) => Effect.Effect<AdmissionOutcome>;
}) {
  const terminal = solverTerminal();
  const absent: ReadExact<typeof terminal> = { kind: "Absent" };
  return inspectExecutionReentry({
    expectedTerminal: stageOutputKeyOf(terminal),
    proposedAttempt: input.proposedAttempt,
    digestTerminalValue: digestSolverTerminalValue,
    digestAttemptValue: digestExecutionAttemptValue,
    digestResidueValue: digestExecutionResidueValue,
    readTerminal: Effect.succeed(absent),
    admitAttempt: input.admitAttempt,
  });
}

function inspectStoredTerminal(terminal: ReturnType<typeof solverTerminal>) {
  const expected = solverTerminal();
  return inspectExecutionReentry({
    expectedTerminal: stageOutputKeyOf(expected),
    proposedAttempt: executionAttempt(),
    digestTerminalValue: digestSolverTerminalValue,
    digestAttemptValue: digestExecutionAttemptValue,
    digestResidueValue: digestExecutionResidueValue,
    readTerminal: Effect.succeed({ kind: "Found", value: terminal } as const),
    admitAttempt: (attempt) => Effect.succeed({ kind: "Admitted", attempt } as const),
  });
}

function terminalWithAttemptBoundTo(
  otherTerminal: ExecutionAttemptValue["terminal"]
): ReturnType<typeof solverTerminal> {
  const terminal = solverTerminal();
  const attemptedValue = {
    terminal: otherTerminal,
    attemptId: terminal.value.attempt.attemptId,
  };
  const value = {
    ...terminal.value,
    attempt: {
      ...terminal.value.attempt,
      attemptDigest: digestExecutionAttemptValue(attemptedValue),
    },
  };
  return {
    ...terminal,
    value,
    outputDigest: digestSolverTerminalValue(value),
  };
}

function terminalForAttempt(attempt: ExecutionAttemptFence): ReturnType<typeof solverTerminal> {
  const terminal = solverTerminal();
  const value = {
    ...terminal.value,
    attempt: {
      attemptId: attempt.attemptId,
      attemptDigest: attempt.attemptDigest,
    },
  };
  return {
    ...terminal,
    value,
    outputDigest: digestSolverTerminalValue(value),
  };
}

describe("same-instance re-entry", () => {
  test("publishes a terminal only for the exact admitted attempt", () => {
    const admitted = executionAttempt("attempt-A");
    const other = executionAttempt("attempt-B");
    const candidate = terminalForAttempt(admitted);
    const otherTerminal = terminalForAttempt(other);
    const admission = { kind: "Admitted" as const, attempt: admitted };

    if (false) {
      // @ts-expect-error solver terminals require their admitted execution fence
      classifyPublication(candidate, { kind: "Created" }, digestSolverTerminalValue);
    }

    expect(
      classifySolverTerminalPublication({
        admission,
        candidate,
        outcome: { kind: "Created" },
        digestTerminalValue: digestSolverTerminalValue,
        digestAttemptValue: digestExecutionAttemptValue,
      })
    ).toEqual({ kind: "Published", value: candidate });
    expect(
      classifySolverTerminalPublication({
        admission,
        candidate,
        outcome: { kind: "Unknown", uncertainty: { operationId: "terminal-write-A" } },
        digestTerminalValue: digestSolverTerminalValue,
        digestAttemptValue: digestExecutionAttemptValue,
      })
    ).toEqual({
      kind: "ReadAfterUnknown",
      uncertainty: { operationId: "terminal-write-A" },
    });

    expect(
      classifySolverTerminalPublication({
        admission,
        candidate: otherTerminal,
        outcome: { kind: "Created" },
        digestTerminalValue: digestSolverTerminalValue,
        digestAttemptValue: digestExecutionAttemptValue,
      })
    ).toEqual({
      kind: "Conflict",
      conflict: { kind: "TerminalAttemptBindingMismatch" },
    });

    const corruptAdmission = {
      kind: "Admitted" as const,
      attempt: {
        ...admitted,
        attemptDigest: digestIdentity("research-sdk.execution-attempt.v1", "corrupt"),
      },
    };
    const corruptCandidate = terminalForAttempt(corruptAdmission.attempt);
    expect(
      classifySolverTerminalPublication({
        admission: corruptAdmission,
        candidate: corruptCandidate,
        outcome: { kind: "Created" },
        digestTerminalValue: digestSolverTerminalValue,
        digestAttemptValue: digestExecutionAttemptValue,
      })
    ).toEqual({
      kind: "Conflict",
      conflict: { kind: "AdmittedAttemptDigestMismatch" },
    });

    expect(
      reconcileSolverTerminalPublicationAfterUnknown({
        admission,
        candidate,
        read: { kind: "Found", value: otherTerminal },
        digestTerminalValue: digestSolverTerminalValue,
        digestAttemptValue: digestExecutionAttemptValue,
      })
    ).toEqual({
      kind: "Conflict",
      conflict: { kind: "DivergentExistingOutput" },
    });

    const widened = candidate as PortableStageOutput<StageOutputShape>;
    expect(classifyPublication(widened, { kind: "Created" }, () => candidate.outputDigest)).toEqual(
      {
        kind: "Conflict",
        conflict: { kind: "SolverTerminalRequiresAdmittedAttempt" },
      }
    );
    expect(
      reconcilePublicationAfterUnknown(
        widened,
        { kind: "Found", value: widened },
        () => candidate.outputDigest
      )
    ).toEqual({
      kind: "Conflict",
      conflict: { kind: "SolverTerminalRequiresAdmittedAttempt" },
    });
  });

  test("adopts an exact terminal before attempting execution admission", async () => {
    let admissionAttempts = 0;
    const terminal = solverTerminal();

    const decision = await Effect.runPromise(
      inspectExecutionReentry({
        expectedTerminal: stageOutputKeyOf(terminal),
        proposedAttempt: executionAttempt(),
        digestTerminalValue: digestSolverTerminalValue,
        digestAttemptValue: digestExecutionAttemptValue,
        digestResidueValue: digestExecutionResidueValue,
        readTerminal: Effect.succeed({ kind: "Found", value: terminal } as const),
        admitAttempt: (attempt) => {
          admissionAttempts += 1;
          return Effect.succeed({ kind: "Admitted", attempt } as const);
        },
      })
    );

    expect(decision).toEqual({ kind: "AdoptTerminal", terminal });
    expect(admissionAttempts).toBe(0);
  });

  test("fails closed on a corrupt terminal before attempting admission", async () => {
    let admissionAttempts = 0;
    const terminal = solverTerminal();
    const corrupt = {
      ...terminal,
      outputDigest: digestIdentity("research-sdk.solver-terminal-value.v1", "wrong"),
    };

    const decision = await Effect.runPromise(
      inspectExecutionReentry({
        expectedTerminal: stageOutputKeyOf(terminal),
        proposedAttempt: executionAttempt(),
        digestTerminalValue: digestSolverTerminalValue,
        digestAttemptValue: digestExecutionAttemptValue,
        digestResidueValue: digestExecutionResidueValue,
        readTerminal: Effect.succeed({ kind: "Found", value: corrupt } as const),
        admitAttempt: (attempt) => {
          admissionAttempts += 1;
          return Effect.succeed({ kind: "Admitted", attempt } as const);
        },
      })
    );

    expect(decision).toEqual({
      kind: "TerminalConflict",
      conflict: { kind: "StoredOutputDigestMismatch" },
    });
    expect(admissionAttempts).toBe(0);
  });

  test("fails closed on a terminal stored under another exact cell", async () => {
    let admissionAttempts = 0;
    const terminal = solverTerminal();
    const wrongCellTerminal = { ...terminal, cell: cellKey("another-instance") };

    const decision = await Effect.runPromise(
      inspectExecutionReentry({
        expectedTerminal: stageOutputKeyOf(terminal),
        proposedAttempt: executionAttempt(),
        digestTerminalValue: digestSolverTerminalValue,
        digestAttemptValue: digestExecutionAttemptValue,
        digestResidueValue: digestExecutionResidueValue,
        readTerminal: Effect.succeed({ kind: "Found", value: wrongCellTerminal } as const),
        admitAttempt: (attempt) => {
          admissionAttempts += 1;
          return Effect.succeed({ kind: "Admitted", attempt } as const);
        },
      })
    );

    expect(decision).toEqual({
      kind: "TerminalConflict",
      conflict: { kind: "IdentityMismatch" },
    });
    expect(admissionAttempts).toBe(0);
  });

  test("rejects a self-consistent terminal whose attempt names another implementation", async () => {
    const expected = stageOutputKeyOf(solverTerminal());
    const terminal = terminalWithAttemptBoundTo({
      ...expected,
      implementationRevision: "sdk-other",
    });

    expect(await Effect.runPromise(inspectStoredTerminal(terminal))).toEqual({
      kind: "TerminalAttemptDigestMismatch",
      terminal,
    });
  });

  test("rejects a self-consistent terminal whose attempt names another predecessor closure", async () => {
    const expected = stageOutputKeyOf(solverTerminal());
    const terminal = terminalWithAttemptBoundTo({
      ...expected,
      predecessors: {
        kind: "Set",
        digests: [digestIdentity("research-sdk.prepared-cell.v1", "another-predecessor")],
      },
    });

    expect(await Effect.runPromise(inspectStoredTerminal(terminal))).toEqual({
      kind: "TerminalAttemptDigestMismatch",
      terminal,
    });
  });

  test("authorizes observation acquisition only from an exact admitted fence", async () => {
    const attempt = executionAttempt();
    const decision = await Effect.runPromise(
      inspectAbsentTerminal({
        proposedAttempt: attempt,
        admitAttempt: (candidate) =>
          Effect.succeed({ kind: "Admitted", attempt: candidate } as const),
      })
    );

    expect(decision).toEqual({ kind: "AcquireObservation", attempt });
  });

  test("adopts a terminal published between the initial read and atomic admission", async () => {
    const terminal = solverTerminal();
    const decision = await Effect.runPromise(
      inspectAbsentTerminal({
        proposedAttempt: executionAttempt("attempt-after-initial-read"),
        admitAttempt: () =>
          Effect.succeed({
            kind: "Conflict",
            conflict: { kind: "Terminal", terminal },
          } as const),
      })
    );

    expect(decision).toEqual({ kind: "AdoptTerminal", terminal });
  });

  test("rejects a cross-revision candidate before the atomic port is called", async () => {
    let admissionAttempts = 0;
    const original = executionAttempt();
    const value = {
      terminal: { ...original.terminal, implementationRevision: "sdk-other" },
      attemptId: original.attemptId,
    };
    const attempt = { ...value, attemptDigest: digestExecutionAttemptValue(value) };
    const decision = await Effect.runPromise(
      inspectAbsentTerminal({
        proposedAttempt: attempt,
        admitAttempt: (candidate) => {
          admissionAttempts += 1;
          return Effect.succeed({ kind: "Admitted", attempt: candidate } as const);
        },
      })
    );

    expect(decision).toEqual({ kind: "AttemptIdentityMismatch", attempt });
    expect(admissionAttempts).toBe(0);
  });

  test("rejects an admitted fence that is not the proposed exact attempt", async () => {
    const proposedAttempt = executionAttempt("attempt-proposed");
    const admittedAttempt = executionAttempt("attempt-other");
    const decision = await Effect.runPromise(
      inspectAbsentTerminal({
        proposedAttempt,
        admitAttempt: () => Effect.succeed({ kind: "Admitted", attempt: admittedAttempt } as const),
      })
    );

    expect(decision).toEqual({
      kind: "AttemptAdmissionMismatch",
      attempt: admittedAttempt,
    });
  });

  test("blocks on an occupied fence even when it is byte-identical", async () => {
    const attempt = executionAttempt();
    const decision = await Effect.runPromise(
      inspectAbsentTerminal({
        proposedAttempt: attempt,
        admitAttempt: () => Effect.succeed({ kind: "Occupied", attempt } as const),
      })
    );

    expect(decision).toEqual({ kind: "BlockedByAttempt", attempt });
  });

  test("blocks on exact unresolved residue reported by atomic admission", async () => {
    const residue = unresolvedResidue();
    const decision = await Effect.runPromise(
      inspectAbsentTerminal({
        proposedAttempt: executionAttempt(),
        admitAttempt: () =>
          Effect.succeed({
            kind: "Conflict",
            conflict: { kind: "Residue", residue },
          } as const),
      })
    );

    expect(decision).toEqual({ kind: "BlockedByResidue", residue });
  });

  test("rejects residue returned for another exact cell or instance", async () => {
    const residue = { ...unresolvedResidue(), cell: cellKey("another-instance") };
    const decision = await Effect.runPromise(
      inspectAbsentTerminal({
        proposedAttempt: executionAttempt(),
        admitAttempt: () =>
          Effect.succeed({
            kind: "Conflict",
            conflict: { kind: "Residue", residue },
          } as const),
      })
    );

    expect(decision).toEqual({ kind: "ResidueIdentityMismatch", residue });
  });

  test("blocks on an unknown atomic admission outcome", async () => {
    const uncertainty = { operationId: "admission-write-1" };
    const decision = await Effect.runPromise(
      inspectAbsentTerminal({
        proposedAttempt: executionAttempt(),
        admitAttempt: () => Effect.succeed({ kind: "Unknown", uncertainty } as const),
      })
    );

    expect(decision).toEqual({ kind: "AdmissionUnknown", uncertainty });
  });

  test("admits at most one concurrent execution authority", async () => {
    let active: ExecutionAttemptFence | undefined;
    const admitAttempt = (attempt: ExecutionAttemptFence) =>
      Effect.sync((): AdmissionOutcome => {
        if (active) {
          return { kind: "Occupied", attempt: active };
        }
        active = attempt;
        return { kind: "Admitted", attempt };
      });

    const firstAttempt = executionAttempt("attempt-concurrent-1");
    const secondAttempt = executionAttempt("attempt-concurrent-2");
    const [first, second] = await Promise.all([
      Effect.runPromise(inspectAbsentTerminal({ proposedAttempt: firstAttempt, admitAttempt })),
      Effect.runPromise(inspectAbsentTerminal({ proposedAttempt: secondAttempt, admitAttempt })),
    ]);

    expect([first.kind, second.kind].sort()).toEqual(["AcquireObservation", "BlockedByAttempt"]);
  });

  test("crash before residue publication remains fenced until exact quiescence evidence", async () => {
    let active: ExecutionAttemptFence | undefined;
    const admitAttempt = (attempt: ExecutionAttemptFence) =>
      Effect.sync((): AdmissionOutcome => {
        if (active) {
          return { kind: "Occupied", attempt: active };
        }
        active = attempt;
        return { kind: "Admitted", attempt };
      });
    const firstAttempt = executionAttempt("attempt-before-crash");

    expect(
      (
        await Effect.runPromise(
          inspectAbsentTerminal({ proposedAttempt: firstAttempt, admitAttempt })
        )
      ).kind
    ).toBe("AcquireObservation");

    const replacement = executionAttempt("attempt-after-crash");
    expect(
      (
        await Effect.runPromise(
          inspectAbsentTerminal({ proposedAttempt: replacement, admitAttempt })
        )
      ).kind
    ).toBe("BlockedByAttempt");

    const wrongEvidence = {
      ...quiescenceEvidence(firstAttempt),
      attemptId: "another-attempt",
    };
    expect(
      classifyAttemptReconciliation({
        expectedAttempt: firstAttempt,
        current: { kind: "Active", attempt: firstAttempt },
        digestAttemptValue: digestExecutionAttemptValue,
        evidence: wrongEvidence,
      }).kind
    ).toBe("EvidenceMismatch");
    expect(active).toEqual(firstAttempt);

    expect(
      classifyAttemptReconciliation({
        expectedAttempt: firstAttempt,
        current: { kind: "Active", attempt: firstAttempt },
        digestAttemptValue: digestExecutionAttemptValue,
        evidence: quiescenceEvidence(firstAttempt),
      })
    ).toEqual({ kind: "Reconciled" });
    active = undefined;

    expect(
      (
        await Effect.runPromise(
          inspectAbsentTerminal({ proposedAttempt: replacement, admitAttempt })
        )
      ).kind
    ).toBe("AcquireObservation");
  });

  test("requires exact residue and process identity in termination evidence", () => {
    const residue = unresolvedResidue();
    const evidence = residueTerminationEvidence(residue);

    expect(
      classifyResidueReconciliation({
        expectedCell: cellKey("another-instance"),
        current: { kind: "Unresolved", residue },
        expectedResidueDigest: residue.residueDigest,
        digestResidueValue: digestExecutionResidueValue,
        evidence,
      }).kind
    ).toBe("Stale");

    expect(
      classifyResidueReconciliation({
        expectedCell: residue.cell,
        current: { kind: "Unresolved", residue },
        expectedResidueDigest: residue.residueDigest,
        digestResidueValue: digestExecutionResidueValue,
        evidence: { ...evidence, processLocator: "pid:other" },
      }).kind
    ).toBe("EvidenceMismatch");

    expect(
      classifyResidueReconciliation({
        expectedCell: residue.cell,
        current: { kind: "Unresolved", residue },
        expectedResidueDigest: residue.residueDigest,
        digestResidueValue: digestExecutionResidueValue,
        evidence,
      })
    ).toEqual({ kind: "Reconciled" });
  });

  test("rejects a corrupted residue body that retains the expected digest", () => {
    const residue = unresolvedResidue();
    const corrupt = { ...residue, sandboxLocator: "sandbox:other" };

    expect(
      classifyResidueReconciliation({
        expectedCell: residue.cell,
        current: { kind: "Unresolved", residue: corrupt },
        expectedResidueDigest: residue.residueDigest,
        digestResidueValue: digestExecutionResidueValue,
        evidence: residueTerminationEvidence(residue),
      })
    ).toEqual({ kind: "Corrupt", residue: corrupt });
  });
});
