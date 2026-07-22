import type { DigestIdentity } from "../contracts/identity.js";
import { isPortableData } from "../contracts/schema.js";
import type {
  PortableStageOutput,
  StageOutputIdentity,
  StageOutputKey,
  StageOutputShape,
} from "../contracts/stage-output.js";
import type { DigestAttemptValue, ExecutionAttemptFence } from "./residue.js";
import type { EvaluationResultShape, SolverTerminalShape } from "./stage-shapes.js";
import type { CreateOutcome, ReadExact } from "./terminal-sink.js";

export type AdoptionConflict =
  | { readonly kind: "IdentityMismatch" }
  | { readonly kind: "StoredOutputDigestMismatch" }
  | { readonly kind: "CandidateOutputDigestMismatch" }
  | { readonly kind: "DivergentExistingOutput" }
  | { readonly kind: "SolverTerminalRequiresAdmittedAttempt" }
  | { readonly kind: "SolverTerminalRequiresExactAdoption" }
  | { readonly kind: "EvaluationResultRequiresExactTerminalBinding" };

export type AdoptionOutcome<Output> =
  | { readonly kind: "Absent" }
  | { readonly kind: "Adopted"; readonly value: Output }
  | { readonly kind: "Conflict"; readonly conflict: AdoptionConflict };

export type SolverTerminalAdoptionConflict =
  | AdoptionConflict
  | { readonly kind: "TerminalAttemptDigestMismatch" };

export type SolverTerminalAdoptionOutcome<Output> =
  | Exclude<AdoptionOutcome<Output>, { readonly kind: "Conflict" }>
  | {
      readonly kind: "Conflict";
      readonly conflict: SolverTerminalAdoptionConflict;
    };

export type EvaluationBindingConflict =
  | { readonly kind: "EvaluationIdentityMismatch" }
  | { readonly kind: "EvaluationPredecessorMismatch" };

export type EvaluationAdoptionConflict = AdoptionConflict | EvaluationBindingConflict;

export type EvaluationAdoptionOutcome<Output> =
  | Exclude<AdoptionOutcome<Output>, { readonly kind: "Conflict" }>
  | {
      readonly kind: "Conflict";
      readonly conflict: EvaluationAdoptionConflict;
    };

export type PublicationOutcome<Output, Uncertainty> =
  | { readonly kind: "Published"; readonly value: Output }
  | { readonly kind: "Adopted"; readonly value: Output }
  | { readonly kind: "Conflict"; readonly conflict: AdoptionConflict }
  | { readonly kind: "ReadAfterUnknown"; readonly uncertainty: Uncertainty }
  | { readonly kind: "RetryPermitted" };

export type SolverTerminalPublicationConflict =
  | AdoptionConflict
  | { readonly kind: "AdmittedAttemptIdentityMismatch" }
  | { readonly kind: "AdmittedAttemptDigestMismatch" }
  | { readonly kind: "TerminalAttemptBindingMismatch" };

export type SolverTerminalPublicationOutcome<Output, Uncertainty> =
  | Exclude<PublicationOutcome<Output, Uncertainty>, { readonly kind: "Conflict" }>
  | {
      readonly kind: "Conflict";
      readonly conflict: SolverTerminalPublicationConflict;
    };

export type EvaluationPublicationConflict = AdoptionConflict | EvaluationBindingConflict;

export type EvaluationPublicationOutcome<Output, Uncertainty> =
  | Exclude<PublicationOutcome<Output, Uncertainty>, { readonly kind: "Conflict" }>
  | {
      readonly kind: "Conflict";
      readonly conflict: EvaluationPublicationConflict;
    };

export type DigestValue<Value> = (value: Value) => DigestIdentity;

type SemanticallyBoundStage = "SolverTerminal" | "EvaluationResult";

type GenericStageGuard<Stage extends string> = [Extract<SemanticallyBoundStage, Stage>] extends [
  never,
]
  ? unknown
  : never;

