import {
  canonicalJsonBytes,
} from "../../../src/lib/agent-plugins/undo/canonical";
import type {
  CapsuleFailure,
  OwnerProtocolRegistrationV1,
  TargetStateBindingV1,
} from "../../../src/lib/agent-plugins/undo/contract";
import { ClosedOwnerProtocolRegistryV1 } from "../../../src/lib/agent-plugins/undo/protocol-registry";

export const FIXTURE_OWNER = "fixture-export";
export const FIXTURE_VERSION = 1;

export interface FixtureActionV1 {
  readonly type: "FixtureInverseV1";
  readonly relativePath: string;
  readonly priorBase64: string;
  readonly expectedPost: string;
}

export interface FixtureObservedPostV1 {
  readonly identity: string;
  readonly directories: readonly Readonly<{ relativePath: string; dev: string; ino: string }>[];
}

export interface FixtureWorldV1 {
  readonly states: Map<string, "prior" | "post" | "ambiguous" | "failed">;
  readonly replayOrder: string[];
  readonly calls?: FixtureCallCountsV1;
  readonly codecFailures?: {
    parseAction?: string;
    parseObservedPost?: string;
  };
}

export interface FixtureCallCountsV1 {
  targetSelections: number;
  applyingClassifications: number;
  replayClassifications: number;
  replayRestores: number;
  replayVerifications: number;
}

export const FIXTURE_TARGETS: readonly TargetStateBindingV1[] = Object.freeze([
  Object.freeze({
    canonicalTarget: "/tmp/rawr-capsule-fixture-destination",
    authorityGeneration: "ledger-generation:7",
    authorityDigest: "ledger-digest:fixture",
  }),
]);

export function fixtureAction(relativePath: string, priorBytes = 4): FixtureActionV1 {
  return Object.freeze({
    type: "FixtureInverseV1",
    relativePath,
    priorBase64: Buffer.alloc(priorBytes, 0x61).toString("base64"),
    expectedPost: `post:${relativePath}`,
  });
}

export function fixtureObserved(action: FixtureActionV1): FixtureObservedPostV1 {
  return Object.freeze({
    identity: action.expectedPost,
    directories: Object.freeze([
      Object.freeze({ relativePath: action.relativePath.split("/")[0]!, dev: "101", ino: "202" }),
    ]),
  });
}

