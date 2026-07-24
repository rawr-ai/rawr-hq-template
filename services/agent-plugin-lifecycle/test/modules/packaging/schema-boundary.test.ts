import type { InferContractRouterInputs, InferContractRouterOutputs } from "@orpc/contract";
import { schema } from "@rawr/hq-sdk";
import type { Static } from "typebox";
import { Value } from "typebox/value";
import { describe, expect, expectTypeOf, it } from "vitest";

import { contract } from "../../../src/service/modules/packaging/contract";
import {
  MAX_PACKAGING_FAILURE_MESSAGE_LENGTH,
  MAX_PACKAGING_FAILURE_PHASE_LENGTH,
  MAX_PACKAGING_OUTPUT_PATH_LENGTH,
  type PackageAgentPluginRequest,
  type PackageAgentPluginResult,
} from "../../../src/service/modules/packaging/model/dto/packaging-lifecycle";
import {
  PackageAgentPluginRequestSchema,
  PackageAgentPluginResultSchema,
  PackagedReleaseIdentitySchema,
} from "../../../src/service/modules/packaging/schemas";

const contentWorkspace = Object.freeze({
  locator: "/tmp/content",
  repositoryIdentity: "git:github.com/rawr-ai/rawr-hq",
  contentAuthority: "rawr-hq",
  remoteName: "origin",
  remoteUrl: "https://github.com/rawr-ai/rawr-hq.git",
  refName: "refs/heads/main",
  sourceCommit: "a".repeat(40),
  sourceTree: "b".repeat(40),
  releaseInputPath: ".rawr/release-input.json",
  pluginRoot: "plugins/agent",
});
const release = Object.freeze({
  kind: "release",
  pluginId: "cognition",
  releaseDigest: `rd1_${"a".repeat(64)}`,
});
const identity = Object.freeze({
  repositoryIdentity: contentWorkspace.repositoryIdentity,
  sourceCommit: contentWorkspace.sourceCommit,
  sourceTree: contentWorkspace.sourceTree,
  release,
  format: "cowork-v1",
  outputPath: "/tmp/cognition.zip",
  packageDigest: `pkg1_${"c".repeat(64)}`,
});
const request = Object.freeze({
  contentWorkspace,
  mode: { kind: "targeted", pluginId: "cognition" },
  format: "cowork-v1",
  outputPath: identity.outputPath,
});
const failure = Object.freeze({
  code: "OutputChanged",
  phase: "output-commit",
  message: "output identity changed",
});

