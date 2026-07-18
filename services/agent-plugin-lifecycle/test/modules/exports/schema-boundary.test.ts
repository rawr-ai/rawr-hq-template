import { schema } from "@rawr/hq-sdk";
import { describe, expect, it } from "vitest";
import { Value } from "typebox/value";

import {
  ExportAgentPluginsRequestSchema,
  ExportAgentPluginsResultSchema,
} from "../../../src/service/modules/exports/schemas";

const failure = Object.freeze({
  code: "ManagedStateMismatch",
  phase: "planning",
  message: "managed state differs",
  path: "/tmp/export",
});
const destinationIdentity = Object.freeze({ destination: "/tmp/export", layout: "codex-v1" });
const event = Object.freeze({
  mutation: "WritePayload",
  pluginId: "cognition",
  relativePath: "codex/plugins/cognition/skills/state-machine-design/SKILL.md",
  actionDigest: `eia1_${"a".repeat(64)}`,
});
const readOnly = Object.freeze({
  ...destinationIdentity,
  kind: "ReadOnlyConverged",
  ledgerGeneration: 4,
});
const rejected = Object.freeze({
  ...destinationIdentity,
  kind: "RejectedBeforeMutation",
  failures: { kind: "PrimaryOnly", primary: failure },
});
const settled = Object.freeze({
  ...destinationIdentity,
  kind: "MutatedSettled",
  ledgerGeneration: 5,
  applied: [event],
  verifiedPaths: [event.relativePath],
  retiredPaths: [],
  preservedPaths: [],
});
const unsettled = Object.freeze({
  ...destinationIdentity,
  kind: "MutatedUnsettled",
  applied: [event],
  failures: {
    kind: "PrimaryAndCleanup",
    primary: failure,
    cleanup: { ...failure, code: "TemporaryCleanupFailed" },
  },
  pendingCapsuleGeneration: "capsule-5",
  recoveryRequired: true,
});

describe("export procedure schema boundary", () => {
  it("keeps overwrite policy explicit at both the static and runtime request boundary", () => {
    const request = {
      protocolVersion: 1,
      artifactRef: { kind: "complete-set", releaseSetDigest: `rs1_${"b".repeat(64)}` },
      mode: "complete-set",
      layout: "codex-v1",
      destinations: ["/tmp/export"],
      overwritePolicy: "managed-only",
    };
    expect(Value.Check(ExportAgentPluginsRequestSchema, request)).toBe(true);
    const missingPolicy = Object.fromEntries(
      Object.entries(request).filter(([key]) => key !== "overwritePolicy"),
    );
    expect(Value.Check(ExportAgentPluginsRequestSchema, missingPolicy)).toBe(false);
  });

  it("rejects swapped or foreign artifact digest domains at the callable boundary", async () => {
    const request = {
      protocolVersion: 1,
      artifactRef: {
        kind: "release",
        releaseDigest: `rd1_${"a".repeat(64)}`,
        artifactDigest: `ad1_${"b".repeat(64)}`,
      },
      mode: "targeted-release",
      layout: "codex-v1",
      destinations: ["/tmp/export"],
      overwritePolicy: "managed-only",
    };
    expect(Value.Check(ExportAgentPluginsRequestSchema, request)).toBe(true);

    const invalid = [
      {
        ...request,
        artifactRef: {
          kind: "release",
          releaseDigest: request.artifactRef.artifactDigest,
          artifactDigest: request.artifactRef.releaseDigest,
        },
      },
      {
        ...request,
        artifactRef: { kind: "complete-set", releaseSetDigest: `foreign_${"c".repeat(64)}` },
        mode: "complete-set",
      },
    ];
    for (const candidate of invalid) {
      expect(Value.Check(ExportAgentPluginsRequestSchema, candidate)).toBe(false);
      const validated = await schema(ExportAgentPluginsRequestSchema)["~standard"].validate(candidate);
      expect("issues" in validated).toBe(true);
    }
  });

  it("admits all four top-level and all four destination state variants", () => {
    const outcomes = [
      { protocolVersion: 1, kind: "ReadOnlyConverged", destinations: [readOnly] },
      {
        protocolVersion: 1,
        kind: "RejectedBeforeMutation",
        failure,
        destinations: [rejected],
        synchronization: { kind: "NotAcquired" },
      },
      {
        protocolVersion: 1,
        kind: "MutatedSettled",
        destinations: [readOnly, rejected, settled],
        synchronization: { kind: "Released" },
      },
      {
        protocolVersion: 1,
        kind: "MutatedUnsettled",
        pendingCapsuleGeneration: "capsule-5",
        destinations: [unsettled],
        synchronization: { kind: "ReleaseFailed", failure },
      },
    ];

    for (const outcome of outcomes) {
      expect(Value.Check(ExportAgentPluginsResultSchema, outcome)).toBe(true);
    }
  });

  it("rejects unknown variants, extra fields, and malformed nested events at the output validator", async () => {
    const invalid = [
      { protocolVersion: 1, kind: "Applied", destinations: [] },
      { protocolVersion: 1, kind: "ReadOnlyConverged", destinations: [readOnly], extra: true },
      {
        protocolVersion: 1,
        kind: "MutatedSettled",
        destinations: [{ ...settled, applied: [{ ...event, mutation: "OverwriteAnything" }] }],
        synchronization: { kind: "Released" },
      },
    ];

    for (const candidate of invalid) {
      expect(Value.Check(ExportAgentPluginsResultSchema, candidate)).toBe(false);
      const validated = await schema(ExportAgentPluginsResultSchema)["~standard"].validate(candidate);
      expect("issues" in validated).toBe(true);
    }
  });
});
