import { schema } from "@rawr/hq-sdk";
import type {
  InferContractRouterInputs,
  InferContractRouterOutputs,
} from "@orpc/contract";
import { describe, expect, expectTypeOf, it } from "vitest";
import type { Static } from "typebox";
import { Value } from "typebox/value";

import { contract } from "../../../src/service/modules/vendors/contract";
import type {
  VendorContentWorkspaceRef,
  VendorSourceStatus,
  VendorStatusRequest,
  VendorStatusResult,
  VendorUpdateIssue,
  VendorUpdateRequest,
  VendorUpdateResult,
} from "../../../src/service/modules/vendors/model/dto/vendor-operations";
import {
  VendorContentWorkspaceRefSchema,
  VendorLockRecordSchema,
  VendorProvenanceRecordSchema,
  VendorRecordBindingSchema,
  VendorSourceDeclarationSchema,
  VendorSourceStatusSchema,
  VendorStatusInputSchema,
  VendorStatusResultSchema,
  VendorUpdateInputSchema,
  VendorUpdateIssueSchema,
  VendorUpdateResultSchema,
} from "../../../src/service/modules/vendors/schemas";

type VendorStatusIssues = Extract<VendorStatusResult, { kind: "Rejected" }>["issues"];
type VendorUpdateIssues = Extract<VendorUpdateResult, { kind: "Rejected" }>["issues"];

// @ts-expect-error Rejected status always reports at least one issue.
const emptyStatusIssues: VendorStatusIssues = [];
// @ts-expect-error Rejected update always reports at least one issue.
const emptyUpdateIssues: VendorUpdateIssues = [];
void emptyStatusIssues;
void emptyUpdateIssues;

const contentWorkspace = Object.freeze({
  locator: "/tmp/content-workspace",
  repositoryIdentity: "git:personal-rawr-hq",
  contentAuthority: "personal-rawr-hq",
  refName: "refs/heads/main",
  sourceCommit: "a".repeat(40),
  sourceTree: "b".repeat(40),
  releaseInputPath: ".rawr/release-input.json",
});
const admitted = Object.freeze({
  repositoryIdentity: "git:vendor-upstream",
  refName: "refs/heads/main",
  sourceCommit: "c".repeat(40),
  sourceTree: "d".repeat(40),
  payloadDigest: `sha256_${"e".repeat(64)}`,
});
const observed = Object.freeze({
  ...admitted,
  sourceCommit: "f".repeat(40),
  sourceTree: "1".repeat(40),
  payloadDigest: `sha256_${"2".repeat(64)}`,
});
const declaration = Object.freeze({
  schemaVersion: 1,
  sourceId: "upstream",
  policy: "tracked",
  repositoryIdentity: admitted.repositoryIdentity,
  refName: admitted.refName,
  sourcePath: "skills/upstream",
  destinationPath: "plugins/cognition/skills/upstream",
  provenancePath: "vendor/provenance/upstream.json",
  lockPath: "vendor/locks/upstream.json",
  curationRevision: 1,
  supportedBaseline: "codex>=0.144.5",
});
const lock = Object.freeze({ schemaVersion: 1, sourceId: "upstream", admitted });
const provenance = Object.freeze({
  schemaVersion: 1,
  sourceId: "upstream",
  admitted,
  importedPayloadDigest: admitted.payloadDigest,
  curationRevision: 1,
  supportedBaseline: "codex>=0.144.5",
  observedLatest: admitted,
  observedAt: "2026-07-17T18:20:30.123Z",
  disposition: "admitted",
});

