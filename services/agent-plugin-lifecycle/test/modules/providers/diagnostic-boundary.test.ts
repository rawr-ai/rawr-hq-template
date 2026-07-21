import type { NativeAgentProviderFailure } from "@rawr/resource-native-agent-provider";
import { describe, expect, it } from "vitest";
import { Value } from "typebox/value";

import type { CanonicalNativeRuntime } from "../../../src/service/modules/providers/model/repositories/canonical-native";
import type { CompleteTestInput, TargetedTestInput } from "../../../src/service/modules/providers/model/dto/mode";
import {
  issue,
  MAX_PROVIDER_ISSUE_TEXT_LENGTH,
  success,
} from "../../../src/service/modules/providers/model/errors/deployment-result";
import type { VerifiedReleaseReader } from "../../../src/service/modules/providers/model/repositories/artifact";
import { createNativeProviderObserver } from "../../../src/service/modules/providers/repository/native";
import { createResourceProviderReleaseReader } from "../../../src/service/modules/providers/repository/resource-artifact";
import {
  CanonicalStatusResultSchema,
  CanonicalSyncResultSchema,
  CompleteTestResultSchema,
  TargetedTestResultSchema,
} from "../../../src/service/modules/providers/schemas";
import {
  executeCanonicalStatus,
  type CanonicalStatusDependencies,
} from "../../../src/service/modules/providers/router/canonical-status.router";
import {
  executeCanonicalSync,
  type CanonicalSyncDependencies,
} from "../../../src/service/modules/providers/router/canonical-sync.router";
import {
  executeCompleteTest,
  type CompleteTestDependencies,
} from "../../../src/service/modules/providers/router/complete-test.router";
import {
  canonicalStatusResult,
  canonicalSyncResult,
  completeTestOperationResult,
  targetedTestOperationResult,
} from "../../../src/service/modules/providers/router/procedure-result";
import {
  executeTargetedTest,
  type TargetedTestDependencies,
} from "../../../src/service/modules/providers/router/targeted-test.router";
import {
  createCompleteSetArtifactRef,
  createReleaseArtifactRef,
} from "../../../src/service/shared/release";
import { productFixture } from "../../shared/release/fixtures";
import { desiredStateFixture } from "./canonical-fixture";

const OVERSIZED_EXTERNAL_DETAIL = "external provider detail ".repeat(512);
const TRUNCATED_SUFFIX = "...[truncated]";

describe("provider diagnostic boundary", () => {
  it("bounds every issue text field at its owner-local constructor", () => {
    const diagnostic = issue(
      "VISIBILITY_FAILED",
      OVERSIZED_EXTERNAL_DETAIL,
      OVERSIZED_EXTERNAL_DETAIL,
      OVERSIZED_EXTERNAL_DETAIL,
      OVERSIZED_EXTERNAL_DETAIL,
    );

    for (const value of [
      diagnostic.path,
      diagnostic.message,
      diagnostic.expected,
      diagnostic.actual,
    ]) {
      expect(value).toHaveLength(MAX_PROVIDER_ISSUE_TEXT_LENGTH);
      expect(value.endsWith(TRUNCATED_SUFFIX)).toBe(true);
    }
  });

  it("returns a bounded artifact failure through complete test", async () => {
    const fixture = productFixture();
    const releases = mismatchedReleaseReader();
    const input: CompleteTestInput = {
      kind: "complete-test",
      releaseSet: createCompleteSetArtifactRef(fixture.releaseSet.releaseSetDigest),
      evaluationProfile: "provider-smoke@v1",
      targets: [{ provider: "codex", home: "/tmp/rawr-diagnostic-complete" }],
    };

    const result = await completeTestOperationResult(executeCompleteTest(
      input,
      testDependencies(releases),
    ));

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected complete-test artifact failure");
    expectBoundedFailureMessage(result.issues[0].message);
    expect(Value.Check(CompleteTestResultSchema, result)).toBe(true);
  });

  it("returns a bounded artifact failure through targeted test", async () => {
    const fixture = productFixture();
    const releases = mismatchedReleaseReader();
    const input: TargetedTestInput = {
      kind: "targeted-test",
      releases: [createReleaseArtifactRef(
        fixture.alphaRelease.releaseDigest,
        fixture.alphaRelease.artifactDigest,
      )],
      evaluationProfile: "provider-smoke@v1",
      targets: [{ provider: "codex", home: "/tmp/rawr-diagnostic-targeted" }],
    };

    const result = await targetedTestOperationResult(executeTargetedTest(
      input,
      testDependencies(releases),
    ));

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected targeted-test artifact failure");
    expectBoundedFailureMessage(result.issues[0].message);
    expect(Value.Check(TargetedTestResultSchema, result)).toBe(true);
  });

  it("returns a bounded native failure through canonical status", async () => {
    const fixture = desiredStateFixture();
    const dependencies = canonicalDependencies(fixture);

    const result = await canonicalStatusResult(executeCanonicalStatus({
      kind: "canonical-status",
      channel: "current-main",
      locator: {
        repositoryIdentity: fixture.selection.sourceRepositoryIdentity,
        workspaceRoot: "/tmp/rawr-diagnostic-status",
      },
      targets: [{ provider: "codex", home: "/tmp/rawr-diagnostic-status-home" }],
    }, dependencies));

    expect(result).toMatchObject({
      ok: true,
      value: [{ status: "INCOMPATIBLE_PROVIDER" }],
    });
    if (!result.ok) throw new Error("Expected typed canonical-status outcome");
    const diagnostic = result.value[0]?.issues[0];
    if (diagnostic === undefined) throw new Error("Expected canonical-status diagnostic");
    expectBoundedFailureMessage(diagnostic.message);
    expect(Value.Check(CanonicalStatusResultSchema, result)).toBe(true);
  });

  it("returns a bounded native failure through canonical sync", async () => {
    const fixture = desiredStateFixture();
    const dependencies = canonicalDependencies(fixture);

    const result = await canonicalSyncResult(executeCanonicalSync({
      kind: "canonical-sync",
      channel: "current-main",
      locator: {
        repositoryIdentity: fixture.selection.sourceRepositoryIdentity,
        workspaceRoot: "/tmp/rawr-diagnostic-sync",
      },
      targets: [{ provider: "codex", home: "/tmp/rawr-diagnostic-sync-home" }],
    }, dependencies));

    expect(result).toMatchObject({
      ok: true,
      value: {
        status: "Blocked",
        targets: [{ kind: "blocked", status: "INCOMPATIBLE_PROVIDER" }],
      },
    });
    if (!result.ok) throw new Error("Expected typed canonical-sync outcome");
    const diagnostic = result.value.targets[0]?.issues[0];
    if (diagnostic === undefined) throw new Error("Expected canonical-sync diagnostic");
    expectBoundedFailureMessage(diagnostic.message);
    expect(Value.Check(CanonicalSyncResultSchema, result)).toBe(true);
  });
});

