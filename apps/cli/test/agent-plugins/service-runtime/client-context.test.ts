import { readdir, realpath, unlink } from "node:fs/promises";
import path from "node:path";

import { bindVerifiedControllerReentryAuthority } from "@rawr/core";
import { createClient } from "@rawr/agent-plugin-lifecycle/client";
import {
  parseArtifactRef,
} from "@rawr/agent-plugin-lifecycle/release";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { LifecycleOperation } from "../../../src/lib/agent-plugins/commands/binding";
import {
  createProductionLifecycleClient,
  createProductionLifecycleDeps,
} from "../../../src/lib/agent-plugins/service-runtime/client";
import {
  commitGeneratedGitRepository,
  createGeneratedGitRepository,
  GIT_EXECUTABLE,
} from "./releases/fixtures/git-repository";
import {
  createOwnedFixtureRoot,
  removeOwnedFixtureRoot,
  type OwnedFixtureRoot,
} from "./releases/owned-fixture-root";

const OWNER_KEYS = Object.freeze([
  "releases",
  "vendors",
  "packaging",
  "exports",
  "providers",
  "governance",
]);
const OPERATION_CASES = Object.freeze([
  { operation: "releases.check", owner: "releases", procedure: "check" },
  { operation: "releases.checkRepository", owner: "releases", procedure: "checkRepository" },
  { operation: "releases.build", owner: "releases", procedure: "build" },
  { operation: "vendors.status", owner: "vendors", procedure: "status" },
  { operation: "vendors.update", owner: "vendors", procedure: "update" },
  { operation: "packaging.package", owner: "packaging", procedure: "package" },
  { operation: "exports.apply", owner: "exports", procedure: "apply" },
  { operation: "providers.targetedTest", owner: "providers", procedure: "targetedTest" },
  { operation: "providers.completeTest", owner: "providers", procedure: "completeTest" },
  { operation: "providers.canonicalSync", owner: "providers", procedure: "canonicalSync" },
  { operation: "providers.canonicalStatus", owner: "providers", procedure: "canonicalStatus" },
  { operation: "providers.managedRetire", owner: "providers", procedure: "managedRetire" },
  { operation: "governance.attestPromotion", owner: "governance", procedure: "attestPromotion" },
] satisfies readonly Readonly<{
  operation: LifecycleOperation;
  owner: string;
  procedure: string;
}>[]);
const EMPTY_BINDING = Object.freeze({ providerExecutables: Object.freeze({}) });
const invocation = Object.freeze({
  context: Object.freeze({
    invocation: Object.freeze({
      traceId: "trace-production-lifecycle-context",
      commandId: "command-production-lifecycle-context",
    }),
  }),
});

let fixture: OwnedFixtureRoot | undefined;
let controllerDataRoot = "";

beforeAll(async () => {
  fixture = await createOwnedFixtureRoot();
  controllerDataRoot = path.join(fixture.path, "controller-data");
  bindVerifiedControllerReentryAuthority({
    runtimePath: "/usr/bin/false",
    entryPath: path.join(fixture.path, "controller-entry.ts"),
    releaseRoot: fixture.path,
    dataRoot: controllerDataRoot,
    controllerDigest: "0".repeat(64),
    operatorCwd: fixture.path,
    operatorHome: undefined,
    operatorConfigHome: undefined,
  });
});

afterAll(async () => {
  if (fixture !== undefined) await removeOwnedFixtureRoot(fixture);
});

