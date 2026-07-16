import { readFileSync, writeFileSync } from "node:fs";

import type { CapsuleRoot } from "../../../src/lib/agent-plugins/layout";
import { openNodeCapsuleStateStoreV1 } from "../../../src/lib/agent-plugins/undo/node-store";
import { CapsuleUndoControllerV1 } from "../../../src/lib/agent-plugins/undo/replay";
import { CapsuleControllerWriterV1 } from "../../../src/lib/agent-plugins/undo/writer";
import {
  FIXTURE_OWNER,
  FIXTURE_TARGETS,
  FIXTURE_VERSION,
  createFixtureRegistry,
  fixtureAction,
  fixtureObserved,
  type FixtureWorldV1,
} from "./fixture-protocol";

type FixtureTargetState = "prior" | "post" | "ambiguous" | "failed";
type WorkerMode =
  | "initialize"
  | "transaction-boundary"
  | "prepare-committed"
  | "recover-applying"
  | "undo-boundary"
  | "resume-undo";
type TransactionBoundary = "begin" | "stage" | "discard" | "observed-bind" | "settle";
type UndoBoundary = "undo-admission" | "replay-outcome" | "final-clear";

class DurableFixtureStateMap extends Map<string, FixtureTargetState> {
  readonly #statePath: string;

  constructor(statePath: string) {
    super();
    this.#statePath = statePath;
  }

