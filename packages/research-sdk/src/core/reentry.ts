import { Effect } from "effect";
import type { UnresolvedExecutionResidue } from "../contracts/execution.js";
import type { CellKey } from "../contracts/identity.js";
import type { PortableStageOutput, StageOutputKey } from "../contracts/stage-output.js";
import {
  type AdoptionConflict,
  classifyAdoption,
  type DigestValue,
  equalStructuredData,
} from "./adoption.js";
import type { ResidueQuery } from "./residue.js";
import type { SolverTerminalShape } from "./stage-shapes.js";
import type { ReadExact } from "./terminal-sink.js";

export type ReentryDecision<Terminal, Residue> =
  | { readonly kind: "AdoptTerminal"; readonly terminal: Terminal }
  | { readonly kind: "AcquireObservation" }
  | { readonly kind: "BlockedByResidue"; readonly residue: Residue }
  | { readonly kind: "TerminalConflict"; readonly conflict: AdoptionConflict }
  | { readonly kind: "ResidueIdentityMismatch"; readonly residue: Residue };

export function inspectExecutionReentry<
  Terminal extends SolverTerminalShape,
  Residue extends UnresolvedExecutionResidue,
  TerminalError,
  ResidueError,
  TerminalRequirements,
  ResidueRequirements,
>(input: {
  readonly expectedTerminal: StageOutputKey<"SolverTerminal">;
  readonly digestTerminalValue: DigestValue<PortableStageOutput<Terminal>["value"]>;
  readonly readTerminal: Effect.Effect<
    ReadExact<PortableStageOutput<Terminal>>,
    TerminalError,
    TerminalRequirements
  >;
  readonly queryResidue: (
    cell: CellKey
  ) => Effect.Effect<ResidueQuery<Residue>, ResidueError, ResidueRequirements>;
}): Effect.Effect<
  ReentryDecision<PortableStageOutput<Terminal>, Residue>,
  TerminalError | ResidueError,
  TerminalRequirements | ResidueRequirements
> {
  return Effect.gen(function* () {
    const terminal = yield* input.readTerminal;
    const adoption = classifyAdoption(input.expectedTerminal, terminal, input.digestTerminalValue);

    if (adoption.kind === "Adopted") {
      return { kind: "AdoptTerminal", terminal: adoption.value };
    }
    if (adoption.kind === "Conflict") {
      return { kind: "TerminalConflict", conflict: adoption.conflict };
    }

    const residue = yield* input.queryResidue(input.expectedTerminal.cell);
    if (residue.kind === "Clear") {
      return { kind: "AcquireObservation" };
    }
    if (!equalStructuredData(residue.residue.cell, input.expectedTerminal.cell)) {
      return { kind: "ResidueIdentityMismatch", residue: residue.residue };
    }
    return { kind: "BlockedByResidue", residue: residue.residue };
  });
}
