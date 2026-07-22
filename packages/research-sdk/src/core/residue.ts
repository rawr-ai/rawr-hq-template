import type { Effect } from "effect";
import type {
  UnresolvedExecutionResidue,
  UnresolvedExecutionResidueValue,
} from "../contracts/execution.js";
import type { CellKey, DigestIdentity } from "../contracts/identity.js";
import { equalStructuredData } from "./adoption.js";

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
  | { readonly kind: "StillUnresolved"; readonly residue: Residue };

export type DigestResidueValue = (value: UnresolvedExecutionResidueValue) => DigestIdentity;

export interface ExecutionResiduePort<
  Residue extends UnresolvedExecutionResidue,
  Confirmation,
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
    readonly confirmation: Confirmation;
  }) => Effect.Effect<ResidueReconcileOutcome<Residue>, Error, Requirements>;
}

export function classifyResidueReconciliation<Residue extends UnresolvedExecutionResidue>(input: {
  readonly expectedCell: CellKey;
  readonly current: ResidueQuery<Residue>;
  readonly expectedResidueDigest: DigestIdentity;
  readonly digestResidueValue: DigestResidueValue;
  readonly processTerminationConfirmed: boolean;
}): ResidueReconcileOutcome<Residue> {
  if (input.current.kind === "Clear") {
    return { kind: "AlreadyClear" };
  }

  if (!equalStructuredData(input.current.residue.cell, input.expectedCell)) {
    return { kind: "Stale", residue: input.current.residue };
  }

  if (
    !equalStructuredData(
      input.digestResidueValue(residueValueOf(input.current.residue)),
      input.current.residue.residueDigest
    )
  ) {
    return { kind: "Corrupt", residue: input.current.residue };
  }

  if (!equalStructuredData(input.current.residue.residueDigest, input.expectedResidueDigest)) {
    return { kind: "Stale", residue: input.current.residue };
  }

  return input.processTerminationConfirmed
    ? { kind: "Reconciled" }
    : { kind: "StillUnresolved", residue: input.current.residue };
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