export function stageOutputKeyOf<const Output extends StageOutputShape>(
  output: PortableStageOutput<Output>
): StageOutputKey<Output["stage"]> {
  return {
    stage: output.stage,
    cell: output.cell,
    frozenInputDigest: output.frozenInputDigest,
    implementationRevision: output.implementationRevision,
    predecessors: output.predecessors,
  };
}

export function stageOutputIdentityOf<const Output extends StageOutputShape>(
  output: PortableStageOutput<Output>
): StageOutputIdentity<Output["stage"]> {
  return {
    ...stageOutputKeyOf(output),
    outputDigest: output.outputDigest,
  };
}

export function classifyAdoption<
  const Stage extends string,
  const Output extends StageOutputShape<Stage>,
>(
  expected: StageOutputKey<Stage> & GenericStageGuard<Stage>,
  stored: ReadExact<PortableStageOutput<Output>>,
  digestValue: DigestValue<PortableStageOutput<Output>["value"]>
): AdoptionOutcome<PortableStageOutput<Output>> {
  const semanticConflict = genericSemanticStageConflict(expected.stage);
  if (semanticConflict) {
    return { kind: "Conflict", conflict: semanticConflict };
  }

  return classifyAdoptionUnchecked(expected, stored, digestValue);
}

export function classifySolverTerminalAdoption<const Terminal extends SolverTerminalShape>(input: {
  readonly expectedTerminal: StageOutputKey<"SolverTerminal">;
  readonly stored: ReadExact<PortableStageOutput<Terminal>>;
  readonly digestTerminalValue: DigestValue<PortableStageOutput<Terminal>["value"]>;
  readonly digestAttemptValue: DigestAttemptValue;
}): SolverTerminalAdoptionOutcome<PortableStageOutput<Terminal>> {
  const adoption = classifyAdoptionUnchecked(
    input.expectedTerminal,
    input.stored,
    input.digestTerminalValue
  );
  if (adoption.kind !== "Adopted") {
    return adoption;
  }

  if (!terminalAttemptIsSelfConsistent(adoption.value, input.digestAttemptValue)) {
    return {
      kind: "Conflict",
      conflict: { kind: "TerminalAttemptDigestMismatch" },
    };
  }

  return adoption;
}

export function classifyEvaluationAdoption<
  const Terminal extends SolverTerminalShape<unknown>,
  const Evaluation extends EvaluationResultShape,
>(input: {
  readonly expectedEvaluation: StageOutputKey<"EvaluationResult">;
  readonly stored: ReadExact<PortableStageOutput<Evaluation>>;
  readonly terminal: PortableStageOutput<Terminal>;
  readonly digestEvaluationValue: DigestValue<PortableStageOutput<Evaluation>["value"]>;
}): EvaluationAdoptionOutcome<PortableStageOutput<Evaluation>> {
  const adoption = classifyAdoptionUnchecked(
    input.expectedEvaluation,
    input.stored,
    input.digestEvaluationValue
  );
  if (adoption.kind !== "Adopted") {
    return adoption;
  }

  const bindingConflict = classifyEvaluationBinding(input.terminal, adoption.value);
  return bindingConflict ? { kind: "Conflict", conflict: bindingConflict } : adoption;
}

function classifyAdoptionUnchecked<
  const Stage extends string,
  const Output extends StageOutputShape<Stage>,
>(
  expected: StageOutputKey<Stage>,
  stored: ReadExact<PortableStageOutput<Output>>,
  digestValue: DigestValue<PortableStageOutput<Output>["value"]>
): AdoptionOutcome<PortableStageOutput<Output>> {
  if (stored.kind === "Absent") {
    return { kind: "Absent" };
  }

  if (!equalStructuredData(expected, stageOutputKeyOf(stored.value))) {
    return { kind: "Conflict", conflict: { kind: "IdentityMismatch" } };
  }

  if (!equalStructuredData(digestValue(stored.value.value), stored.value.outputDigest)) {
    return {
      kind: "Conflict",
      conflict: { kind: "StoredOutputDigestMismatch" },
    };
  }

  return { kind: "Adopted", value: stored.value };
}