describe("production lifecycle service context", () => {
  it("assembles all six owners as cold ordinary data properties", async () => {
    const root = requireFixture();
    const before = await directoryNames(root.path);
    const deps = createProductionLifecycleDeps({
      binding: EMPTY_BINDING,
      controllerDataRoot,
    });

    expect(Object.isFrozen(deps)).toBe(true);
    for (const owner of OWNER_KEYS) {
      const descriptor = Object.getOwnPropertyDescriptor(deps, owner);
      expect(descriptor?.get, owner).toBeUndefined();
      expect(descriptor?.set, owner).toBeUndefined();
      expect(descriptor?.value, owner).toBeTypeOf("object");
      expect(descriptor?.value, owner).not.toBeNull();
    }
    expect(Object.values(deps)).toHaveLength(8);
    expect(await directoryNames(root.path)).toEqual(before);
  });

  it("constructs one complete client while exposing only the selected operation", async () => {
    const root = requireFixture();
    for (const expected of OPERATION_CASES) {
      const before = await directoryNames(root.path);
      const client = await createProductionLifecycleClient(expected.operation, EMPTY_BINDING);
      const ownerClient = Object.values(client)[0];

      expect(Reflect.ownKeys(client), expected.operation).toEqual([expected.owner]);
      expect(Object.isFrozen(client), expected.operation).toBe(true);
      if (typeof ownerClient !== "object" || ownerClient === null) {
        throw new Error(`${expected.operation} did not expose an owner client`);
      }
      expect(Reflect.ownKeys(ownerClient), expected.operation).toEqual([expected.procedure]);
      expect(Object.isFrozen(ownerClient), expected.operation).toBe(true);
      expect(await directoryNames(root.path), expected.operation).toEqual(before);
    }
  });

  it("distinguishes deferred absent Git from a bound repository outcome", async () => {
    const root = requireFixture();
    const repository = await createGeneratedGitRepository(root);
    await unlink(repository.releaseInputFile);
    const contentWorkspace = await commitGeneratedGitRepository(
      repository,
      "remove governed release input",
    );
    const before = await directoryNames(root.path);
    const unboundDeps = createProductionLifecycleDeps({
      binding: EMPTY_BINDING,
      controllerDataRoot,
    });
    const unboundClient = createClient({
      deps: unboundDeps,
      scope: {
        controllerIdentity: "controller:production-context-test",
        controllerDataRootIdentity: "controller-data:production-context-test",
      },
      config: {},
    });
    const boundDeps = createProductionLifecycleDeps({
      binding: Object.freeze({
        gitExecutable: await realpath(GIT_EXECUTABLE),
        providerExecutables: Object.freeze({}),
      }),
      controllerDataRoot,
    });
    const boundClient = createClient({
      deps: boundDeps,
      scope: {
        controllerIdentity: "controller:production-context-test",
        controllerDataRootIdentity: "controller-data:production-context-test",
      },
      config: {},
    });
    const artifactRef = must(parseArtifactRef({
      kind: "release",
      releaseDigest: `rd1_${"1".repeat(64)}`,
      artifactDigest: `ad1_${"2".repeat(64)}`,
    }));

    await expect(unboundClient.packaging.package({
      artifactRef,
      format: "cowork-v1",
      outputPath: path.join(root.path, "unused.cowork"),
    }, invocation)).resolves.toMatchObject({
      kind: "RejectedBeforeOutputMutation",
      primaryFailure: { code: "ArtifactMissing" },
    });
    expect(await directoryNames(root.path)).toEqual(before);

    const request = Object.freeze({
      contentWorkspace,
      mode: Object.freeze({ kind: "complete-set" }),
    });
    await expect(boundClient.releases.check(request, invocation)).resolves.toMatchObject({
      kind: "IneligibleReport",
      issues: [{
        kind: "SourceEligibility",
        issue: { code: "MissingReleaseInput" },
      }],
    });
    expect(await directoryNames(root.path)).toEqual(before);

    for (let attempt = 0; attempt < 2; attempt += 1) {
      await expect(unboundClient.releases.check(request, invocation)).resolves.toMatchObject({
        kind: "IneligibleReport",
        issues: [{
          kind: "SourceEligibility",
          issue: { code: "GitFailure" },
        }],
      });
      expect(await directoryNames(root.path)).toEqual(before);
    }
  });
});

function requireFixture(): OwnedFixtureRoot {
  if (fixture === undefined) throw new Error("production context fixture is unavailable");
  return fixture;
}

function directoryNames(root: string): Promise<readonly string[]> {
  return readdir(root).then((entries) => entries.sort());
}

function must<T, E>(
  result: Readonly<{ ok: true; value: T }> | Readonly<{ ok: false; issues: readonly E[] }>,
): T {
  if (!result.ok) throw new Error(`fixture value failed validation: ${JSON.stringify(result.issues)}`);
  return result.value;
}
