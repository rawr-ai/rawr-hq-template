import { execFile } from "node:child_process";
import {
  lstat,
  mkdir,
  readdir,
  rmdir,
  unlink,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { createOwnedFixtureRoot } from "./owned-fixture-root";

interface WorkerOutput {
  readonly pid: number;
  readonly mode: string;
  readonly boundary?: string;
  readonly failAt?: number;
  readonly result?: Readonly<{
    kind: string;
    synchronization?: Readonly<{ kind: string }>;
  }>;
  readonly state: Readonly<{
    kind: string;
    committed?: boolean;
    phases?: readonly string[];
    outcomes?: readonly string[];
  }>;
  readonly targetState?: string;
}

const TRANSACTION_MATRIX = Object.freeze([
  Object.freeze({
    boundary: "begin",
    failAt: 1,
    boundaryState: { kind: "applying", phases: ["planned"] },
    recoveredKind: "RecoveredToPriorIdle",
    recoveredState: { kind: "idle", committed: false },
    targetState: "prior",
  }),
  Object.freeze({
    boundary: "stage",
    failAt: 2,
    boundaryState: { kind: "applying", phases: ["staged"] },
    recoveredKind: "RecoveredToPriorIdle",
    recoveredState: { kind: "idle", committed: false },
    targetState: "prior",
  }),
  Object.freeze({
    boundary: "discard",
    failAt: 3,
    boundaryState: { kind: "applying", phases: ["planned"] },
    recoveredKind: "RecoveredToPriorIdle",
    recoveredState: { kind: "idle", committed: false },
    targetState: "prior",
  }),
  Object.freeze({
    boundary: "observed-bind",
    failAt: 3,
    boundaryState: { kind: "applying", phases: ["applied"] },
    recoveredKind: "RecoveredCommitted",
    recoveredState: { kind: "idle", committed: true },
    targetState: "post",
  }),
  Object.freeze({
    boundary: "settle",
    failAt: 4,
    boundaryState: { kind: "idle", committed: true },
    recoveredKind: "NoApplyingState",
    recoveredState: { kind: "idle", committed: true },
    targetState: "post",
  }),
] as const);

const UNDO_MATRIX = Object.freeze([
  Object.freeze({
    boundary: "undo-admission",
    failAt: 1,
    boundaryState: { kind: "undoing", outcomes: ["Pending"] },
    boundaryTarget: "post",
    recoveredKind: "RestoredAndCleared",
  }),
  Object.freeze({
    boundary: "replay-outcome",
    failAt: 2,
    boundaryState: { kind: "undoing", outcomes: ["Restored"] },
    boundaryTarget: "prior",
    recoveredKind: "RestoredAndCleared",
  }),
  Object.freeze({
    boundary: "final-clear",
    failAt: 3,
    boundaryState: { kind: "idle", committed: false },
    boundaryTarget: "prior",
    recoveredKind: "NoCommittedCapsule",
  }),
] as const);

describe("durable capsule cold-process reopen matrix", () => {
  it.runIf(process.platform === "darwin" || process.platform === "linux")(
    "cold-recovers every persisted applying transition class after returned Unsettled",
    async () => {
      const fixture = await createOwnedFixtureRoot();
      let sourceDeletions = 0;
      try {
        for (const row of TRANSACTION_MATRIX) {
          const id = `transaction-${row.boundary}`;
          const capsuleRoot = path.join(fixture.path, `${id}-capsule`);
          const targetStatePath = path.join(fixture.path, `${id}-target-state.txt`);
          const source = await createGeneratedSource(fixture.path, id);
          const relativePath = `plugins/${row.boundary}/file.txt`;
          await writeFile(targetStatePath, "prior\n", { mode: 0o600 });

          const initialized = await runWorker(
            "initialize",
            capsuleRoot,
            source.path,
            targetStatePath,
            relativePath,
          );
          expect(initialized.state).toEqual({ kind: "idle", committed: false });

          const boundary = await runWorker(
            "transaction-boundary",
            capsuleRoot,
            source.path,
            targetStatePath,
            relativePath,
            row.boundary,
          );
          expect(boundary).toMatchObject({
            boundary: row.boundary,
            failAt: row.failAt,
            result: { kind: "Unsettled", synchronization: { kind: "Released" } },
            state: row.boundaryState,
            targetState: row.targetState,
          });

          await removeGeneratedSource(fixture.path, source);
          sourceDeletions += 1;

          const recovered = await runWorker(
            "recover-applying",
            capsuleRoot,
            source.path,
            targetStatePath,
            relativePath,
          );
          expect(recovered).toMatchObject({
            result: { kind: row.recoveredKind, synchronization: { kind: "Released" } },
            state: row.recoveredState,
            targetState: row.targetState,
          });
          expect(new Set([initialized.pid, boundary.pid, recovered.pid]).size).toBe(3);
        }
        expect(sourceDeletions).toBe(TRANSACTION_MATRIX.length);
      } finally {
        await fixture.cleanup();
      }
    },
    30_000,
  );

  it.runIf(process.platform === "darwin" || process.platform === "linux")(
    "cold-resumes every persisted undo transition class without its generated source locator",
    async () => {
      const fixture = await createOwnedFixtureRoot();
      let sourceDeletions = 0;
      try {
        for (const row of UNDO_MATRIX) {
          const id = `undo-${row.boundary}`;
          const capsuleRoot = path.join(fixture.path, `${id}-capsule`);
          const targetStatePath = path.join(fixture.path, `${id}-target-state.txt`);
          const source = await createGeneratedSource(fixture.path, id);
          const relativePath = `plugins/${row.boundary}/file.txt`;
          await writeFile(targetStatePath, "prior\n", { mode: 0o600 });

          const prepared = await runWorker(
            "prepare-committed",
            capsuleRoot,
            source.path,
            targetStatePath,
            relativePath,
          );
          expect(prepared).toMatchObject({
            result: { kind: "Accepted", synchronization: { kind: "Released" } },
            state: { kind: "idle", committed: true },
            targetState: "post",
          });

          await removeGeneratedSource(fixture.path, source);
          sourceDeletions += 1;

          const boundary = await runWorker(
            "undo-boundary",
            capsuleRoot,
            source.path,
            targetStatePath,
            relativePath,
            row.boundary,
          );
          expect(boundary).toMatchObject({
            boundary: row.boundary,
            failAt: row.failAt,
            result: { kind: "ReplayUnsettled", synchronization: { kind: "Released" } },
            state: row.boundaryState,
            targetState: row.boundaryTarget,
          });

          const recovered = await runWorker(
            "resume-undo",
            capsuleRoot,
            source.path,
            targetStatePath,
            relativePath,
          );
          expect(recovered).toMatchObject({
            result: { kind: row.recoveredKind, synchronization: { kind: "Released" } },
            state: { kind: "idle", committed: false },
            targetState: "prior",
          });
          expect(new Set([prepared.pid, boundary.pid, recovered.pid]).size).toBe(3);
        }
        expect(sourceDeletions).toBe(UNDO_MATRIX.length);
      } finally {
        await fixture.cleanup();
      }
    },
    30_000,
  );
});

async function runWorker(
  mode: string,
  capsuleRoot: string,
  sourceLocator: string,
  targetStatePath: string,
  relativePath: string,
  boundary?: string,
): Promise<WorkerOutput> {
  const workerPath = fileURLToPath(new URL("./cold-reopen-matrix-worker.ts", import.meta.url));
  const args = [workerPath, mode, capsuleRoot, sourceLocator, targetStatePath, relativePath];
  if (boundary !== undefined) args.push(boundary);
  const output = await new Promise<string>((resolve, reject) => {
    execFile("bun", args, (error, stdout, stderr) => {
      if (error !== null) {
        reject(new Error(`cold-reopen worker failed: ${error.message}; ${stderr}`));
        return;
      }
      resolve(stdout.trim());
    });
  });
  return JSON.parse(output) as WorkerOutput;
}

async function createGeneratedSource(parent: string, id: string) {
  const sourcePath = path.join(parent, `${id}-generated-source`);
  const contentPath = path.join(sourcePath, "plugin-source.txt");
  await mkdir(sourcePath, { mode: 0o700 });
  await writeFile(contentPath, `generated fixture ${id}\n`, { mode: 0o600 });
  return Object.freeze({ path: sourcePath, contentPath });
}

async function removeGeneratedSource(
  expectedParent: string,
  source: Readonly<{ path: string; contentPath: string }>,
): Promise<void> {
  const status = await lstat(source.path);
  expect(path.dirname(source.path)).toBe(expectedParent);
  expect(status.isDirectory()).toBe(true);
  expect(status.isSymbolicLink()).toBe(false);
  expect(await readdir(source.path)).toEqual([path.basename(source.contentPath)]);
  await unlink(source.contentPath);
  await rmdir(source.path);
  await expect(lstat(source.path)).rejects.toMatchObject({ code: "ENOENT" });
}
