import { Effect } from "effect";
import type { UnresolvedExecutionResidue } from "../contracts/execution.js";
import type { PortableStageOutput, StageOutputKey } from "../contracts/stage-output.js";
import {
  type AdoptionConflict,
  classifySolverTerminalAdoption,
  type DigestValue,
} from "./adoption.js";
import {
  type AttemptAdmissionOutcome,
  classifyAttemptAdmission,
  classifyAttemptCandidate,
  type DigestAttemptValue,
  type DigestResidueValue,
  type ExecutionAttemptFence,
} from "./residue.js";
import type { SolverTerminalShape } from "./stage-shapes.js";
import type { ReadExact } from "./terminal-sink.js";

export type ReentryDecision<Terminal, Attempt, Residue, Uncertainty> =
  | { readonly kind: "AdoptTerminal"; readonly terminal: Terminal }
  | { readonly kind: "AcquireObservation"; readonly attempt: Attempt }
  | { readonly kind: "BlockedByAttempt"; readonly attempt: Attempt }
  | { readonly kind: "BlockedByResidue"; readonly residue: Residue }
  | { readonly kind: "AdmissionUnknown"; readonly uncertainty: Uncertainty }
  | { readonly kind: "AttemptDigestMismatch"; readonly attempt: Attempt }
  | { readonly kind: "AttemptAdmissionMismatch"; readonly attempt: Attempt }
  | { readonly kind: "AttemptIdentityMismatch"; readonly attempt: Attempt }
  | { readonly kind: "ResidueDigestMismatch"; readonly residue: Residue }
  | { readonly kind: "TerminalConflict"; readonly conflict: AdoptionConflict }
  | { readonly kind: "TerminalAttemptDigestMismatch"; readonly terminal: Terminal }
  | { readonly kind: "ResidueIdentityMismatch"; readonly residue: Residue };

export function inspectExecutionReentry<
  Terminal extends SolverTerminalShape,
  Attempt extends ExecutionAttemptFence,
  Residue extends UnresolvedExecutionResidue,
  Uncertainty,
  TerminalError,
  AttemptError,
  TerminalRequirements,
  AttemptRequirements,
>(input: {
  readonly expectedTerminal: StageOutputKey<"SolverTerminal">;
  readonly proposedAttempt: Attempt;
  readonly digestTerminalValue: DigestValue<PortableStageOutput<Terminal>["value"]>;
  readonly digestAttemptValue: DigestAttemptValue;
  readonly digestResidueValue: DigestResidueValue;
  readonly readTerminal: Effect.Effect<
    ReadExact<PortableStageOutput<Terminal>>,
    TerminalError,
    TerminalRequirements
  >;
  readonly admitAttempt: (
    attempt: Attempt
  ) => Effect.Effect<
    AttemptAdmissionOutcome<Attempt, Residue, Uncertainty, PortableStageOutput<Terminal>>,
    AttemptError,
    AttemptRequirements
  >;
}): Effect.Effect<
  ReentryDecision<PortableStageOutput<Terminal>, Attempt, Residue, Uncertainty>,
  TerminalError | AttemptError,
  TerminalRequirements | AttemptRequirements
> {
  return Effect.gen(function* () {
    const terminal = yield* input.readTerminal;
    if (terminal.kind === "Found") {
      return classifyTerminalAdoption({
        expectedTerminal: input.expectedTerminal,
        terminal: terminal.value,
        digestTerminalValue: input.digestTerminalValue,
        digestAttemptValue: input.digestAttemptValue,
      });
    }

    const candidate = classifyAttemptCandidate({
      expectedTerminal: input.expectedTerminal,
      attempt: input.proposedAttempt,
      digestAttemptValue: input.digestAttemptValue,
    });
    if (candidate.kind !== "ValidAttempt") {
      return candidate;
    }

    const outcome = yield* input.admitAttempt(input.proposedAttempt);
    let nonTerminalOutcome: AttemptAdmissionOutcome<Attempt, Residue, Uncertainty>;
    if (outcome.kind !== "Conflict") {
      nonTerminalOutcome = outcome;
    } else if (outcome.conflict.kind === "Terminal") {
      return classifyTerminalAdoption({
        expectedTerminal: input.expectedTerminal,
        terminal: outcome.conflict.terminal,
        digestTerminalValue: input.digestTerminalValue,
        digestAttemptValue: input.digestAttemptValue,
      });
    } else if (outcome.conflict.kind === "Attempt") {
      nonTerminalOutcome = {
        kind: "Conflict",
        conflict: { kind: "Attempt", attempt: outcome.conflict.attempt },
      };
    } else {
      nonTerminalOutcome = {
        kind: "Conflict",
        conflict: { kind: "Residue", residue: outcome.conflict.residue },
      };
    }

    const admission = classifyAttemptAdmission({
      expectedTerminal: input.expectedTerminal,
      expectedAttempt: input.proposedAttempt,
      outcome: nonTerminalOutcome,
      digestAttemptValue: input.digestAttemptValue,
      digestResidueValue: input.digestResidueValue,
    });
    if (admission.kind === "Admitted") {
      return { kind: "AcquireObservation", attempt: admission.attempt };
    }
    return admission;
  });
}

function classifyTerminalAdoption<Terminal extends SolverTerminalShape>(input: {
  readonly expectedTerminal: StageOutputKey<"SolverTerminal">;
  readonly terminal: PortableStageOutput<Terminal>;
  readonly digestTerminalValue: DigestValue<PortableStageOutput<Terminal>["value"]>;
  readonly digestAttemptValue: DigestAttemptValue;
}):
  | { readonly kind: "AdoptTerminal"; readonly terminal: PortableStageOutput<Terminal> }
  | { readonly kind: "TerminalConflict"; readonly conflict: AdoptionConflict }
  | {
      readonly kind: "TerminalAttemptDigestMismatch";
      readonly terminal: PortableStageOutput<Terminal>;
    } {
  const adoption = classifySolverTerminalAdoption({
    expectedTerminal: input.expectedTerminal,
    stored: { kind: "Found", value: input.terminal },
    digestTerminalValue: input.digestTerminalValue,
    digestAttemptValue: input.digestAttemptValue,
  });
  if (adoption.kind === "Conflict") {
    if (adoption.conflict.kind === "TerminalAttemptDigestMismatch") {
      return { kind: "TerminalAttemptDigestMismatch", terminal: input.terminal };
    }
    return { kind: "TerminalConflict", conflict: adoption.conflict };
  }
  if (adoption.kind === "Absent") {
    return { kind: "TerminalConflict", conflict: { kind: "IdentityMismatch" } };
  }

  return { kind: "AdoptTerminal", terminal: adoption.value };
}