  override get(_key: string): FixtureTargetState | undefined {
    const value = readFileSync(this.#statePath, "utf8").trim();
    if (value === "prior" || value === "post" || value === "ambiguous" || value === "failed") return value;
    throw new Error(`invalid durable fixture target state: ${value}`);
  }

  override set(_key: string, value: FixtureTargetState): this {
    writeFileSync(this.#statePath, `${value}\n`, { mode: 0o600 });
    return this;
  }
}

const mode = requireMode(process.argv[2]);
const root = requireArgument(process.argv[3], "capsule root") as CapsuleRoot;
const sourceLocator = requireArgument(process.argv[4], "source locator");
const targetStatePath = requireArgument(process.argv[5], "target-state path");
const relativePath = requireArgument(process.argv[6], "relative path");
const boundary = process.argv[7];
const states = new DurableFixtureStateMap(targetStatePath);
const world: FixtureWorldV1 = { states, replayOrder: [] };
const registry = createFixtureRegistry(world);

if (mode === "initialize") {
  const opened = await openStore();
  emit({ mode, state: await stateSummary(opened.store) });
} else if (mode === "transaction-boundary") {
  const transactionBoundary = requireTransactionBoundary(boundary);
  const failAt = transactionPublication(transactionBoundary);
  const opened = await openStore(failAt);
  const writer = new CapsuleControllerWriterV1({ store: opened.store, registry });
  const admitted = await writer.begin(beginInput());
  let result: unknown = admitted;
  if (transactionBoundary !== "begin") {
    if (admitted.kind !== "Accepted") throw unexpected("begin", admitted);
    const actionHandle = admitted.admittedActions[0]!.actionHandle;
    const staged = await admitted.session.stage({ actionHandle });
    result = staged;
    if (transactionBoundary !== "stage") {
      if (staged.kind !== "Accepted") throw unexpected("stage", staged);
      if (transactionBoundary === "discard") {
        result = await admitted.session.discardStaged({ actionHandle });
      } else {
        states.set(relativePath, "post");
        const marked = await admitted.session.markApplied({
          actionHandle,
          observedPost: fixtureObserved(fixtureAction(relativePath)),
        });
        result = marked;
        if (transactionBoundary === "settle") {
          if (marked.kind !== "Accepted") throw unexpected("mark-applied", marked);
          result = await admitted.session.settle();
        }
      }
    }
  }
  requireKind(result, "Unsettled", transactionBoundary);
  emit({
    mode,
    boundary: transactionBoundary,
    failAt,
    result,
    state: await stateSummary(opened.store),
    targetState: states.get(relativePath),
  });
} else if (mode === "prepare-committed") {
  const opened = await openStore();
  const writer = new CapsuleControllerWriterV1({ store: opened.store, registry });
  const admitted = await writer.begin(beginInput());
  if (admitted.kind !== "Accepted") throw unexpected("begin", admitted);
  const actionHandle = admitted.admittedActions[0]!.actionHandle;
  const staged = await admitted.session.stage({ actionHandle });
  if (staged.kind !== "Accepted") throw unexpected("stage", staged);
  states.set(relativePath, "post");
  const marked = await admitted.session.markApplied({
    actionHandle,
    observedPost: fixtureObserved(fixtureAction(relativePath)),
  });
  if (marked.kind !== "Accepted") throw unexpected("mark-applied", marked);
  const settled = await admitted.session.settle();
  requireKind(settled, "Accepted", "settle");
  emit({
    mode,
    result: settled,
    state: await stateSummary(opened.store),
    targetState: states.get(relativePath),
  });
} else if (mode === "recover-applying") {
  const opened = await openStore();
  const writer = new CapsuleControllerWriterV1({ store: opened.store, registry });
  const result = await writer.recoverApplying();
  emit({ mode, result, state: await stateSummary(opened.store), targetState: states.get(relativePath) });
} else if (mode === "undo-boundary") {
  const undoBoundary = requireUndoBoundary(boundary);
  const failAt = undoPublication(undoBoundary);
  const opened = await openStore(failAt);
  const undo = new CapsuleUndoControllerV1({ store: opened.store, registry });
  const result = await undo.undo();
  requireKind(result, "ReplayUnsettled", undoBoundary);
  emit({
    mode,
    boundary: undoBoundary,
    failAt,
    result,
    state: await stateSummary(opened.store),
    targetState: states.get(relativePath),
  });
} else {
  const opened = await openStore();
  const undo = new CapsuleUndoControllerV1({ store: opened.store, registry });
  const result = await undo.undo();
  emit({ mode, result, state: await stateSummary(opened.store), targetState: states.get(relativePath) });
}

async function openStore(failAt?: number) {
  let publications = 0;
  const opened = await openNodeCapsuleStateStoreV1({
    root,
    registry,
    ...(failAt === undefined
      ? {}
      : {
          failpoints: {
            afterStatePublication() {
              publications += 1;
              if (publications === failAt) {
                throw new Error(`injected post-publication failure ${publications}`);
              }
            },
          },
        }),
  });
  if (opened.kind !== "Opened") throw new Error(`${opened.failure.code}: ${opened.failure.message}`);
  return opened;
}

function beginInput() {
  return {
    owner: FIXTURE_OWNER,
    ownerProtocolVersion: FIXTURE_VERSION,
    contentAuthority: `generated-source:${sourceLocator}`,
    targets: FIXTURE_TARGETS,
    actions: [{ action: fixtureAction(relativePath) }],
  } as const;
}

async function stateSummary(store: Awaited<ReturnType<typeof openStore>>["store"]) {
  const read = await store.read();
  if (read.kind !== "Observed") return { kind: "unreadable", failure: read.failure } as const;
  const state = read.observation.state.body.state;
  if (state.kind === "idle") {
    return { kind: state.kind, committed: state.committed !== null } as const;
  }
  if (state.kind === "applying") {
    return {
      kind: state.kind,
      phases: state.candidate.actions.map((action) => action.phase),
    } as const;
  }
  return {
    kind: state.kind,
    outcomes: state.outcomes.map((outcome) => outcome.kind),
  } as const;
}

function emit(value: object): void {
  process.stdout.write(`${JSON.stringify({ pid: process.pid, ...value })}\n`);
}

function requireMode(value: string | undefined): WorkerMode {
  if (
    value === "initialize"
    || value === "transaction-boundary"
    || value === "prepare-committed"
    || value === "recover-applying"
    || value === "undo-boundary"
    || value === "resume-undo"
  ) {
    return value;
  }
  throw new Error(`unknown worker mode: ${String(value)}`);
}

function requireTransactionBoundary(value: string | undefined): TransactionBoundary {
  if (value === "begin" || value === "stage" || value === "discard" || value === "observed-bind" || value === "settle") {
    return value;
  }
  throw new Error(`unknown transaction boundary: ${String(value)}`);
}

function requireUndoBoundary(value: string | undefined): UndoBoundary {
  if (value === "undo-admission" || value === "replay-outcome" || value === "final-clear") return value;
  throw new Error(`unknown undo boundary: ${String(value)}`);
}

function requireArgument(value: string | undefined, label: string): string {
  if (value === undefined || value.length === 0) throw new Error(`${label} argument is required`);
  return value;
}

function transactionPublication(boundary: TransactionBoundary): number {
  if (boundary === "begin") return 1;
  if (boundary === "stage") return 2;
  if (boundary === "settle") return 4;
  return 3;
}

function undoPublication(boundary: UndoBoundary): number {
  if (boundary === "undo-admission") return 1;
  if (boundary === "replay-outcome") return 2;
  return 3;
}

function requireKind(value: unknown, expected: string, phase: string): void {
  if (value === null || typeof value !== "object" || !("kind" in value) || value.kind !== expected) {
    throw unexpected(phase, value);
  }
}

function unexpected(phase: string, value: unknown): Error {
  return new Error(`${phase} returned ${JSON.stringify(value)}`);
}
