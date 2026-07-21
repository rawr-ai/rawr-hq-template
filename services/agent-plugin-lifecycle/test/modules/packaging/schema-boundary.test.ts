import { schema } from "@rawr/hq-sdk";
import type {
  InferContractRouterInputs,
  InferContractRouterOutputs,
} from "@orpc/contract";
import { describe, expect, expectTypeOf, it } from "vitest";
import type { Static } from "typebox";
import { Value } from "typebox/value";

import { contract } from "../../../src/service/modules/packaging/contract";
import type {
  PackageAgentPluginRequest,
  PackageAgentPluginResult,
} from "../../../src/service/modules/packaging/model/dto/packaging-lifecycle";
import {
  ArtifactRefSchema,
  PackageAgentPluginRequestSchema,
  PackageAgentPluginResultSchema,
} from "../../../src/service/modules/packaging/schemas";
import {
  ArtifactRefInputSchema,
  CompleteSetArtifactRefInputSchema,
  ReleaseArtifactRefInputSchema,
  type ArtifactRefInput,
  type CompleteSetArtifactRefInput,
  type ReleaseArtifactRefInput,
} from "../../../src/service/shared/release";

const artifactRef = Object.freeze({
  kind: "release",
  releaseDigest: `rd1_${"a".repeat(64)}`,
  artifactDigest: `ad1_${"b".repeat(64)}`,
});
const identity = Object.freeze({
  artifactRef,
  format: "cowork-v1",
  outputPath: "/tmp/cognition.zip",
  packageDigest: `pkg1_${"c".repeat(64)}`,
});
const failure = Object.freeze({
  code: "OutputChanged",
  phase: "output-commit",
  message: "output identity changed",
});

describe("packaging procedure result schema boundary", () => {
  it("derives shared refs and public procedure types from their owning schemas", () => {
    type ContractInputs = InferContractRouterInputs<typeof contract>;
    type ContractOutputs = InferContractRouterOutputs<typeof contract>;

    expect(ArtifactRefSchema).toBe(ArtifactRefInputSchema);
    expectTypeOf<ReleaseArtifactRefInput>().toEqualTypeOf<
      Static<typeof ReleaseArtifactRefInputSchema>
    >();
    expectTypeOf<CompleteSetArtifactRefInput>().toEqualTypeOf<
      Static<typeof CompleteSetArtifactRefInputSchema>
    >();
    expectTypeOf<ArtifactRefInput>().toEqualTypeOf<Static<typeof ArtifactRefInputSchema>>();
    expectTypeOf<PackageAgentPluginRequest>().toEqualTypeOf<
      Static<typeof PackageAgentPluginRequestSchema>
    >();
    expectTypeOf<PackageAgentPluginResult>().toEqualTypeOf<
      Static<typeof PackageAgentPluginResultSchema>
    >();
    expectTypeOf<PackageAgentPluginRequest["artifactRef"]>().toEqualTypeOf<ArtifactRefInput>();
    expectTypeOf<ContractInputs["package"]>().toEqualTypeOf<PackageAgentPluginRequest>();
    expectTypeOf<ContractOutputs["package"]>().toEqualTypeOf<PackageAgentPluginResult>();
  });

  it("rejects swapped or foreign artifact digest domains at the callable boundary", async () => {
    const request = {
      artifactRef,
      format: "cowork-v1",
      outputPath: identity.outputPath,
    };
    expect(Value.Check(PackageAgentPluginRequestSchema, request)).toBe(true);

    const invalid = [
      {
        ...request,
        artifactRef: {
          kind: "release",
          releaseDigest: artifactRef.artifactDigest,
          artifactDigest: artifactRef.releaseDigest,
        },
      },
      {
        ...request,
        artifactRef: { kind: "complete-set", releaseSetDigest: `foreign_${"c".repeat(64)}` },
      },
      { ...request, format: "cowork-v2" },
      { ...request, outputPath: "" },
      { ...request, ambientAuthority: true },
      { ...request, artifactRef: { ...artifactRef, releaseSetDigest: `rs1_${"c".repeat(64)}` } },
      { ...request, artifactRef: { kind: "release", releaseDigest: artifactRef.releaseDigest } },
    ];
    for (const candidate of invalid) {
      expect(Value.Check(PackageAgentPluginRequestSchema, candidate)).toBe(false);
      const validated = await schema(PackageAgentPluginRequestSchema)["~standard"].validate(candidate);
      expect("issues" in validated).toBe(true);
    }
  });

  it("admits exactly the four closed packaging outcomes", () => {
    const outcomes = [
      {
        kind: "RejectedBeforeOutputMutation",
        primaryFailure: failure,
      },
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

  it("rejects unknown variants, extra fields, and malformed nested failures at the output validator", async () => {
    const invalid = [
      { kind: "Succeeded", ...identity },
      { kind: "ReadOnlyConverged", ...identity, extra: true },
      {
        kind: "RejectedBeforeOutputMutation",
        primaryFailure: { ...failure, code: "MadeUpFailure" },
      },
      {
        kind: "RejectedBeforeOutputMutation",
        primaryFailure: { ...failure, detail: failure.message },
      },
      { kind: "ReadOnlyConverged", ...identity, cleanupFailure: failure },
      { kind: "OutputReplacedVerified", ...identity, priorOutput: "Unknown" },
      {
        kind: "OutputUnsettled",
        ...identity,
        artifactRef: { ...artifactRef, ambientAuthority: true },
        primaryFailure: failure,
      },
    ];

    for (const candidate of invalid) {
      expect(Value.Check(PackageAgentPluginResultSchema, candidate)).toBe(false);
      const validated = await schema(PackageAgentPluginResultSchema)["~standard"].validate(candidate);
      expect("issues" in validated).toBe(true);
    }
  });
});
