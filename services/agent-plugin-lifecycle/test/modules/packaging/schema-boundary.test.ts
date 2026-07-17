import { schema } from "@rawr/hq-sdk";
import { describe, expect, it } from "vitest";
import { Value } from "typebox/value";

import {
  PackageAgentPluginRequestSchema,
  PackageAgentPluginResultSchema,
} from "../../../src/service/modules/packaging/schemas";

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
    ];

    for (const candidate of invalid) {
      expect(Value.Check(PackageAgentPluginResultSchema, candidate)).toBe(false);
      const validated = await schema(PackageAgentPluginResultSchema)["~standard"].validate(candidate);
      expect("issues" in validated).toBe(true);
    }
  });
});
