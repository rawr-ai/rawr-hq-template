import type { Effect } from "effect";
import type {
  UnresolvedExecutionResidue,
  UnresolvedExecutionResidueValue,
} from "../contracts/execution.js";
import type { CellKey, DigestIdentity } from "../contracts/identity.js";
import type { StageOutputKey } from "../contracts/stage-output.js";
import { equalStructuredData } from "./adoption.js";

export interface ExecutionAttemptValue {
  readonly terminal: StageOutputKey<"SolverTerminal">;
  readonly attemptId: string;
}

export interface ExecutionAttemptFence extends ExecutionAttemptValue {
  readonly attemptDigest: DigestIdentity;
}

export interface AttemptQuiescenceEvidence {
  readonly kind: "AttemptQuiescenceConfirmed";
  readonly terminal: StageOutputKey<"SolverTerminal">;
  readonly attemptId: string;
  readonly attemptDigest: DigestIdentity;
  readonly evidenceDigest: DigestIdentity;
}

export interface ResidueTerminationEvidence {
  readonly kind: "ProcessTerminationConfirmed";
  readonly cell: CellKey;
  readonly residueDigest: DigestIdentity;
  readonly processLocator: string;
  readonly sandboxLocator: string;
  readonly evidenceDigest: DigestIdentity;
}

export type AttemptAdmissionConflict<Attempt, Residue, Terminal = never> =
  | { readonly kind: "Attempt"; readonly attempt: Attempt }
  | { readonly kind: "Residue"; readonly residue: Residue }
  | { readonly kind: "Terminal"; readonly terminal: Terminal };

export type AttemptAdmissionOutcome<Attempt, Residue, Uncertainty, Terminal = never> =
  | { readonly kind: "Admitted"; readonly attempt: Attempt }
  | { readonly kind: "Occupied"; readonly attempt: Attempt }
  | {
      readonly kind: "Conflict";
      readonly conflict: { readonly kind: "Attempt"; readonly attempt: Attempt };
    }
  | {
      readonly kind: "Conflict";
      readonly conflict: { readonly kind: "Residue"; readonly residue: Residue };
    }
  | {
      readonly kind: "Conflict";
      readonly conflict: { readonly kind: "Terminal"; readonly terminal: Terminal };
    }
  | { readonly kind: "Unknown"; readonly uncertainty: Uncertainty };

export type AttemptAdmissionAssessment<Attempt, Residue, Uncertainty> =
  | { readonly kind: "Admitted"; readonly attempt: Attempt }
  | { readonly kind: "BlockedByAttempt"; readonly attempt: Attempt }
  | { readonly kind: "BlockedByResidue"; readonly residue: Residue }
  | { readonly kind: "AdmissionUnknown"; readonly uncertainty: Uncertainty }
  | { readonly kind: "AttemptDigestMismatch"; readonly attempt: Attempt }
  | { readonly kind: "AttemptAdmissionMismatch"; readonly attempt: Attempt }
  | { readonly kind: "AttemptIdentityMismatch"; readonly attempt: Attempt }
  | { readonly kind: "ResidueDigestMismatch"; readonly residue: Residue }
  | { readonly kind: "ResidueIdentityMismatch"; readonly residue: Residue };

export type AttemptCandidateAssessment<Attempt> =
  | { readonly kind: "ValidAttempt"; readonly attempt: Attempt }
  | { readonly kind: "AttemptDigestMismatch"; readonly attempt: Attempt }
  | { readonly kind: "AttemptIdentityMismatch"; readonly attempt: Attempt };

export type AttemptQuery<Attempt> =
  | { readonly kind: "Clear" }
  | { readonly kind: "Active"; readonly attempt: Attempt };

export type AttemptReconcileOutcome<Attempt> =
  | { readonly kind: "Reconciled" }
  | { readonly kind: "AlreadyClear" }
  | { readonly kind: "Corrupt"; readonly attempt: Attempt }
  | { readonly kind: "Stale"; readonly attempt: Attempt }
  | { readonly kind: "EvidenceMismatch"; readonly attempt: Attempt };

export type ResidueQuery<Residue> =
  | { readonly kind: "Clear" }
  | { readonly kind: "Unresolved"; readonly residue: Residue };

export type ResidueRecordOutcome<Residue> =
  | { readonly kind: "Recorded" }
  | { readonly kind: "Existing"; readonly residue: Residue }
  | { readonly kind: "Conflict"; readonly residue: Residue };

export type ResidueReconcileOutcome<Residue> =
  | { readonly kind: "Reconciled" }
  | { readonly kind: "AlreadyClear" }
  | { readonly kind: "Corrupt"; readonly residue: Residue }
  | { readonly kind: "Stale"; readonly residue: Residue }
  | { readonly kind: "EvidenceMismatch"; readonly residue: Residue };

