import { Effect } from "effect";
import { describe, expect, test } from "vitest";
import type { ReadExact } from "../src/core/index.js";
import {
  classifyResidueReconciliation,
  inspectExecutionReentry,
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

describe("same-instance re-entry", () => {
  test("adopts an exact terminal before consulting execution residue", async () => {
    let residueQueries = 0;
    const terminal = solverTerminal();

    const decision = await Effect.runPromise(
      inspectExecutionReentry({
        expectedTerminal: stageOutputKeyOf(terminal),
        digestTerminalValue: digestSolverTerminalValue,
        readTerminal: Effect.succeed({ kind: "Found", value: terminal } as const),
        queryResidue: () => {
          residueQueries += 1;
          return Effect.succeed({ kind: "Clear" } as const);
        },
      })
    );

    expect(decision).toEqual({ kind: "AdoptTerminal", terminal });
    expect(residueQueries).toBe(0);
  });

  test("fails closed on a corrupt terminal without consulting residue", async () => {
    let residueQueries = 0;
    const terminal = solverTerminal();
    const corrupt = {
      ...terminal,
      outputDigest: digestIdentity("research-sdk.solver-terminal-value.v1", "wrong"),
    };

    const decision = await Effect.runPromise(
      inspectExecutionReentry({
        expectedTerminal: stageOutputKeyOf(terminal),
        digestTerminalValue: digestSolverTerminalValue,
        readTerminal: Effect.succeed({ kind: "Found", value: corrupt } as const),
        queryResidue: () => {
          residueQueries += 1;
          return Effect.succeed({ kind: "Clear" } as const);
        },
      })
    );

    expect(decision).toEqual({
      kind: "TerminalConflict",
      conflict: { kind: "StoredOutputDigestMismatch" },
    });
    expect(residueQueries).toBe(0);
  });

  test("fails closed on a terminal stored under another exact cell", async () => {
    let residueQueries = 0;
    const terminal = solverTerminal();
    const wrongCellTerminal = {
      ...terminal,
      cell: cellKey("another-instance"),
    };

    const decision = await Effect.runPromise(
      inspectExecutionReentry({
        expectedTerminal: stageOutputKeyOf(terminal),
        digestTerminalValue: digestSolverTerminalValue,
        readTerminal: Effect.succeed({
          kind: "Found",
          value: wrongCellTerminal,
        } as const),
        queryResidue: () => {
          residueQueries += 1;
          return Effect.succeed({ kind: "Clear" } as const);
        },
      })
    );

    expect(decision).toEqual({
      kind: "TerminalConflict",
      conflict: { kind: "IdentityMismatch" },
    });
    expect(residueQueries).toBe(0);
  });

  test("acquires a new observation only when terminal and residue are absent", async () => {
    const terminal = solverTerminal();
    const absent: ReadExact<typeof terminal> = { kind: "Absent" };

    const decision = await Effect.runPromise(
      inspectExecutionReentry({
        expectedTerminal: stageOutputKeyOf(terminal),
        digestTerminalValue: digestSolverTerminalValue,
        readTerminal: Effect.succeed(absent),
        queryResidue: () => Effect.succeed({ kind: "Clear" } as const),
      })
    );

    expect(decision).toEqual({ kind: "AcquireObservation" });
  });

  test("blocks observation acquisition while exact process residue is unresolved", async () => {
    const terminal = solverTerminal();
    const absent: ReadExact<typeof terminal> = { kind: "Absent" };
    const residue = unresolvedResidue();
    const queriedCells: unknown[] = [];
    const decision = await Effect.runPromise(
      inspectExecutionReentry({
        expectedTerminal: stageOutputKeyOf(terminal),
        digestTerminalValue: digestSolverTerminalValue,
        readTerminal: Effect.succeed(absent),
        queryResidue: (cell) => {
          queriedCells.push(cell);
          return Effect.succeed({ kind: "Unresolved", residue } as const);
        },
      })
    );

    expect(decision).toEqual({ kind: "BlockedByResidue", residue });
    expect(queriedCells).toEqual([terminal.cell]);
  });

  test("rejects residue returned for another exact cell or instance", async () => {
    const terminal = solverTerminal();
    const absent: ReadExact<typeof terminal> = { kind: "Absent" };
    const residue = { ...unresolvedResidue(), cell: cellKey("another-instance") };
    const decision = await Effect.runPromise(
      inspectExecutionReentry({
        expectedTerminal: stageOutputKeyOf(terminal),
        digestTerminalValue: digestSolverTerminalValue,
        readTerminal: Effect.succeed(absent),
        queryResidue: () => Effect.succeed({ kind: "Unresolved", residue } as const),
      })
    );

    expect(decision).toEqual({ kind: "ResidueIdentityMismatch", residue });
  });

  test("requires exact cell, residue identity, and confirmed termination", () => {
    const residue = unresolvedResidue();

    expect(
      classifyResidueReconciliation({
        expectedCell: cellKey("another-instance"),
        current: { kind: "Unresolved", residue },
        expectedResidueDigest: residue.residueDigest,
        digestResidueValue: digestExecutionResidueValue,
        processTerminationConfirmed: true,
      }).kind
    ).toBe("Stale");

    expect(
      classifyResidueReconciliation({
        expectedCell: residue.cell,
        current: { kind: "Unresolved", residue },
        expectedResidueDigest: digestIdentity("research-sdk.execution-residue.v1", "different"),
        digestResidueValue: digestExecutionResidueValue,
        processTerminationConfirmed: true,
      }).kind
    ).toBe("Stale");

    expect(
      classifyResidueReconciliation({
        expectedCell: residue.cell,
        current: { kind: "Unresolved", residue },
        expectedResidueDigest: residue.residueDigest,
        digestResidueValue: digestExecutionResidueValue,
        processTerminationConfirmed: false,
      }).kind
    ).toBe("StillUnresolved");

    expect(
      classifyResidueReconciliation({
        expectedCell: residue.cell,
        current: { kind: "Unresolved", residue },
        expectedResidueDigest: residue.residueDigest,
        digestResidueValue: digestExecutionResidueValue,
        processTerminationConfirmed: true,
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
        processTerminationConfirmed: true,
      })
    ).toEqual({ kind: "Corrupt", residue: corrupt });
  });
});
