import type { DigestIdentity } from "../contracts/identity.js";
import { isPortableData } from "../contracts/schema.js";
import type {
  PortableStageOutput,
  StageOutputKey,
  StageOutputShape,
} from "../contracts/stage-output.js";
import type { CreateOutcome, ReadExact } from "./terminal-sink.js";

export type AdoptionConflict =
  | { readonly kind: "IdentityMismatch" }
  | { readonly kind: "StoredOutputDigestMismatch" }
  | { readonly kind: "CandidateOutputDigestMismatch" }
  | { readonly kind: "DivergentExistingOutput" };

export type AdoptionOutcome<Output> =
  | { readonly kind: "Absent" }
  | { readonly kind: "Adopted"; readonly value: Output }
  | { readonly kind: "Conflict"; readonly conflict: AdoptionConflict };

export type PublicationOutcome<Output, Uncertainty> =
  | { readonly kind: "Published"; readonly value: Output }
  | { readonly kind: "Adopted"; readonly value: Output }
  | { readonly kind: "Conflict"; readonly conflict: AdoptionConflict }
  | { readonly kind: "ReadAfterUnknown"; readonly uncertainty: Uncertainty }
  | { readonly kind: "RetryPermitted" };

export type DigestValue<Value> = (value: Value) => DigestIdentity;

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

export function classifyAdoption<
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
  candidate: PortableStageOutput<Output>,
  read: ReadExact<PortableStageOutput<Output>>,
  digestValue: DigestValue<PortableStageOutput<Output>["value"]>
): PublicationOutcome<PortableStageOutput<Output>, never> {
  if (read.kind === "Absent") {
    return { kind: "RetryPermitted" };
  }

  return classifyExisting(candidate, read.value, digestValue);
}

function classifyExisting<const Output extends StageOutputShape>(
  candidate: PortableStageOutput<Output>,
  existing: PortableStageOutput<Output>,
  digestValue: DigestValue<PortableStageOutput<Output>["value"]>
): PublicationOutcome<PortableStageOutput<Output>, never> {
  const adoption = classifyAdoption(
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
