import { schema } from "@rawr/hq-sdk";
import type {
  InferContractRouterInputs,
  InferContractRouterOutputs,
} from "@orpc/contract";
import { describe, expect, expectTypeOf, it } from "vitest";
import type { Static } from "typebox";
import { Value } from "typebox/value";

import {
  artifactStoreBuildIssue,
  MAX_ARTIFACT_STORE_CLEANUP_FAILURE_LENGTH,
  MAX_ARTIFACT_STORE_ISSUE_DETAIL_LENGTH,
  MAX_RELEASE_CONSTRUCTION_ISSUE_DETAIL_LENGTH,
  MAX_RELEASE_SOURCE_CHANGED_DETAIL_LENGTH,
  normalizeReleaseSourceChangedDetail,
  releaseConstructionBuildIssue,
  type AgentPluginBuildRequest,
  type AgentPluginCheckRequest,
  type BuildIssue,
  type BuildMode,
  type BuildResult,
  type CheckResult,
  type ReleaseInputRefreshRequest,
  type ReleaseInputRefreshResult,
  type ReleaseInputRecordRequest,
  type ReleaseInputRecordResult,
  type RepositoryCheckRequest,
  type RepositoryCheckResult,
} from "../../../src/service/modules/releases/model/dto/release-lifecycle";
import type {
  RetentionInventoryEntry,
  RetentionIssue,
  RetentionPlan,
  RetentionPlanBlocked,
  RetentionRef,
  RetentionResult,
  RetentionSpacePolicyV1,
} from "../../../src/service/modules/releases/model/dto/retention";
import {
  BuildInputSchema,
  BuildIssueSchema,
  BuildModeSchema,
  BuildResultSchema,
  CheckInputSchema,
  CheckResultSchema,
  PlanRetentionInputSchema,
  PlanRetentionResultSchema,
  RetentionInventorySchema,
  RetentionPinsV1Schema,
  ReleaseInputRefreshInputSchema,
  ReleaseInputRefreshResultSchema,
  ReleaseInputRecordInputSchema,
  ReleaseInputRecordResultSchema,
  RepositoryCheckInputSchema,
  RepositoryCheckResultSchema,
  RetentionInventoryEntrySchema,
  RetentionIssueSchema,
  RetentionPlanBlockedSchema,
  RetentionPlanSchema,
  RetentionRefSchema,
} from "../../../src/service/modules/releases/schemas";
import {
  MAX_RETENTION_ISSUE_DETAIL_LENGTH,
  MAX_RETENTION_REFS,
} from "../../../src/service/modules/releases/model/dto/retention";
import {
  MAX_SOURCE_ELIGIBILITY_ISSUE_DETAIL_LENGTH,
  SourceEligibilityIssueSchema,
  sourceEligibilityIssue,
} from "../../../src/service/model/dto/releases/content-workspace";
import {
  ReleaseInputBodySchema,
  ReleaseInputEnvelopeSchema,
  ReleaseIssueSchema,
  type ReleaseInputBody,
  type ReleaseInputEnvelope,
  type ReleaseIssue,
} from "../../../src/service/shared/release";
import { contract } from "../../../src/service/modules/releases/contract";
import {
  issue,
  MAX_RELEASE_ISSUE_ACTUAL_LENGTH,
  MAX_RELEASE_ISSUE_CLAIMANT_LENGTH,
  MAX_RELEASE_ISSUE_CLAIM_KIND_LENGTH,
  MAX_RELEASE_ISSUE_CLAIM_LENGTH,
  MAX_RELEASE_ISSUE_EXPECTED_LENGTH,
  MAX_RELEASE_ISSUE_MESSAGE_LENGTH,
  MAX_RELEASE_ISSUE_PATH_LENGTH,
} from "../../../src/service/shared/release/issues";

const contentWorkspace = Object.freeze({
  locator: "/tmp/content-workspace",
  repositoryIdentity: "git:personal-rawr-hq",
  contentAuthority: "personal-rawr-hq",
  remoteName: "origin",
  remoteUrl: "git@example.invalid:rawr-hq.git",
  refName: "refs/heads/main",
  sourceCommit: "a".repeat(40),
  sourceTree: "b".repeat(40),
  releaseInputPath: ".rawr/release-input.json",
  pluginRoot: "plugins/agent",
});
const releaseDigest = `rd1_${"c".repeat(64)}`;
const artifactDigest = `ad1_${"d".repeat(64)}`;
const releaseSetDigest = `rs1_${"e".repeat(64)}`;
const workspaceBinding = "f".repeat(64);