export function classifyPublication<const Output extends StageOutputShape, const Uncertainty>(
  candidate: PortableStageOutput<Output> & GenericStageGuard<Output["stage"]>,
  outcome: CreateOutcome<PortableStageOutput<Output>, Uncertainty>,
  digestValue: DigestValue<PortableStageOutput<Output>["value"]>
): PublicationOutcome<PortableStageOutput<Output>, Uncertainty> {
  const semanticConflict = genericSemanticStageConflict(candidate.stage);
  if (semanticConflict) {
    return {
      kind: "Conflict",
      conflict:
        candidate.stage === "SolverTerminal"
          ? { kind: "SolverTerminalRequiresAdmittedAttempt" }
          : semanticConflict,
    };
  }
  return classifyPublicationUnchecked(candidate, outcome, digestValue);
}

export function classifySolverTerminalPublication<
  const Terminal extends SolverTerminalShape,
  const Attempt extends ExecutionAttemptFence,
  const Uncertainty,
>(input: {
  readonly admission: { readonly kind: "Admitted"; readonly attempt: Attempt };
  readonly candidate: PortableStageOutput<Terminal>;
  readonly outcome: CreateOutcome<PortableStageOutput<Terminal>, Uncertainty>;
  readonly digestTerminalValue: DigestValue<PortableStageOutput<Terminal>["value"]>;
  readonly digestAttemptValue: DigestAttemptValue;
}): SolverTerminalPublicationOutcome<PortableStageOutput<Terminal>, Uncertainty> {
  const conflict = solverTerminalPublicationBindingConflict(input);
  if (conflict) {
    return { kind: "Conflict", conflict };
  }

  return classifyPublicationUnchecked(input.candidate, input.outcome, input.digestTerminalValue);
}

export function classifyEvaluationPublication<
  const Terminal extends SolverTerminalShape<unknown>,
  const Evaluation extends EvaluationResultShape,
  const Uncertainty,
>(input: {
  readonly terminal: PortableStageOutput<Terminal>;
  readonly candidate: PortableStageOutput<Evaluation>;
  readonly outcome: CreateOutcome<PortableStageOutput<Evaluation>, Uncertainty>;
  readonly digestEvaluationValue: DigestValue<PortableStageOutput<Evaluation>["value"]>;
}): EvaluationPublicationOutcome<PortableStageOutput<Evaluation>, Uncertainty> {
  const bindingConflict = classifyEvaluationBinding(input.terminal, input.candidate);
  if (bindingConflict) {
    return { kind: "Conflict", conflict: bindingConflict };
  }

  return classifyPublicationUnchecked(input.candidate, input.outcome, input.digestEvaluationValue);
}

function classifyPublicationUnchecked<const Output extends StageOutputShape, const Uncertainty>(
  candidate: PortableStageOutput<Output>,
  outcome: CreateOutcome<PortableStageOutput<Output>, Uncertainty>,
  digestValue: DigestValue<PortableStageOutput<Output>["value"]>
): PublicationOutcome<PortableStageOutput<Output>, Uncertainty> {
  if (!equalStructuredData(digestValue(candidate.value), candidate.outputDigest)) {
    return {
      kind: "Conflict",
      conflict: { kind: "CandidateOutputDigestMismatch" },
    };
  }

  if (outcome.kind === "Created") {
    return { kind: "Published", value: candidate };
  }

  if (outcome.kind === "Unknown") {
    return { kind: "ReadAfterUnknown", uncertainty: outcome.uncertainty };
  }

  return classifyExisting(candidate, outcome.value, digestValue);
}