export function createFixtureRegistry(world: FixtureWorldV1): ClosedOwnerProtocolRegistryV1 {
  const registration: OwnerProtocolRegistrationV1<FixtureActionV1, FixtureObservedPostV1> = {
    codec: {
      owner: FIXTURE_OWNER,
      protocolVersion: FIXTURE_VERSION,
      parseAction(value) {
        if (world.codecFailures?.parseAction !== undefined) {
          throw new Error(world.codecFailures.parseAction);
        }
        return parseAction(value);
      },
      encodeAction: (action) => action,
      inspectAction: (action) => ({
        actionType: action.type,
        relativePaths: Object.freeze([action.relativePath]),
        decodedPriorBytes: Buffer.from(action.priorBase64, "base64").byteLength,
        maximumObservedPostBytes: 1_024,
      }),
      parseObservedPost(action, value) {
        if (world.codecFailures?.parseObservedPost !== undefined) {
          throw new Error(world.codecFailures.parseObservedPost);
        }
        return parseObserved(action, value);
      },
      encodeObservedPost: (_action, observed) => observed,
      validateActionSequence({ actions }) {
        if (actions.length === 0) throw new Error("fixture protocol requires a nonempty action sequence");
      },
      selectTargetBindings({ bindings, actions }) {
        if (world.calls !== undefined) world.calls.targetSelections += 1;
        if (
          actions.length === 0
          || bindings.length === 0
          || bindings.some(({ canonicalTarget }) =>
            !canonicalTarget.startsWith(FIXTURE_TARGETS[0]!.canonicalTarget))
        ) {
          throw new Error("fixture protocol requires its owned destination bindings");
        }
        return bindings;
      },
    },
    applyingRecovery: {
      owner: FIXTURE_OWNER,
      protocolVersion: FIXTURE_VERSION,
      async classifyStaged({ action }) {
        if (world.calls !== undefined) world.calls.applyingClassifications += 1;
        const state = world.states.get(action.relativePath) ?? "prior";
        if (state === "prior") return { kind: "NotApplied" };
        if (state === "post") return { kind: "Applied", observedPost: fixtureObserved(action) };
        return {
          kind: "Ambiguous",
          failure: fixtureFailure("fixture applying state is ambiguous"),
        };
      },
    },
    replay: {
      owner: FIXTURE_OWNER,
      protocolVersion: FIXTURE_VERSION,
      async classify({ action }) {
        if (world.calls !== undefined) world.calls.replayClassifications += 1;
        const state = world.states.get(action.relativePath) ?? "prior";
        if (state === "post" || state === "failed") {
          return { kind: "ExpectedPost", observedPost: fixtureObserved(action) };
        }
        if (state === "prior") return { kind: "Prior" };
        return { kind: "Ambiguous", failure: fixtureFailure("fixture replay state is ambiguous") };
      },
      async restore({ action }) {
        if (world.calls !== undefined) world.calls.replayRestores += 1;
        const state = world.states.get(action.relativePath) ?? "prior";
        if (state === "failed") return { kind: "Failed", failure: fixtureFailure("fixture restore failed") };
        if (state !== "post") return { kind: "AlreadyRestored" };
        world.replayOrder.push(action.relativePath);
        world.states.set(action.relativePath, "prior");
        return { kind: "Restored" };
      },
      async verifyPrior({ actions }) {
        if (world.calls !== undefined) world.calls.replayVerifications += 1;
        const allPrior = actions.every(({ action }) => world.states.get(action.relativePath) !== "post");
        return allPrior
          ? { kind: "Verified" }
          : { kind: "Blocked", failure: fixtureFailure("fixture prior verification failed") };
      },
    },
  };
  return new ClosedOwnerProtocolRegistryV1([registration as OwnerProtocolRegistrationV1]);
}

export function canonicalObservedBytes(action: FixtureActionV1): number {
  return canonicalJsonBytes(fixtureObserved(action)).byteLength;
}

function parseAction(value: unknown): FixtureActionV1 {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new Error("action object required");
  const record = value as Record<string, unknown>;
  if (
    Object.keys(record).sort().join(",") !== "expectedPost,priorBase64,relativePath,type"
    || record.type !== "FixtureInverseV1"
    || typeof record.relativePath !== "string"
    || typeof record.priorBase64 !== "string"
    || typeof record.expectedPost !== "string"
  ) {
    throw new Error("malformed fixture action");
  }
  const decoded = Buffer.from(record.priorBase64, "base64");
  if (decoded.toString("base64") !== record.priorBase64) throw new Error("noncanonical fixture prior bytes");
  return Object.freeze({
    type: "FixtureInverseV1",
    relativePath: record.relativePath,
    priorBase64: record.priorBase64,
    expectedPost: record.expectedPost,
  });
}

function parseObserved(action: FixtureActionV1, value: unknown): FixtureObservedPostV1 {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new Error("observed object required");
  const record = value as Record<string, unknown>;
  if (
    Object.keys(record).sort().join(",") !== "directories,identity"
    || record.identity !== action.expectedPost
    || !Array.isArray(record.directories)
  ) {
    throw new Error("observed post does not bind the action expected state");
  }
  const directories = record.directories.map((entry) => {
    if (entry === null || typeof entry !== "object" || Array.isArray(entry)) throw new Error("directory identity required");
    const directory = entry as Record<string, unknown>;
    if (
      Object.keys(directory).sort().join(",") !== "dev,ino,relativePath"
      || typeof directory.relativePath !== "string"
      || typeof directory.dev !== "string"
      || typeof directory.ino !== "string"
    ) {
      throw new Error("malformed directory identity");
    }
    return Object.freeze({
      relativePath: directory.relativePath,
      dev: directory.dev,
      ino: directory.ino,
    });
  });
  return Object.freeze({ identity: record.identity, directories: Object.freeze(directories) });
}

function fixtureFailure(message: string): CapsuleFailure {
  return Object.freeze({ code: "ReplayBlocked", phase: "fixture", message });
}