export type DigestAttemptValue = (value: ExecutionAttemptValue) => DigestIdentity;
export type DigestResidueValue = (value: UnresolvedExecutionResidueValue) => DigestIdentity;

export interface ExecutionAttemptPort<
  Attempt extends ExecutionAttemptFence,
  Residue extends UnresolvedExecutionResidue,
  Terminal,
  Uncertainty,
  Error,
  Requirements = never,
> {
  /**
   * Atomically persists the candidate only when its terminal key has no
   * published terminal, active attempt, or unresolved residue. The lane owns
   * durability and returns the exact conflicting subject.
   */
  readonly admitExact: (
    attempt: Attempt
  ) => Effect.Effect<
    AttemptAdmissionOutcome<Attempt, Residue, Uncertainty, Terminal>,
    Error,
    Requirements
  >;
  readonly reconcileExact: (input: {
    readonly expectedAttempt: Attempt;
    readonly evidence: AttemptQuiescenceEvidence;
  }) => Effect.Effect<AttemptReconcileOutcome<Attempt>, Error, Requirements>;
}

export interface ExecutionResiduePort<
  Residue extends UnresolvedExecutionResidue,
  Error,
  Requirements = never,
> {
  readonly query: (cell: CellKey) => Effect.Effect<ResidueQuery<Residue>, Error, Requirements>;
  readonly record: (
    residue: Residue
  ) => Effect.Effect<ResidueRecordOutcome<Residue>, Error, Requirements>;
  readonly reconcileExact: (input: {
    readonly cell: CellKey;
    readonly expectedResidueDigest: DigestIdentity;
    readonly evidence: ResidueTerminationEvidence;
  }) => Effect.Effect<ResidueReconcileOutcome<Residue>, Error, Requirements>;
}

export function classifyAttemptAdmission<
  Attempt extends ExecutionAttemptFence,
  Residue extends UnresolvedExecutionResidue,
  Uncertainty,
>(input: {
  readonly expectedTerminal: StageOutputKey<"SolverTerminal">;
  readonly expectedAttempt: Attempt;
  readonly outcome: AttemptAdmissionOutcome<Attempt, Residue, Uncertainty>;
  readonly digestAttemptValue: DigestAttemptValue;
  readonly digestResidueValue: DigestResidueValue;
}): AttemptAdmissionAssessment<Attempt, Residue, Uncertainty> {
  const candidate = classifyAttemptCandidate({
    expectedTerminal: input.expectedTerminal,
    attempt: input.expectedAttempt,
    digestAttemptValue: input.digestAttemptValue,
  });
  if (candidate.kind !== "ValidAttempt") {
    return candidate;
  }

  if (input.outcome.kind === "Unknown") {
    return { kind: "AdmissionUnknown", uncertainty: input.outcome.uncertainty };
  }

  if (input.outcome.kind === "Conflict") {
    if (input.outcome.conflict.kind === "Terminal") {
      return input.outcome.conflict.terminal;
    }
    if (input.outcome.conflict.kind === "Residue") {
      const { residue } = input.outcome.conflict;
      if (!equalStructuredData(residue.cell, input.expectedTerminal.cell)) {
        return { kind: "ResidueIdentityMismatch", residue };
      }
      if (!residueDigestMatches(residue, input.digestResidueValue)) {
        return { kind: "ResidueDigestMismatch", residue };
      }
      return { kind: "BlockedByResidue", residue };
    }

    return classifyStoredAttempt({
      expectedTerminal: input.expectedTerminal,
      attempt: input.outcome.conflict.attempt,
      digestAttemptValue: input.digestAttemptValue,
    });
  }

  const { attempt } = input.outcome;
  if (!equalStructuredData(attempt.terminal, input.expectedTerminal)) {
    return { kind: "AttemptIdentityMismatch", attempt };
  }
  if (!attemptDigestMatches(attempt, input.digestAttemptValue)) {
    return { kind: "AttemptDigestMismatch", attempt };
  }

  if (input.outcome.kind !== "Admitted") {
    return { kind: "BlockedByAttempt", attempt };
  }
  if (!equalStructuredData(attempt, input.expectedAttempt)) {
    return { kind: "AttemptAdmissionMismatch", attempt };
  }
  return input.outcome;
}

export function classifyAttemptCandidate<Attempt extends ExecutionAttemptFence>(input: {
  readonly expectedTerminal: StageOutputKey<"SolverTerminal">;
  readonly attempt: Attempt;
  readonly digestAttemptValue: DigestAttemptValue;
}): AttemptCandidateAssessment<Attempt> {
  if (!equalStructuredData(input.attempt.terminal, input.expectedTerminal)) {
    return { kind: "AttemptIdentityMismatch", attempt: input.attempt };
  }
  if (!attemptDigestMatches(input.attempt, input.digestAttemptValue)) {
    return { kind: "AttemptDigestMismatch", attempt: input.attempt };
  }
  return { kind: "ValidAttempt", attempt: input.attempt };
}