export function reconcilePublicationAfterUnknown<const Output extends StageOutputShape>(
  candidate: PortableStageOutput<Output> & GenericStageGuard<Output["stage"]>,
  read: ReadExact<PortableStageOutput<Output>>,
  digestValue: DigestValue<PortableStageOutput<Output>["value"]>
): PublicationOutcome<PortableStageOutput<Output>, never> {
  const semanticConflict = genericSemanticStageConflict(candidate.stage);
  if (semanticConflict) {
    return {
      kind: "Conflict",
      conflict:
        candidate.stage === "SolverTerminal"
          ? { kind: "SolverTerminalRequiresAdmittedAttempt" }
          : semanticConflict,
    };
  }
  return reconcilePublicationAfterUnknownUnchecked(candidate, read, digestValue);
}

export function reconcileSolverTerminalPublicationAfterUnknown<
  const Terminal extends SolverTerminalShape,
  const Attempt extends ExecutionAttemptFence,
>(input: {
  readonly admission: { readonly kind: "Admitted"; readonly attempt: Attempt };
  readonly candidate: PortableStageOutput<Terminal>;
  readonly read: ReadExact<PortableStageOutput<Terminal>>;
  readonly digestTerminalValue: DigestValue<PortableStageOutput<Terminal>["value"]>;
  readonly digestAttemptValue: DigestAttemptValue;
}): SolverTerminalPublicationOutcome<PortableStageOutput<Terminal>, never> {
  const conflict = solverTerminalPublicationBindingConflict(input);
  if (conflict) {
    return { kind: "Conflict", conflict };
  }

  return reconcilePublicationAfterUnknownUnchecked(
    input.candidate,
    input.read,
    input.digestTerminalValue
  );
}

export function reconcileEvaluationPublicationAfterUnknown<
  const Terminal extends SolverTerminalShape<unknown>,
  const Evaluation extends EvaluationResultShape,
>(input: {
  readonly terminal: PortableStageOutput<Terminal>;
  readonly candidate: PortableStageOutput<Evaluation>;
  readonly read: ReadExact<PortableStageOutput<Evaluation>>;
  readonly digestEvaluationValue: DigestValue<PortableStageOutput<Evaluation>["value"]>;
}): EvaluationPublicationOutcome<PortableStageOutput<Evaluation>, never> {
  const bindingConflict = classifyEvaluationBinding(input.terminal, input.candidate);
  if (bindingConflict) {
    return { kind: "Conflict", conflict: bindingConflict };
  }

  return reconcilePublicationAfterUnknownUnchecked(
    input.candidate,
    input.read,
    input.digestEvaluationValue
  );
}

function reconcilePublicationAfterUnknownUnchecked<const Output extends StageOutputShape>(
  candidate: PortableStageOutput<Output>,
  read: ReadExact<PortableStageOutput<Output>>,
  digestValue: DigestValue<PortableStageOutput<Output>["value"]>
): PublicationOutcome<PortableStageOutput<Output>, never> {
  if (read.kind === "Absent") {
    return { kind: "RetryPermitted" };
  }

  return classifyExisting(candidate, read.value, digestValue);
}

function solverTerminalPublicationBindingConflict<
  const Terminal extends SolverTerminalShape,
  const Attempt extends ExecutionAttemptFence,
>(input: {
  readonly admission: { readonly kind: "Admitted"; readonly attempt: Attempt };
  readonly candidate: PortableStageOutput<Terminal>;
  readonly digestAttemptValue: DigestAttemptValue;
}): SolverTerminalPublicationConflict | undefined {
  const admitted = input.admission.attempt;
  if (!equalStructuredData(stageOutputKeyOf(input.candidate), admitted.terminal)) {
    return { kind: "AdmittedAttemptIdentityMismatch" };
  }

  const attemptValue = {
    terminal: admitted.terminal,
    attemptId: admitted.attemptId,
  };
  if (!equalStructuredData(input.digestAttemptValue(attemptValue), admitted.attemptDigest)) {
    return { kind: "AdmittedAttemptDigestMismatch" };
  }

  if (
    !equalStructuredData(input.candidate.value.attempt, {
      attemptId: admitted.attemptId,
      attemptDigest: admitted.attemptDigest,
    })
  ) {
    return { kind: "TerminalAttemptBindingMismatch" };
  }

  return undefined;
}