describe("vendor procedure schema boundary", () => {
  it("derives public vendor request and result types from the contract schemas", () => {
    type ContractInputs = InferContractRouterInputs<typeof contract>;
    type ContractOutputs = InferContractRouterOutputs<typeof contract>;

    expectTypeOf<VendorContentWorkspaceRef>().toEqualTypeOf<
      Static<typeof VendorContentWorkspaceRefSchema>
    >();
    expectTypeOf<VendorStatusRequest>().toEqualTypeOf<Static<typeof VendorStatusInputSchema>>();
    expectTypeOf<VendorUpdateRequest>().toEqualTypeOf<Static<typeof VendorUpdateInputSchema>>();
    expectTypeOf<VendorSourceStatus>().toEqualTypeOf<Static<typeof VendorSourceStatusSchema>>();
    expectTypeOf<VendorUpdateIssue>().toEqualTypeOf<Static<typeof VendorUpdateIssueSchema>>();
    expectTypeOf<VendorStatusResult>().toEqualTypeOf<Static<typeof VendorStatusResultSchema>>();
    expectTypeOf<VendorUpdateResult>().toEqualTypeOf<Static<typeof VendorUpdateResultSchema>>();
    expectTypeOf<ContractInputs["status"]>().toEqualTypeOf<
      Static<typeof VendorStatusInputSchema>
    >();
    expectTypeOf<ContractOutputs["status"]>().toEqualTypeOf<
      Static<typeof VendorStatusResultSchema>
    >();
    expectTypeOf<ContractInputs["update"]>().toEqualTypeOf<
      Static<typeof VendorUpdateInputSchema>
    >();
    expectTypeOf<ContractOutputs["update"]>().toEqualTypeOf<
      Static<typeof VendorUpdateResultSchema>
    >();
  });

  it("keeps status read-only and update selection explicit", () => {
    expect(Value.Check(VendorStatusInputSchema, { contentWorkspace })).toBe(true);
    expect(Value.Check(VendorStatusInputSchema, {
      contentWorkspace,
      sourceIds: ["upstream"],
    })).toBe(false);
    expect(Value.Check(VendorUpdateInputSchema, {
      contentWorkspace,
      sourceIds: ["upstream"],
    })).toBe(true);
    expect(Value.Check(VendorUpdateInputSchema, {
      contentWorkspace,
      sourceIds: [],
    })).toBe(false);
    expect(Value.Check(VendorUpdateInputSchema, {
      contentWorkspace,
      sourceIds: ["UPSTREAM"],
    })).toBe(false);
    expect(Value.Check(VendorUpdateInputSchema, {
      contentWorkspace,
      sourceIds: ["upstream-"],
    })).toBe(false);
  });

  it("rejects malformed and surplus request authority at the callable boundary", async () => {
    const invalidStatusRequests = [
      { contentWorkspace, sourceIds: ["upstream"] },
      { contentWorkspace: { ...contentWorkspace, extra: true } },
      { contentWorkspace: { ...contentWorkspace, locator: "relative/workspace" } },
    ];
    const invalidUpdateRequests = [
      { contentWorkspace, sourceIds: ["upstream"], extra: true },
      { contentWorkspace: { ...contentWorkspace, extra: true }, sourceIds: ["upstream"] },
      { contentWorkspace, sourceIds: ["upstream", "upstream"] },
      { contentWorkspace, sourceIds: "upstream" },
    ];

    for (const request of invalidStatusRequests) {
      expect(Value.Check(VendorStatusInputSchema, request)).toBe(false);
      const validated = await schema(VendorStatusInputSchema)["~standard"].validate(request);
      expect("issues" in validated).toBe(true);
    }
    for (const request of invalidUpdateRequests) {
      expect(Value.Check(VendorUpdateInputSchema, request)).toBe(false);
      const validated = await schema(VendorUpdateInputSchema)["~standard"].validate(request);
      expect("issues" in validated).toBe(true);
    }
  });

  it("rejects ambiguous workspace locators, refs, object ids, and release-input paths", () => {
    const invalidWorkspaces = [
      { ...contentWorkspace, locator: "/" },
      { ...contentWorkspace, locator: "relative/workspace" },
      { ...contentWorkspace, locator: "/tmp/../workspace" },
      { ...contentWorkspace, locator: "/tmp//workspace" },
      { ...contentWorkspace, refName: "main" },
      { ...contentWorkspace, refName: "refs/heads/main..next" },
      { ...contentWorkspace, sourceCommit: "a".repeat(41) },
      { ...contentWorkspace, sourceCommit: "A".repeat(40) },
      { ...contentWorkspace, sourceTree: "b".repeat(63) },
      { ...contentWorkspace, releaseInputPath: "../release-input.json" },
      { ...contentWorkspace, releaseInputPath: "/absolute/release-input.json" },
    ];
    for (const invalid of invalidWorkspaces) {
      expect(Value.Check(VendorStatusInputSchema, { contentWorkspace: invalid })).toBe(false);
    }
    expect(Value.Check(VendorStatusInputSchema, {
      contentWorkspace: { ...contentWorkspace, sourceCommit: "a".repeat(64) },
    })).toBe(true);
  });

  it("exposes the six truthful classifications and closed update outcomes", () => {
    expect(Value.Check(VendorStatusResultSchema, {
      kind: "VendorStatus",
      sources: [{
        sourceId: "upstream",
        classification: "UpdateAvailable",
        admitted,
        observed,
      }],
    })).toBe(true);
    expect(Value.Check(VendorStatusResultSchema, {
      kind: "VendorStatus",
      sources: [{
        sourceId: "upstream",
        classification: "Deploying",
        admitted,
        observed: null,
      }],
    })).toBe(false);
    expect(Value.Check(VendorStatusResultSchema, {
      kind: "VendorStatus",
      sources: [{
        sourceId: "upstream",
        classification: "Current",
        admitted: { ...admitted, payloadDigest: "e".repeat(64) },
        observed: null,
      }],
    })).toBe(false);
    expect(Value.Check(VendorStatusResultSchema, {
      kind: "Rejected",
      issues: [{ code: "WrongRepository", detail: "wrong repository" }],
    })).toBe(true);
    expect(Value.Check(VendorUpdateResultSchema, {
      kind: "Rejected",
      sourceIds: ["upstream"],
      issues: [{ code: "HeldSource", sourceId: "upstream", detail: "governance hold" }],
    })).toBe(true);
    expect(Value.Check(VendorUpdateResultSchema, {
      kind: "Rejected",
      sourceIds: ["upstream"],
      issues: [],
    })).toBe(false);
    expect(Value.Check(VendorUpdateResultSchema, {
      kind: "AuthoredReviewableChanges",
      sourceIds: ["upstream"],
      changedPaths: ["plugins/cognition/vendor.lock"],
    })).toBe(true);
    expect(Value.Check(VendorUpdateResultSchema, {
      kind: "FailedRestored",
      sourceIds: ["upstream"],
      restoredPaths: ["plugins/cognition/vendor.lock"],
      issues: [{ code: "AuthoringFailed", sourceId: "upstream", detail: "write failed" }],
    })).toBe(true);
    expect(Value.Check(VendorUpdateResultSchema, {
      kind: "RestorationFailed",
      sourceIds: ["upstream"],
      unsettledPaths: [],
      issues: [{ code: "RestorationFailed", sourceId: "upstream", detail: "restore failed" }],
    })).toBe(false);
  });

  it("rejects malformed and surplus fields throughout public result branches", () => {
    const invalidStatusResults = [
      {
        kind: "VendorStatus",
        sources: [{
          sourceId: "upstream",
          classification: "Current",
          admitted,
          observed,
          extra: true,
        }],
      },
      {
        kind: "VendorStatus",
        sources: [{
          sourceId: "upstream",
          classification: "Current",
          admitted: { ...admitted, extra: true },
          observed,
        }],
      },
      {
        kind: "Rejected",
        issues: [{ code: "WrongRepository", detail: "wrong repository", extra: true }],
      },
      {
        kind: "Rejected",
        issues: [{ code: "WrongRepository", detail: "" }],
      },
      {
        kind: "Rejected",
        issues: [{ code: "WrongRepository", detail: "wrong repository" }],
        sourceIds: ["upstream"],
      },
    ];
    const invalidUpdateResults = [
      { kind: "ReadOnlyConverged", sourceIds: ["upstream"], changedPaths: [] },
      {
        kind: "AuthoredReviewableChanges",
        sourceIds: ["upstream"],
        changedPaths: ["plugins/upstream", "plugins/upstream"],
      },
      {
        kind: "Rejected",
        sourceIds: ["upstream"],
        issues: [{ code: "UnknownFailure", detail: "unknown" }],
      },
      {
        kind: "FailedRestored",
        sourceIds: ["upstream"],
        restoredPaths: ["plugins/upstream"],
        issues: [{ code: "AuthoringFailed", detail: "write failed", sourceId: "UPSTREAM" }],
      },
      {
        kind: "RestorationFailed",
        sourceIds: ["upstream"],
        unsettledPaths: ["plugins/upstream"],
        issues: [{ code: "RestorationFailed", detail: "restore failed" }],
        extra: true,
      },
    ];

    for (const result of invalidStatusResults) {
      expect(Value.Check(VendorStatusResultSchema, result)).toBe(false);
    }
    for (const result of invalidUpdateResults) {
      expect(Value.Check(VendorUpdateResultSchema, result)).toBe(false);
    }
  });

  it("closes declaration, lock, provenance, and binding records field by field", () => {
    expect(Value.Check(VendorSourceDeclarationSchema, declaration)).toBe(true);
    expect(Value.Check(VendorLockRecordSchema, lock)).toBe(true);
    expect(Value.Check(VendorProvenanceRecordSchema, provenance)).toBe(true);
    expect(Value.Check(VendorRecordBindingSchema, {
      id: "vendor/sources/upstream.json",
      protocol: "rawr-vendor-source@v1",
      contentDigest: `sha256_${"3".repeat(64)}`,
    })).toBe(true);

    const invalidDeclarations = [
      { ...declaration, schemaVersion: 2 },
      { ...declaration, sourceId: "UPSTREAM" },
      { ...declaration, policy: "floating" },
      { ...declaration, repositoryIdentity: "" },
      { ...declaration, refName: "main" },
      { ...declaration, sourcePath: "../skills/upstream" },
      { ...declaration, destinationPath: "/plugins/upstream" },
      { ...declaration, provenancePath: "vendor//upstream.json" },
      { ...declaration, lockPath: "vendor/../upstream.json" },
      { ...declaration, curationRevision: 0 },
      { ...declaration, curationRevision: 1.5 },
      { ...declaration, supportedBaseline: "" },
      { ...declaration, supportedBaseline: "x".repeat(4_097) },
      { ...declaration, extra: true },
    ];
    for (const candidate of invalidDeclarations) {
      expect(Value.Check(VendorSourceDeclarationSchema, candidate)).toBe(false);
    }

    const invalidLocks = [
      { ...lock, schemaVersion: 2 },
      { ...lock, sourceId: "UPSTREAM" },
      { ...lock, admitted: { ...admitted, sourceCommit: "C".repeat(40) } },
      { ...lock, extra: true },
    ];
    for (const candidate of invalidLocks) {
      expect(Value.Check(VendorLockRecordSchema, candidate)).toBe(false);
    }

    const invalidProvenance = [
      { ...provenance, schemaVersion: 2 },
      { ...provenance, sourceId: "UPSTREAM" },
      { ...provenance, admitted: { ...admitted, refName: "main" } },
      { ...provenance, importedPayloadDigest: admitted.payloadDigest.slice(7) },
      { ...provenance, curationRevision: 0 },
      { ...provenance, supportedBaseline: "" },
      { ...provenance, observedLatest: { ...admitted, sourceTree: "d".repeat(39) } },
      { ...provenance, observedAt: "2026-07-17T18:20:30+00:00" },
      { ...provenance, disposition: "accepted" },
      { ...provenance, extra: true },
    ];
    for (const candidate of invalidProvenance) {
      expect(Value.Check(VendorProvenanceRecordSchema, candidate)).toBe(false);
    }

    const invalidBindings = [
      { id: "../source.json", protocol: "rawr-vendor-source@v1", contentDigest: digest("3") },
      { id: "vendor/source.json", protocol: "rawr-vendor-source@v2", contentDigest: digest("3") },
      { id: "vendor/source.json", protocol: "rawr-vendor-source@v1", contentDigest: "3".repeat(64) },
      { id: "vendor/source.json", protocol: "rawr-vendor-source@v1", contentDigest: digest("3"), extra: true },
    ];
    for (const candidate of invalidBindings) {
      expect(Value.Check(VendorRecordBindingSchema, candidate)).toBe(false);
    }
  });
});

function digest(seed: string): string {
  return `sha256_${seed.repeat(64)}`;
}