describe("packaging procedure result schema boundary", () => {
  it("derives the callable request and result types from TypeBox", () => {
    type ContractInputs = InferContractRouterInputs<typeof contract>;
    type ContractOutputs = InferContractRouterOutputs<typeof contract>;

    expectTypeOf<PackageAgentPluginRequest>().toEqualTypeOf<
      Static<typeof PackageAgentPluginRequestSchema>
    >();
    expectTypeOf<PackageAgentPluginResult>().toEqualTypeOf<
      Static<typeof PackageAgentPluginResultSchema>
    >();
    expectTypeOf<ContractInputs["package"]>().toEqualTypeOf<PackageAgentPluginRequest>();
    expectTypeOf<ContractOutputs["package"]>().toEqualTypeOf<PackageAgentPluginResult>();
    expect(Value.Check(PackageAgentPluginRequestSchema, request)).toBe(true);
    expect(Value.Check(PackagedReleaseIdentitySchema, release)).toBe(true);
  });

  it("declares the complete packaging service metadata", () => {
    expect(contract.package["~orpc"].meta).toEqual({
      idempotent: true,
      domain: "agent-plugin-lifecycle",
      audience: "internal",
      audit: "basic",
      entity: "packaging",
    });
  });

  it("accepts only exact Git content plus one closed release selection", async () => {
    const invalid = [
      { ...request, artifactRef: release },
      { ...request, contentWorkspace: { ...contentWorkspace, sourceCommit: "A".repeat(40) } },
      { ...request, contentWorkspace: { ...contentWorkspace, sourceTree: "short" } },
      { ...request, mode: { kind: "targeted", pluginId: "Invalid/Plugin" } },
      { ...request, mode: { kind: "complete-set", pluginId: "cognition" } },
      { ...request, format: "cowork-v2" },
      { ...request, outputPath: "" },
      { ...request, outputPath: "relative.zip" },
      { ...request, outputPath: "/" },
      { ...request, outputPath: "/tmp/../escape.zip" },
      { ...request, ambientAuthority: true },
    ];
    for (const candidate of invalid) {
      expect(Value.Check(PackageAgentPluginRequestSchema, candidate)).toBe(false);
      const validated = await schema(PackageAgentPluginRequestSchema)["~standard"].validate(
        candidate
      );
      expect("issues" in validated).toBe(true);
    }
  });

  it("admits exactly the four closed packaging outcomes", () => {
    const outcomes = [
      { kind: "RejectedBeforeOutputMutation", primaryFailure: failure },
      { kind: "ReadOnlyConverged", ...identity },
      { kind: "OutputReplacedVerified", ...identity, priorOutput: "Absent" },
      {
        kind: "OutputUnsettled",
        ...identity,
        primaryFailure: failure,
        cleanupFailure: { ...failure, code: "TemporaryCleanupFailed" },
      },
    ];

    for (const outcome of outcomes) {
      expect(Value.Check(PackageAgentPluginResultSchema, outcome)).toBe(true);
    }
  });

  it("rejects handles, unknown variants, extra fields, and malformed result identity", async () => {
    const invalid = [
      { kind: "Succeeded", ...identity },
      { kind: "ReadOnlyConverged", ...identity, artifactRef: release },
      { kind: "ReadOnlyConverged", ...identity, extra: true },
      {
        kind: "ReadOnlyConverged",
        ...identity,
        release: { ...release, releaseDigest: `ad1_${"a".repeat(64)}` },
      },
      {
        kind: "RejectedBeforeOutputMutation",
        primaryFailure: { ...failure, code: "MadeUpFailure" },
      },
      { kind: "OutputReplacedVerified", ...identity, priorOutput: "Unknown" },
    ];

    for (const candidate of invalid) {
      expect(Value.Check(PackageAgentPluginResultSchema, candidate)).toBe(false);
      const validated = await schema(PackageAgentPluginResultSchema)["~standard"].validate(
        candidate
      );
      expect("issues" in validated).toBe(true);
    }
  });

  it("keeps output paths and diagnostics finite at the public boundary", async () => {
    const maximumOutputPath = `/${"p".repeat(MAX_PACKAGING_OUTPUT_PATH_LENGTH - 1)}`;
    const maximumFailure = {
      ...failure,
      phase: "p".repeat(MAX_PACKAGING_FAILURE_PHASE_LENGTH),
      message: "m".repeat(MAX_PACKAGING_FAILURE_MESSAGE_LENGTH),
    };
    const maximumRequest = { ...request, outputPath: maximumOutputPath };
    const maximumResult = {
      kind: "OutputUnsettled",
      ...identity,
      outputPath: maximumOutputPath,
      primaryFailure: maximumFailure,
    };

    expect(Value.Check(PackageAgentPluginRequestSchema, maximumRequest)).toBe(true);
    expect(Value.Check(PackageAgentPluginResultSchema, maximumResult)).toBe(true);

    for (const candidate of [
      { ...maximumRequest, outputPath: `${maximumOutputPath}p` },
      { ...maximumResult, outputPath: `${maximumOutputPath}p` },
      {
        ...maximumResult,
        primaryFailure: { ...maximumFailure, phase: `${maximumFailure.phase}p` },
      },
      {
        ...maximumResult,
        primaryFailure: { ...maximumFailure, message: `${maximumFailure.message}m` },
      },
    ]) {
      const candidateSchema =
        "kind" in candidate ? PackageAgentPluginResultSchema : PackageAgentPluginRequestSchema;
      expect(Value.Check(candidateSchema, candidate)).toBe(false);
      const validated = await schema(candidateSchema)["~standard"].validate(candidate);
      expect("issues" in validated).toBe(true);
    }
  });
});