function terminalAttemptIsSelfConsistent<Terminal extends SolverTerminalShape>(
  terminal: PortableStageOutput<Terminal>,
  digestAttemptValue: DigestAttemptValue
): boolean {
  const storedAttempt = terminal.value.attempt;
  const attemptValue = {
    terminal: stageOutputKeyOf(terminal),
    attemptId: storedAttempt.attemptId,
  };
  return equalStructuredData(digestAttemptValue(attemptValue), storedAttempt.attemptDigest);
}

export function classifyEvaluationBinding<
  const Terminal extends SolverTerminalShape<unknown>,
  const Evaluation extends EvaluationResultShape,
>(
  terminal: PortableStageOutput<Terminal>,
  evaluation: PortableStageOutput<Evaluation>
): EvaluationBindingConflict | undefined {
  if (
    !equalStructuredData(terminal.cell, evaluation.cell) ||
    !equalStructuredData(terminal.frozenInputDigest, evaluation.frozenInputDigest)
  ) {
    return { kind: "EvaluationIdentityMismatch" };
  }

  const roots =
    evaluation.predecessors.kind === "Set"
      ? evaluation.predecessors.digests
      : evaluation.predecessors.rootDigests;

  if (
    !equalStructuredData(evaluation.value.terminalPredecessor, stageOutputIdentityOf(terminal)) ||
    !roots.some((digest) => equalStructuredData(digest, terminal.outputDigest))
  ) {
    return { kind: "EvaluationPredecessorMismatch" };
  }

  return undefined;
}

function genericSemanticStageConflict(stage: string): AdoptionConflict | undefined {
  if (stage === "SolverTerminal") {
    return { kind: "SolverTerminalRequiresExactAdoption" };
  }
  if (stage === "EvaluationResult") {
    return { kind: "EvaluationResultRequiresExactTerminalBinding" };
  }
  return undefined;
}

function classifyExisting<const Output extends StageOutputShape>(
  candidate: PortableStageOutput<Output>,
  existing: PortableStageOutput<Output>,
  digestValue: DigestValue<PortableStageOutput<Output>["value"]>
): PublicationOutcome<PortableStageOutput<Output>, never> {
  const adoption = classifyAdoptionUnchecked(
    stageOutputKeyOf(candidate),
    { kind: "Found", value: existing },
    digestValue
  );

  if (adoption.kind === "Conflict") {
    return adoption;
  }

  if (
    adoption.kind === "Adopted" &&
    equalStructuredData(candidate.outputDigest, existing.outputDigest) &&
    equalStructuredData(candidate.value, existing.value)
  ) {
    return adoption;
  }

  return {
    kind: "Conflict",
    conflict: { kind: "DivergentExistingOutput" },
  };
}

export function equalStructuredData(left: unknown, right: unknown): boolean {
  if (!isPortableData(left) || !isPortableData(right)) {
    return false;
  }

  return equalPortableData(left, right);
}

function equalPortableData(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) {
    return true;
  }

  if (Array.isArray(left) || Array.isArray(right)) {
    return (
      Array.isArray(left) &&
      Array.isArray(right) &&
      left.length === right.length &&
      left.every((entry, index) => equalPortableData(entry, right[index]))
    );
  }

  if (left === null || right === null || typeof left !== "object" || typeof right !== "object") {
    return false;
  }

  const leftKeys = Object.keys(left).sort();
  const rightKeys = Object.keys(right).sort();

  return (
    leftKeys.length === rightKeys.length &&
    leftKeys.every(
      (key, index) =>
        key === rightKeys[index] &&
        equalPortableData(Reflect.get(left, key), Reflect.get(right, key))
    )
  );
}
