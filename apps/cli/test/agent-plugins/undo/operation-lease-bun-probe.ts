import { spawn, type ChildProcess } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { CapsuleRoot } from "../../../src/lib/agent-plugins/layout";
import { openNodeCapsuleStateStoreV1 } from "../../../src/lib/agent-plugins/undo/node-store";
import { CapsuleUndoControllerV1 } from "../../../src/lib/agent-plugins/undo/replay";
import { CapsuleControllerWriterV1 } from "../../../src/lib/agent-plugins/undo/writer";
import {
  createFixtureRegistry,
  type FixtureCallCountsV1,
  type FixtureWorldV1,
} from "./fixture-protocol";
import { createOwnedFixtureRoot } from "./owned-fixture-root";

const fixture = await createOwnedFixtureRoot();
let child: ChildProcess | undefined;
try {
  const root = path.join(fixture.path, "last-operation-v1") as CapsuleRoot;
  const calls: FixtureCallCountsV1 = {
    targetSelections: 0,
    applyingClassifications: 0,
    replayClassifications: 0,
    replayRestores: 0,
    replayVerifications: 0,
  };
  const world: FixtureWorldV1 = { states: new Map(), replayOrder: [], calls };
  const registry = createFixtureRegistry(world);
  const opened = await openNodeCapsuleStateStoreV1({ root, registry });
  if (opened.kind !== "Opened") throw new Error(opened.failure.message);
  const recovery = new CapsuleControllerWriterV1({ store: opened.store, registry });
  const undo = new CapsuleUndoControllerV1({ store: opened.store, registry });
  const childPath = fileURLToPath(new URL("./operation-lease-child.ts", import.meta.url));
  child = spawn("bun", [childPath, root], { stdio: ["ignore", "pipe", "pipe"] });
  await waitForLine(child.stdout!, "STAGED");
  const beforeBusy = snapshotCalls(calls);
  const liveRecovery = await recovery.recoverApplying();
  const liveUndo = await undo.undo();
  const afterBusy = snapshotCalls(calls);
  await terminateChild(child);
  child = undefined;
  const recovered = await recovery.recoverApplying();
  process.stdout.write(`${JSON.stringify({ beforeBusy, liveRecovery, liveUndo, afterBusy, recovered })}\n`);
} finally {
  if (child !== undefined) await terminateChild(child);
  await fixture.cleanup();
}

async function waitForLine(stream: NodeJS.ReadableStream, expected: string): Promise<void> {
  let output = "";
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`timed out waiting for ${expected}; got ${output}`)), 5_000);
    stream.on("data", (chunk) => {
      output += String(chunk);
      if (output.includes(`${expected}\n`)) {
        clearTimeout(timeout);
        resolve();
      }
    });
    stream.on("error", reject);
  });
}

async function terminateChild(process: ChildProcess): Promise<void> {
  if (process.exitCode !== null || process.signalCode !== null) return;
  const exited = new Promise<void>((resolve, reject) => {
    process.once("exit", () => resolve());
    process.once("error", reject);
  });
  process.kill("SIGKILL");
  await exited;
}

function snapshotCalls(calls: FixtureCallCountsV1): FixtureCallCountsV1 {
  return Object.freeze({ ...calls });
}
