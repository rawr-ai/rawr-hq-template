import { readdir, realpath, unlink } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@rawr/agent-plugin-lifecycle/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  commitGeneratedGitRepository,
  createGeneratedGitRepository,
  GIT_EXECUTABLE,
} from "../../../../../services/agent-plugin-lifecycle/test/support/git-repository";
import type { LifecycleOperation } from "../../../src/lib/agent-plugins/commands/binding";
import {
  createProductionLifecycleClient,
  createProductionLifecycleDeps,
} from "../../../src/lib/agent-plugins/service-runtime/client";
import {
  createOwnedFixtureRoot,
  type OwnedFixtureRoot,
  removeOwnedFixtureRoot,
} from "./releases/owned-fixture-root";

const LIFECYCLE_OBJECT_DEP_KEYS = Object.freeze([
  "contentWorkspace",
  "clock",
  "packageOutput",
  "providerNativeSessions",
]);
const OPERATION_CASES = Object.freeze([
  { operation: "releases.check", owner: "releases", procedure: "check" },
  { operation: "releases.checkRepository", owner: "releases", procedure: "checkRepository" },
  {
    operation: "releases.releaseInputRecord",
    owner: "releases",
    procedure: "releaseInputRecord",
  },
  {
    operation: "releases.refreshReleaseInput",
    owner: "releases",
    procedure: "refreshReleaseInput",
  },
  { operation: "vendors.status", owner: "vendors", procedure: "status" },
  { operation: "vendors.update", owner: "vendors", procedure: "update" },
  { operation: "packaging.package", owner: "packaging", procedure: "package" },
  { operation: "providers.test", owner: "providers", procedure: "test" },
  { operation: "providers.sync", owner: "providers", procedure: "sync" },
  { operation: "providers.status", owner: "providers", procedure: "status" },
  {
    operation: "governance.currentMainRecord",
    owner: "governance",
    procedure: "currentMainRecord",
  },
  {
    operation: "governance.currentMainSelection",
    owner: "governance",
    procedure: "currentMainSelection",
  },
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
beforeAll(async () => {
  fixture = await createOwnedFixtureRoot();
});

afterAll(async () => {
  if (fixture !== undefined) await removeOwnedFixtureRoot(fixture);
});

describe("production lifecycle service context", () => {
  it("assembles root-owned raw resources as cold ordinary data properties", async () => {
    const root = requireFixture();
    const before = await directoryNames(root.path);
    const deps = createProductionLifecycleDeps({ binding: EMPTY_BINDING });

    expect(Object.isFrozen(deps)).toBe(true);
    for (const dependency of LIFECYCLE_OBJECT_DEP_KEYS) {
      const descriptor = Object.getOwnPropertyDescriptor(deps, dependency);
      expect(descriptor?.get, dependency).toBeUndefined();
      expect(descriptor?.set, dependency).toBeUndefined();
      expect(descriptor?.value, dependency).toBeTypeOf("object");
      expect(descriptor?.value, dependency).not.toBeNull();
    }
    expect(deps).not.toHaveProperty("releaseSource");
    expect(deps).not.toHaveProperty("stagedReleaseSource");
    expect(deps).not.toHaveProperty("packaging");
    expect(deps).not.toHaveProperty("governance");
    expect(deps).not.toHaveProperty("providers");
    expect(deps).not.toHaveProperty("providerCurrentMain");
    expect(deps).not.toHaveProperty("releaseArtifacts");
    expect(deps).not.toHaveProperty("releaseEvidence");
    expect(deps).not.toHaveProperty("providerArtifactRepository");
    expect(deps).not.toHaveProperty("providerEvidenceStore");
    expect(deps.packageOutput).toMatchObject({
      encodeCoworkV1: expect.any(Function),
      publish: expect.any(Function),
    });
    expect(Object.values(deps)).toHaveLength(6);
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
      "remove governed release input"
    );
    const before = await directoryNames(root.path);
    const unboundDeps = createProductionLifecycleDeps({ binding: EMPTY_BINDING });
    const unboundClient = createClient({
      deps: unboundDeps,
      scope: {},
      config: {},
    });
    const boundDeps = createProductionLifecycleDeps({
      binding: Object.freeze({
        gitExecutable: await realpath(GIT_EXECUTABLE),
        providerExecutables: Object.freeze({}),
      }),
    });
    const boundClient = createClient({
      deps: boundDeps,
      scope: {},
      config: {},
    });
    await expect(
      unboundClient.packaging.package(
        {
          contentWorkspace,
          mode: { kind: "complete-set" },
          format: "cowork-v1",
          outputPath: path.join(root.path, "unused.cowork"),
        },
        invocation
      )
    ).resolves.toMatchObject({
      kind: "RejectedBeforeOutputMutation",
      primaryFailure: { code: "SourceIneligible" },
    });
    expect(await directoryNames(root.path)).toEqual(before);

    const request = Object.freeze({
      contentWorkspace,
      mode: Object.freeze({ kind: "complete-set" }),
    });
    await expect(boundClient.releases.check(request, invocation)).resolves.toMatchObject({
      kind: "IneligibleReport",
      issues: [
        {
          kind: "SourceEligibility",
          issue: { code: "MissingReleaseInput" },
        },
      ],
    });
    expect(await directoryNames(root.path)).toEqual(before);

    for (let attempt = 0; attempt < 2; attempt += 1) {
      await expect(unboundClient.releases.check(request, invocation)).resolves.toMatchObject({
        kind: "IneligibleReport",
        issues: [
          {
            kind: "SourceEligibility",
            issue: { code: "GitFailure" },
          },
        ],
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