function mismatchedReleaseReader(): VerifiedReleaseReader {
  return createResourceProviderReleaseReader({
    read: async (ref) => Object.freeze({
      kind: "Mismatch" as const,
      ref,
      issues: [Object.freeze({
        code: "ReadFailure" as const,
        detail: OVERSIZED_EXTERNAL_DETAIL,
      })] as const,
    }),
  });
}

function testDependencies(
  releases: VerifiedReleaseReader,
): CompleteTestDependencies & TargetedTestDependencies {
  return {
    releases,
    provider: {
      projectionAdapterProtocol: () => unexpected("projection adapter protocol"),
      inspectCapabilities: async () => unexpected("provider capabilities"),
      readInventory: async () => unexpected("provider inventory"),
      verifyProjection: async () => unexpected("provider visibility"),
    },
    providerMutator: {
      apply: async () => unexpected("provider mutation"),
    },
    receipts: {
      read: async () => unexpected("receipt read"),
    },
    receiptWriter: {
      publish: async () => unexpected("receipt publication"),
    },
    identities: {
      read: async () => unexpected("identity read"),
    },
    identityWriter: {
      admit: async () => unexpected("identity admission"),
    },
    projectionMaterializer: {
      materialize: async () => unexpected("projection materialization"),
    },
    marketplaceMaterializer: {
      materialize: async () => unexpected("marketplace materialization"),
    },
    evidence: {
      inspect: async () => unexpected("evidence read"),
      publish: async () => unexpected("evidence publication"),
    },
  };
}

function canonicalDependencies(
  fixture: ReturnType<typeof desiredStateFixture>,
): CanonicalSyncDependencies & CanonicalStatusDependencies {
  const observer = createNativeProviderObserver({
    provider: "codex",
    adapterProtocol: fixture.projections[1].adapterProtocol,
    bridge: {
      probe: async () => {
        throw nativeFailure();
      },
      inventoryExposures: async () => unexpected("native inventory"),
    },
  });
  const native: CanonicalNativeRuntime = {
    inspectCapabilities: async (target) => await observer.inspectCapabilities(target),
    observe: async () => unexpected("canonical native observation"),
    apply: async () => unexpected("canonical native mutation"),
  };
  return {
    currentMain: {
      resolve: async () => Object.freeze({
        kind: "CURRENT_ELIGIBLE" as const,
        selection: fixture.selection,
      }),
    },
    releases: {
      read: async () => success(fixture.snapshot),
    },
    native,
    projectionMaterializer: {
      materialize: async () => unexpected("canonical projection materialization"),
    },
    marketplaceMaterializer: {
      materialize: async () => unexpected("canonical marketplace materialization"),
    },
  };
}

function nativeFailure(): NativeAgentProviderFailure {
  return Object.freeze({
    _tag: "NativeAgentProviderFailure",
    provider: "codex",
    operation: "probe",
    reason: "CommandFailed",
    detail: OVERSIZED_EXTERNAL_DETAIL,
  });
}

function expectBoundedFailureMessage(value: string): void {
  expect(value).toHaveLength(MAX_PROVIDER_ISSUE_TEXT_LENGTH);
  expect(value.endsWith(TRUNCATED_SUFFIX)).toBe(true);
}

function unexpected(label: string): never {
  throw new Error(`Unexpected ${label}`);
}