function classifyStoredAttempt<Attempt extends ExecutionAttemptFence>(input: {
  readonly expectedTerminal: StageOutputKey<"SolverTerminal">;
  readonly attempt: Attempt;
  readonly digestAttemptValue: DigestAttemptValue;
}): AttemptAdmissionAssessment<Attempt, never, never> {
  if (!equalStructuredData(input.attempt.terminal, input.expectedTerminal)) {
    return { kind: "AttemptIdentityMismatch", attempt: input.attempt };
  }
  if (!attemptDigestMatches(input.attempt, input.digestAttemptValue)) {
    return { kind: "AttemptDigestMismatch", attempt: input.attempt };
  }
  return { kind: "BlockedByAttempt", attempt: input.attempt };
}

export function classifyAttemptReconciliation<Attempt extends ExecutionAttemptFence>(input: {
  readonly expectedAttempt: Attempt;
  readonly current: AttemptQuery<Attempt>;
  readonly digestAttemptValue: DigestAttemptValue;
  readonly evidence: AttemptQuiescenceEvidence;
}): AttemptReconcileOutcome<Attempt> {
  if (input.current.kind === "Clear") {
    return { kind: "AlreadyClear" };
  }

  const { attempt } = input.current;
  if (!equalStructuredData(attempt.terminal, input.expectedAttempt.terminal)) {
    return { kind: "Stale", attempt };
  }
  if (!attemptDigestMatches(attempt, input.digestAttemptValue)) {
    return { kind: "Corrupt", attempt };
  }
  if (!equalStructuredData(attempt, input.expectedAttempt)) {
    return { kind: "Stale", attempt };
  }
  if (!attemptEvidenceMatches(attempt, input.evidence)) {
    return { kind: "EvidenceMismatch", attempt };
  }

  return { kind: "Reconciled" };
}

export function classifyResidueReconciliation<Residue extends UnresolvedExecutionResidue>(input: {
  readonly expectedCell: CellKey;
  readonly current: ResidueQuery<Residue>;
  readonly expectedResidueDigest: DigestIdentity;
  readonly digestResidueValue: DigestResidueValue;
  readonly evidence: ResidueTerminationEvidence;
}): ResidueReconcileOutcome<Residue> {
  if (input.current.kind === "Clear") {
    return { kind: "AlreadyClear" };
  }

  if (!equalStructuredData(input.current.residue.cell, input.expectedCell)) {
    return { kind: "Stale", residue: input.current.residue };
  }

  if (!residueDigestMatches(input.current.residue, input.digestResidueValue)) {
    return { kind: "Corrupt", residue: input.current.residue };
  }

  if (!equalStructuredData(input.current.residue.residueDigest, input.expectedResidueDigest)) {
    return { kind: "Stale", residue: input.current.residue };
  }

  if (!residueEvidenceMatches(input.current.residue, input.evidence)) {
    return { kind: "EvidenceMismatch", residue: input.current.residue };
  }

  return { kind: "Reconciled" };
}

export function attemptValueOf(attempt: ExecutionAttemptFence): ExecutionAttemptValue {
  return {
    terminal: attempt.terminal,
    attemptId: attempt.attemptId,
  };
}

export function residueValueOf(
  residue: UnresolvedExecutionResidue
): UnresolvedExecutionResidueValue {
  return {
    cell: residue.cell,
    outcome: residue.outcome,
    sandboxLocator: residue.sandboxLocator,
  };
}

function attemptDigestMatches(
  attempt: ExecutionAttemptFence,
  digestAttemptValue: DigestAttemptValue
): boolean {
  return equalStructuredData(digestAttemptValue(attemptValueOf(attempt)), attempt.attemptDigest);
}

function residueDigestMatches(
  residue: UnresolvedExecutionResidue,
  digestResidueValue: DigestResidueValue
): boolean {
  return equalStructuredData(digestResidueValue(residueValueOf(residue)), residue.residueDigest);
}

function attemptEvidenceMatches(
  attempt: ExecutionAttemptFence,
  evidence: AttemptQuiescenceEvidence
): boolean {
  return (
    equalStructuredData(evidence.terminal, attempt.terminal) &&
    evidence.attemptId === attempt.attemptId &&
    equalStructuredData(evidence.attemptDigest, attempt.attemptDigest)
  );
}

function residueEvidenceMatches(
  residue: UnresolvedExecutionResidue,
  evidence: ResidueTerminationEvidence
): boolean {
  return (
    equalStructuredData(evidence.cell, residue.cell) &&
    equalStructuredData(evidence.residueDigest, residue.residueDigest) &&
    evidence.processLocator === residue.outcome.processLocator &&
    evidence.sandboxLocator === residue.sandboxLocator
  );
}