describe("release procedure schema boundary", () => {
  it("derives every public release contract type from its TypeBox schema", () => {
    type ContractInputs = InferContractRouterInputs<typeof contract>;
    type ContractOutputs = InferContractRouterOutputs<typeof contract>;

    expectTypeOf<BuildMode>().toEqualTypeOf<Static<typeof BuildModeSchema>>();
    expectTypeOf<AgentPluginCheckRequest>().toEqualTypeOf<Static<typeof CheckInputSchema>>();
    expectTypeOf<AgentPluginBuildRequest>().toEqualTypeOf<Static<typeof BuildInputSchema>>();
    expectTypeOf<BuildIssue>().toEqualTypeOf<Static<typeof BuildIssueSchema>>();
    expectTypeOf<CheckResult>().toEqualTypeOf<Static<typeof CheckResultSchema>>();
    expectTypeOf<BuildResult>().toEqualTypeOf<Static<typeof BuildResultSchema>>();
    expectTypeOf<RepositoryCheckRequest>().toEqualTypeOf<
      Static<typeof RepositoryCheckInputSchema>
    >();
    expectTypeOf<RepositoryCheckResult>().toEqualTypeOf<
      Static<typeof RepositoryCheckResultSchema>
    >();
    expectTypeOf<RetentionRef>().toEqualTypeOf<Static<typeof RetentionRefSchema>>();
    expectTypeOf<RetentionIssue>().toEqualTypeOf<Static<typeof RetentionIssueSchema>>();
    expectTypeOf<RetentionInventoryEntry>().toEqualTypeOf<
      Static<typeof RetentionInventoryEntrySchema>
    >();
    expectTypeOf<RetentionSpacePolicyV1>().toEqualTypeOf<
      Static<typeof PlanRetentionInputSchema>
    >();
    expectTypeOf<RetentionPlan>().toEqualTypeOf<Static<typeof RetentionPlanSchema>>();
    expectTypeOf<RetentionPlanBlocked>().toEqualTypeOf<
      Static<typeof RetentionPlanBlockedSchema>
    >();
    expectTypeOf<RetentionResult>().toEqualTypeOf<
      Static<typeof PlanRetentionResultSchema>
    >();
    expectTypeOf<ReleaseInputRecordRequest>().toEqualTypeOf<
      Static<typeof ReleaseInputRecordInputSchema>
    >();
    expectTypeOf<ReleaseInputRecordResult>().toEqualTypeOf<
      Static<typeof ReleaseInputRecordResultSchema>
    >();
    expectTypeOf<ReleaseInputRefreshRequest>().toEqualTypeOf<
      Static<typeof ReleaseInputRefreshInputSchema>
    >();
    expectTypeOf<ReleaseInputRefreshResult>().toEqualTypeOf<
      Static<typeof ReleaseInputRefreshResultSchema>
    >();
    expectTypeOf<ReleaseIssue>().toEqualTypeOf<Static<typeof ReleaseIssueSchema>>();
    expectTypeOf<ReleaseInputBody>().toEqualTypeOf<Static<typeof ReleaseInputBodySchema>>();
    expectTypeOf<ReleaseInputEnvelope>().toEqualTypeOf<Static<typeof ReleaseInputEnvelopeSchema>>();
    expectTypeOf<ContractInputs["releaseInputRecord"]>().toEqualTypeOf<
      Static<typeof ReleaseInputRecordInputSchema>
    >();
    expectTypeOf<ContractOutputs["releaseInputRecord"]>().toEqualTypeOf<
      Static<typeof ReleaseInputRecordResultSchema>
    >();
    expectTypeOf<ContractInputs["refreshReleaseInput"]>().toEqualTypeOf<
      Static<typeof ReleaseInputRefreshInputSchema>
    >();
    expectTypeOf<ContractOutputs["refreshReleaseInput"]>().toEqualTypeOf<
      Static<typeof ReleaseInputRefreshResultSchema>
    >();
    expectTypeOf<ContractInputs["check"]>().toEqualTypeOf<Static<typeof CheckInputSchema>>();
    expectTypeOf<ContractOutputs["check"]>().toEqualTypeOf<Static<typeof CheckResultSchema>>();
    expectTypeOf<ContractInputs["build"]>().toEqualTypeOf<Static<typeof BuildInputSchema>>();
    expectTypeOf<ContractOutputs["build"]>().toEqualTypeOf<Static<typeof BuildResultSchema>>();
    expectTypeOf<ContractInputs["checkRepository"]>().toEqualTypeOf<
      Static<typeof RepositoryCheckInputSchema>
    >();
    expectTypeOf<ContractOutputs["checkRepository"]>().toEqualTypeOf<
      Static<typeof RepositoryCheckResultSchema>
    >();
    expectTypeOf<ContractInputs["planRetention"]>().toEqualTypeOf<
      Static<typeof PlanRetentionInputSchema>
    >();
    expectTypeOf<ContractOutputs["planRetention"]>().toEqualTypeOf<
      Static<typeof PlanRetentionResultSchema>
    >();
  });

  it("admits only the two closed check/build mode envelopes", () => {
    expect(Value.Check(CheckInputSchema, {
      contentWorkspace,
      mode: { kind: "targeted", pluginId: "cognition" },
    })).toBe(true);
    expect(Value.Check(BuildInputSchema, {
      contentWorkspace,
      mode: { kind: "complete-set" },
    })).toBe(true);
    expect(Value.Check(BuildInputSchema, {
      contentWorkspace,
      mode: { kind: "complete-set" },
      failpoint: "not-public",
    })).toBe(false);
    expect(Value.Check(CheckInputSchema, {
      contentWorkspace,
      mode: { kind: "all" },
    })).toBe(false);
  });

  it("rejects non-canonical workspace and targeted-plugin authority at the callable boundary", async () => {
    const invalidWorkspaces = [
      { ...contentWorkspace, locator: "/" },
      { ...contentWorkspace, locator: "relative/content-workspace" },
      { ...contentWorkspace, locator: "/tmp/../content-workspace" },
      { ...contentWorkspace, locator: "/tmp//content-workspace" },
      { ...contentWorkspace, locator: "/tmp/content-workspace/" },
      { ...contentWorkspace, repositoryIdentity: "file:/tmp/rawr-hq" },
      { ...contentWorkspace, repositoryIdentity: "Git:personal-rawr-hq" },
      { ...contentWorkspace, repositoryIdentity: "git:personal/../rawr-hq" },
      { ...contentWorkspace, repositoryIdentity: `git:${"a".repeat(509)}` },
      { ...contentWorkspace, contentAuthority: "Personal-RAWR-HQ" },
      { ...contentWorkspace, contentAuthority: "personal rawr hq" },
      { ...contentWorkspace, contentAuthority: "a".repeat(513) },
      { ...contentWorkspace, remoteName: "--origin" },
      { ...contentWorkspace, remoteName: "o".repeat(129) },
      { ...contentWorkspace, remoteUrl: "https://example.invalid/rawr-hq.git\n" },
      { ...contentWorkspace, remoteUrl: "u".repeat(513) },
      { ...contentWorkspace, refName: "main" },
      { ...contentWorkspace, refName: "refs/heads/.hidden" },
      { ...contentWorkspace, refName: "refs/heads/release.lock" },
      { ...contentWorkspace, refName: "refs/heads/main..next" },
      { ...contentWorkspace, sourceCommit: "A".repeat(40) },
      { ...contentWorkspace, sourceCommit: "a".repeat(41) },
      { ...contentWorkspace, sourceTree: "b".repeat(63) },
      { ...contentWorkspace, releaseInputPath: "/.rawr/release-input.json" },
      { ...contentWorkspace, releaseInputPath: ".rawr/../release-input.json" },
      { ...contentWorkspace, releaseInputPath: "release:input.json" },
      { ...contentWorkspace, releaseInputPath: "cafe\u0301/release-input.json" },
      { ...contentWorkspace, pluginRoot: "plugins\\agents" },
      { ...contentWorkspace, pluginRoot: "plugins/agents/" },
      { ...contentWorkspace, pluginRoot: "\u{00e9}".repeat(513) },
    ];

    for (const invalid of invalidWorkspaces) {
      const request = { contentWorkspace: invalid, mode: { kind: "complete-set" } };
      expect(Value.Check(CheckInputSchema, request)).toBe(false);
      const validated = await schema(CheckInputSchema)["~standard"].validate(request);
      expect("issues" in validated).toBe(true);
    }

    for (const pluginId of ["Cognition", "cognition/tools", "a".repeat(513)]) {
      expect(Value.Check(CheckInputSchema, {
        contentWorkspace,
        mode: { kind: "targeted", pluginId },
      })).toBe(false);
    }

    expect(Value.Check(CheckInputSchema, {
      contentWorkspace: {
        ...contentWorkspace,
        sourceCommit: "a".repeat(64),
        sourceTree: "b".repeat(64),
        pluginRoot: "\u{00e9}".repeat(512),
      },
      mode: { kind: "targeted", pluginId: "cognition.state-machine" },
    })).toBe(true);
  });

  it("keeps read-only and mutating outcomes in closed discriminated unions", () => {
    expect(Value.Check(CheckResultSchema, {
      kind: "EligibleReport",
      mode: { kind: "complete-set" },
      candidate: { kind: "complete-set", releaseSetDigest },
      eligibilityBinding: workspaceBinding,
    })).toBe(true);
    expect(Value.Check(BuildResultSchema, {
      kind: "ReadOnlyConverged",
      mode: { kind: "targeted", pluginId: "cognition" },
      ref: {
        kind: "release",
        releaseDigest,
        artifactDigest,
      },
    })).toBe(true);
    expect(Value.Check(BuildResultSchema, {
      kind: "RejectedBeforePublication",
      mode: { kind: "complete-set" },
      issues: [],
    })).toBe(false);
    expect(Value.Check(BuildResultSchema, {
      kind: "ReadOnlyConverged",
      mode: { kind: "complete-set" },
      ref: { kind: "complete-set", releaseSetDigest: "rs1_deadbeef" },
    })).toBe(false);
    expect(Value.Check(PlanRetentionResultSchema, {
      kind: "RetentionPlanBlocked",
      issues: [{ detail: "retention readers are unavailable" }],
    })).toBe(true);
    expect(Value.Check(PlanRetentionResultSchema, {
      kind: "BlockedPinnedGraph",
      issues: [{ detail: "legacy ambiguous discriminator" }],
    })).toBe(false);
  });

  it("rejects retention collections beyond the domain limit", () => {
    const ref = { kind: "complete-set", releaseSetDigest } as const;
    const refs = Array.from({ length: MAX_RETENTION_REFS + 1 }, () => ref);
    const entries = refs.map((entryRef) => ({ ref: entryRef, storedBytes: 1 }));

    expect(Value.Check(RetentionPinsV1Schema, { schemaVersion: 1, refs })).toBe(false);
    expect(Value.Check(RetentionInventorySchema, entries)).toBe(false);
    expect(Value.Check(PlanRetentionResultSchema, {
      kind: "RetentionPlan",
      pinned: refs,
      retained: [],
      collectible: [],
      blockedEntries: [],
    })).toBe(false);
    expect(Value.Check(PlanRetentionResultSchema, {
      kind: "RetentionPlanBlocked",
      issues: refs.map(() => ({ detail: "bounded" })),
    })).toBe(false);
  });

  it("rejects malformed and surplus check/build outcomes at the callable boundary", async () => {
    const invalidCheckResults = [
      {
        kind: "EligibleReport",
        mode: { kind: "complete-set" },
        candidate: { kind: "complete-set", releaseSetDigest, locator: "not-public" },
        eligibilityBinding: "binding-v1",
      },
      {
        kind: "EligibleReport",
        mode: { kind: "complete-set" },
        candidate: { kind: "complete-set", releaseSetDigest },
        eligibilityBinding: "",
      },
      {
        kind: "IneligibleReport",
        mode: { kind: "targeted", pluginId: "cognition", extra: true },
        issues: [{ kind: "ReleaseConstruction", detail: "fixture" }],
      },
    ];
    for (const candidate of invalidCheckResults) {
      expect(Value.Check(CheckResultSchema, candidate)).toBe(false);
      const validated = await schema(CheckResultSchema)["~standard"].validate(candidate);
      expect("issues" in validated).toBe(true);
    }

    const invalidBuildResults = [
      {
        kind: "Published",
        mode: { kind: "complete-set" },
        ref: { kind: "complete-set", releaseSetDigest },
        newlyPublished: [],
        preExisting: [],
        requestedFinalCommit: "Unknown",
      },
      {
        kind: "PublicationIncomplete",
        mode: { kind: "complete-set" },
        newlyPublished: [{ kind: "release", releaseDigest, artifactDigest, extra: true }],
        preExisting: [],
        requestedSetRefAbsent: true,
        issues: [{ kind: "ReleaseConstruction", detail: "fixture" }],
      },
      {
        kind: "PublicationUnsettled",
        mode: { kind: "complete-set" },
        observedVerifiedReleases: [],
        requestedFinalCommit: "Known",
        issues: [{ kind: "ArtifactStore", detail: "fixture" }],
      },
    ];
    for (const candidate of invalidBuildResults) {
      expect(Value.Check(BuildResultSchema, candidate)).toBe(false);
      const validated = await schema(BuildResultSchema)["~standard"].validate(candidate);
      expect("issues" in validated).toBe(true);
    }
  });

  it("keeps retention policy and result envelopes closed and bounded", async () => {
    expect(Value.Check(PlanRetentionInputSchema, {
      kind: "space-v1",
      maximumUnpinnedBytes: Number.MAX_SAFE_INTEGER,
    })).toBe(true);

    const invalidPolicies = [
      { kind: "space-v1", maximumUnpinnedBytes: -1 },
      { kind: "space-v1", maximumUnpinnedBytes: 0.5 },
      { kind: "space-v1", maximumUnpinnedBytes: Number.MAX_SAFE_INTEGER + 1 },
      { kind: "space-v1", maximumUnpinnedBytes: 0, unit: "bytes" },
    ];
    for (const candidate of invalidPolicies) {
      expect(Value.Check(PlanRetentionInputSchema, candidate)).toBe(false);
      const validated = await schema(PlanRetentionInputSchema)["~standard"].validate(candidate);
      expect("issues" in validated).toBe(true);
    }

    expect(Value.Check(PlanRetentionResultSchema, {
      kind: "RetentionPlan",
      pinned: [{ kind: "complete-set", releaseSetDigest }],
      retained: [{
        ref: { kind: "mechanical-evidence", protocolVersion: 1, digest: `me1_${"f".repeat(64)}` },
        storedBytes: Number.MAX_SAFE_INTEGER,
      }],
      collectible: [{
        ref: { kind: "release", releaseDigest, artifactDigest },
        storedBytes: 0,
      }],
      blockedEntries: [],
    })).toBe(true);

    const invalidResults = [
      {
        kind: "RetentionPlan",
        pinned: [{ kind: "complete-set", releaseSetDigest, path: "not-public" }],
        retained: [],
        collectible: [],
        blockedEntries: [],
      },
      {
        kind: "RetentionPlan",
        pinned: [],
        retained: [{ ref: { kind: "release", releaseDigest, artifactDigest }, storedBytes: -1 }],
        collectible: [],
        blockedEntries: [],
      },
      {
        kind: "RetentionPlanBlocked",
        issues: [],
      },
      {
        kind: "RetentionPlanBlocked",
        issues: [{ detail: "", source: "not-public" }],
      },
    ];
    for (const candidate of invalidResults) {
      expect(Value.Check(PlanRetentionResultSchema, candidate)).toBe(false);
      const validated = await schema(PlanRetentionResultSchema)["~standard"].validate(candidate);
      expect("issues" in validated).toBe(true);
    }
  });

  it("keeps release-input record authoring pure and schema closed", async () => {
    expect(Value.Check(ReleaseInputRecordInputSchema, {
      kind: "encode-body",
      body: { invalidUntilHandledByReleasePolicy: true },
    })).toBe(true);
    expect(Value.Check(ReleaseInputRecordInputSchema, {
      kind: "validate-envelope",
      bytes: new Uint8Array([123, 125, 10]),
    })).toBe(true);
    expect(Value.Check(ReleaseInputRecordInputSchema, {
      kind: "validate-envelope",
      bytes: "{}\n",
    })).toBe(false);
    expect(Value.Check(ReleaseInputRecordInputSchema, {
      kind: "encode-body",
      body: {},
      path: ".rawr/release-input.json",
    })).toBe(false);

    expect(Value.Check(ReleaseInputRecordResultSchema, {
      ok: true,
      value: {
        releaseInputDigest: `ri1_${"a".repeat(64)}`,
        byteLength: 3,
        bytes: new Uint8Array([123, 125, 10]),
      },
    })).toBe(true);
    expect(Value.Check(ReleaseInputRecordResultSchema, {
      ok: false,
      issues: [{
        code: "UNKNOWN_FIELD",
        path: "releaseInput.body.extra",
        message: "Unknown field",
      }],
    })).toBe(true);
    expect(Value.Check(ReleaseInputRecordResultSchema, {
      ok: false,
      issues: [{
        code: "NOT_A_RELEASE_ISSUE",
        path: "releaseInput",
        message: "Not admitted",
      }],
    })).toBe(false);

    const invalidInputs = [
      { kind: "encode-body", body: {}, path: ".rawr/release-input.json" },
      { kind: "validate-envelope", bytes: "{}\n" },
    ];
    for (const candidate of invalidInputs) {
      const validated = await schema(ReleaseInputRecordInputSchema)["~standard"].validate(candidate);
      expect("issues" in validated).toBe(true);
    }

    const invalidResults = [
      {
        ok: true,
        value: {
          releaseInputDigest: `ri1_${"a".repeat(64)}`,
          byteLength: 3,
          bytes: new Uint8Array([123, 125, 10]),
          receipt: "not-public",
        },
      },
      {
        ok: false,
        issues: [{
          code: "UNKNOWN_FIELD",
          path: "releaseInput.body.extra",
          message: "Unknown field",
          source: "not-public",
        }],
      },
    ];
    for (const candidate of invalidResults) {
      const validated = await schema(ReleaseInputRecordResultSchema)["~standard"].validate(candidate);
      expect("issues" in validated).toBe(true);
    }
  });

  it("keeps release-input refresh membership and outcomes closed", async () => {
    const stagedWorkspace = {
      locator: contentWorkspace.locator,
      repositoryIdentity: contentWorkspace.repositoryIdentity,
      contentAuthority: contentWorkspace.contentAuthority,
      remoteName: contentWorkspace.remoteName,
      remoteUrl: contentWorkspace.remoteUrl,
      refName: contentWorkspace.refName,
      releaseInputPath: contentWorkspace.releaseInputPath,
      pluginRoot: contentWorkspace.pluginRoot,
    };
    const request = { contentWorkspace: stagedWorkspace, memberIds: ["cognition", "dev"] };
    expect(Value.Check(ReleaseInputRefreshInputSchema, request)).toBe(true);
    expect(Value.Check(ReleaseInputRefreshInputSchema, {
      ...request,
      memberIds: ["cognition", "cognition"],
    })).toBe(false);
    expect(Value.Check(ReleaseInputRefreshInputSchema, {
      ...request,
      memberIds: [],
    })).toBe(false);
    expect(Value.Check(ReleaseInputRefreshInputSchema, {
      ...request,
      memberIds: ["Cognition"],
    })).toBe(false);
    expect(Value.Check(ReleaseInputRefreshInputSchema, {
      ...request,
      outputPath: ".rawr/release-input.json",
    })).toBe(false);

    const success = {
      kind: "ReleaseInputCandidateReady",
      releaseInputDigest: `ri1_${"a".repeat(64)}`,
      byteLength: 3,
      bytes: new Uint8Array([123, 125, 10]),
    };
    expect(Value.Check(ReleaseInputRefreshResultSchema, success)).toBe(true);
    expect(Value.Check(ReleaseInputRefreshResultSchema, { ...success, receipt: "not-public" })).toBe(false);
    expect(Value.Check(ReleaseInputRefreshResultSchema, {
      kind: "RepositoryIneligible",
      mode: "staged",
      issues: [{ code: "PayloadMismatch", detail: "undeclared member" }],
    })).toBe(true);
    expect(Value.Check(ReleaseInputRefreshResultSchema, {
      kind: "ReleaseInputRejected",
      issues: [],
    })).toBe(false);

    for (const candidate of [
      { ...request, memberIds: ["cognition"], write: true },
      { ...request, memberIds: ["cognition", "cognition"] },
    ]) {
      const validated = await schema(ReleaseInputRefreshInputSchema)["~standard"].validate(candidate);
      expect("issues" in validated).toBe(true);
    }
  });

  it("keeps staged and clean repository checks in closed nonoptional variants", () => {
    const stagedWorkspace = {
      locator: contentWorkspace.locator,
      repositoryIdentity: contentWorkspace.repositoryIdentity,
      contentAuthority: contentWorkspace.contentAuthority,
      remoteName: contentWorkspace.remoteName,
      remoteUrl: contentWorkspace.remoteUrl,
      refName: contentWorkspace.refName,
      releaseInputPath: contentWorkspace.releaseInputPath,
      pluginRoot: contentWorkspace.pluginRoot,
    };
    expect(Value.Check(RepositoryCheckInputSchema, {
      kind: "staged",
      contentWorkspace: stagedWorkspace,
    })).toBe(true);
    expect(Value.Check(RepositoryCheckInputSchema, {
      kind: "clean",
      contentWorkspace,
    })).toBe(true);
    expect(Value.Check(RepositoryCheckInputSchema, {
      kind: "staged",
      contentWorkspace: { ...stagedWorkspace, sourceCommit: "a".repeat(40) },
    })).toBe(false);
    expect(Value.Check(RepositoryCheckInputSchema, {
      kind: "clean",
      contentWorkspace: stagedWorkspace,
    })).toBe(false);

    expect(Value.Check(RepositoryCheckResultSchema, {
      kind: "StagedRepositoryEligible",
      repositoryIdentity: contentWorkspace.repositoryIdentity,
      refName: contentWorkspace.refName,
      headCommit: contentWorkspace.sourceCommit,
      headTree: contentWorkspace.sourceTree,
      stagedBinding: workspaceBinding,
    })).toBe(true);
    expect(Value.Check(RepositoryCheckResultSchema, {
      kind: "StagedRepositoryEligible",
      repositoryIdentity: contentWorkspace.repositoryIdentity,
      refName: contentWorkspace.refName,
      headCommit: contentWorkspace.sourceCommit,
      headTree: contentWorkspace.sourceTree,
      stagedBinding: workspaceBinding,
      candidate: { kind: "complete-set", releaseSetDigest },
    })).toBe(false);
    expect(Value.Check(RepositoryCheckResultSchema, {
      kind: "CleanRepositoryEligible",
      repositoryIdentity: contentWorkspace.repositoryIdentity,
      refName: contentWorkspace.refName,
      sourceCommit: contentWorkspace.sourceCommit,
      sourceTree: contentWorkspace.sourceTree,
      eligibilityBinding: workspaceBinding,
      stagedBinding: "forbidden",
    })).toBe(false);
    expect(Value.Check(RepositoryCheckResultSchema, {
      kind: "SourceChanged",
      mode: "clean",
      detail: "forbidden clean source-changed variant",
    })).toBe(false);
  });

  it("admits only exact lowercase SHA-256 workspace bindings", () => {
    const checkResult = {
      kind: "EligibleReport",
      mode: { kind: "complete-set" },
      candidate: { kind: "complete-set", releaseSetDigest },
      eligibilityBinding: workspaceBinding,
    } as const;
    const stagedResult = {
      kind: "StagedRepositoryEligible",
      repositoryIdentity: contentWorkspace.repositoryIdentity,
      refName: contentWorkspace.refName,
      headCommit: contentWorkspace.sourceCommit,
      headTree: contentWorkspace.sourceTree,
      stagedBinding: workspaceBinding,
    } as const;
    const cleanResult = {
      kind: "CleanRepositoryEligible",
      repositoryIdentity: contentWorkspace.repositoryIdentity,
      refName: contentWorkspace.refName,
      sourceCommit: contentWorkspace.sourceCommit,
      sourceTree: contentWorkspace.sourceTree,
      eligibilityBinding: workspaceBinding,
    } as const;

    expect(Value.Check(CheckResultSchema, checkResult)).toBe(true);
    expect(Value.Check(RepositoryCheckResultSchema, stagedResult)).toBe(true);
    expect(Value.Check(RepositoryCheckResultSchema, cleanResult)).toBe(true);

    for (const invalid of [
      "f".repeat(63),
      "f".repeat(65),
      "F".repeat(64),
      "g".repeat(64),
      "binding-v1",
    ]) {
      expect(Value.Check(CheckResultSchema, {
        ...checkResult,
        eligibilityBinding: invalid,
      })).toBe(false);
      expect(Value.Check(RepositoryCheckResultSchema, {
        ...stagedResult,
        stagedBinding: invalid,
      })).toBe(false);
      expect(Value.Check(RepositoryCheckResultSchema, {
        ...cleanResult,
        eligibilityBinding: invalid,
      })).toBe(false);
    }
  });

  it("bounds externally influenced release diagnostics at owner constructors", () => {
    const oversized = "x".repeat(8_192);
    const releaseIssue = issue(
      "INVALID_STRING",
      oversized,
      oversized,
      {
        expected: oversized,
        actual: oversized,
        claimKind: oversized,
        claim: oversized,
        claimants: [oversized],
      },
    );
    const sourceIssue = sourceEligibilityIssue("GitFailure", oversized);
    const artifactIssue = artifactStoreBuildIssue(oversized, oversized);
    const constructionIssue = releaseConstructionBuildIssue(oversized);
    const sourceChangedDetail = normalizeReleaseSourceChangedDetail(oversized);

    expect(releaseIssue.path).toHaveLength(MAX_RELEASE_ISSUE_PATH_LENGTH);
    expect(releaseIssue.message).toHaveLength(MAX_RELEASE_ISSUE_MESSAGE_LENGTH);
    expect(releaseIssue.expected).toHaveLength(MAX_RELEASE_ISSUE_EXPECTED_LENGTH);
    expect(releaseIssue.actual).toHaveLength(MAX_RELEASE_ISSUE_ACTUAL_LENGTH);
    expect(releaseIssue.claimKind).toHaveLength(MAX_RELEASE_ISSUE_CLAIM_KIND_LENGTH);
    expect(releaseIssue.claim).toHaveLength(MAX_RELEASE_ISSUE_CLAIM_LENGTH);
    expect(releaseIssue.claimants?.[0]).toHaveLength(MAX_RELEASE_ISSUE_CLAIMANT_LENGTH);
    expect(Value.Check(ReleaseIssueSchema, releaseIssue)).toBe(true);
    expect(sourceIssue.detail).toHaveLength(MAX_SOURCE_ELIGIBILITY_ISSUE_DETAIL_LENGTH);
    expect(Value.Check(SourceEligibilityIssueSchema, sourceIssue)).toBe(true);
    expect(artifactIssue.detail).toHaveLength(MAX_ARTIFACT_STORE_ISSUE_DETAIL_LENGTH);
    expect(artifactIssue.cleanupFailure).toHaveLength(
      MAX_ARTIFACT_STORE_CLEANUP_FAILURE_LENGTH,
    );
    expect(Value.Check(BuildIssueSchema, artifactIssue)).toBe(true);
    expect(constructionIssue.detail).toHaveLength(MAX_RELEASE_CONSTRUCTION_ISSUE_DETAIL_LENGTH);
    expect(Value.Check(BuildIssueSchema, constructionIssue)).toBe(true);
    expect(sourceChangedDetail).toHaveLength(MAX_RELEASE_SOURCE_CHANGED_DETAIL_LENGTH);

    expect(Value.Check(ReleaseIssueSchema, {
      code: "INVALID_STRING",
      path: oversized,
      message: oversized,
      expected: oversized,
      actual: oversized,
      claimKind: oversized,
      claim: oversized,
      claimants: [oversized],
    })).toBe(false);
    expect(Value.Check(SourceEligibilityIssueSchema, {
      code: "GitFailure",
      detail: oversized,
    })).toBe(false);
    expect(Value.Check(BuildIssueSchema, {
      kind: "ArtifactStore",
      detail: oversized,
      cleanupFailure: oversized,
    })).toBe(false);
    expect(Value.Check(BuildIssueSchema, {
      kind: "ReleaseConstruction",
      detail: oversized,
    })).toBe(false);
    expect(Value.Check(RetentionIssueSchema, { detail: oversized })).toBe(false);
    expect(Value.Check(ReleaseInputRefreshResultSchema, {
      kind: "SourceChanged",
      mode: "staged",
      detail: oversized,
    })).toBe(false);
    expect(Value.Check(RepositoryCheckResultSchema, {
      kind: "SourceChanged",
      mode: "staged",
      detail: oversized,
    })).toBe(false);
    expect(MAX_RETENTION_ISSUE_DETAIL_LENGTH).toBe(4_096);
  });
});
