import { getProcedureMetadata } from "@habitat-ai/rawr-hq-sdk";
import { standard } from "@habitat-ai/typebox-adapter";
import type { InferRouterContractInputs, InferRouterContractOutputs } from "@orpc/contract";
import type { Static } from "typebox";
import { Value } from "typebox/value";
import { describe, expect, expectTypeOf, it } from "vitest";
import { contract as serviceContract } from "../../../src/service/contract";
import type { AgentPluginPayload } from "../../../src/service/model/dto/agent-plugin-payload";
import type { AgentPluginRelease } from "../../../src/service/model/dto/agent-plugin-release";
import type { AgentPluginReleaseSet } from "../../../src/service/model/dto/agent-plugin-release-set";
import {
  type ContentWorkspaceInspection,
  ContentWorkspaceInspectionSchema,
  type ContentWorkspaceSnapshot,
  ContentWorkspaceSnapshotSchema,
  MAX_SOURCE_ELIGIBILITY_ISSUE_DETAIL_LENGTH,
  SourceEligibilityIssueSchema,
  sourceEligibilityIssue,
} from "../../../src/service/model/dto/content-workspace";
import {
  type DerivedReleaseSelection,
  DerivedReleaseSelectionSchema,
  type ReleaseDerivationResult,
  ReleaseDerivationResultSchema,
  type ReleaseDerivationSource,
  ReleaseDerivationSourceSchema,
  type ReleaseSelection,
  ReleaseSelectionSchema,
} from "../../../src/service/model/dto/release-derivation";
import {
  type AgentPluginReleaseInput,
  MAX_RELEASE_MEMBERS,
  type ReleaseInputBody,
  ReleaseInputBodySchema,
  type ReleaseInputEnvelope,
  ReleaseInputEnvelopeSchema,
} from "../../../src/service/model/dto/release-input";
import { validateCleanContentWorkspacePolicy } from "../../../src/service/model/policy/clean-content-workspace";
import { contract } from "../../../src/service/modules/releases/contract";
import {
  type AgentPluginCheckRequest,
  CheckInputSchema,
  type CheckResult,
  CheckResultSchema,
  MAX_RELEASE_CONSTRUCTION_ISSUE_DETAIL_LENGTH,
  MAX_RELEASE_SOURCE_CHANGED_DETAIL_LENGTH,
  normalizeReleaseSourceChangedDetail,
  type ReleaseCheckIssue,
  ReleaseCheckIssueSchema,
  type ReleaseDerivationIdentity,
  ReleaseDerivationIdentitySchema,
  ReleaseInputRecordInputSchema,
  type ReleaseInputRecordRequest,
  type ReleaseInputRecordResult,
  ReleaseInputRecordResultSchema,
  ReleaseInputRefreshInputSchema,
  type ReleaseInputRefreshRequest,
  type ReleaseInputRefreshResult,
  ReleaseInputRefreshResultSchema,
  RepositoryCheckInputSchema,
  type RepositoryCheckRequest,
  type RepositoryCheckResult,
  RepositoryCheckResultSchema,
  releaseConstructionIssue,
} from "../../../src/service/modules/releases/model/dto/release-lifecycle";
import { productFixture, SOURCE } from "../../support/service/release-fixtures";

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
const releaseSetDigest = `rs1_${"e".repeat(64)}`;
const workspaceBinding = "f".repeat(64);

describe("release procedure schema boundary", () => {
  it("derives every public release contract type from its TypeBox schema", () => {
    type ContractInputs = InferRouterContractInputs<typeof contract>;
    type ContractOutputs = InferRouterContractOutputs<typeof contract>;

    expectTypeOf<ReleaseSelection>().toEqualTypeOf<Static<typeof ReleaseSelectionSchema>>();
    expectTypeOf<AgentPluginCheckRequest>().toEqualTypeOf<Static<typeof CheckInputSchema>>();
    expectTypeOf<ReleaseCheckIssue>().toEqualTypeOf<Static<typeof ReleaseCheckIssueSchema>>();
    expectTypeOf<ReleaseDerivationIdentity>().toEqualTypeOf<
      Static<typeof ReleaseDerivationIdentitySchema>
    >();
    expectTypeOf<CheckResult>().toEqualTypeOf<Static<typeof CheckResultSchema>>();
    expectTypeOf<RepositoryCheckRequest>().toEqualTypeOf<
      Static<typeof RepositoryCheckInputSchema>
    >();
    expectTypeOf<RepositoryCheckResult>().toEqualTypeOf<
      Static<typeof RepositoryCheckResultSchema>
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
    expectTypeOf<ContractInputs["checkRepository"]>().toEqualTypeOf<
      Static<typeof RepositoryCheckInputSchema>
    >();
    expectTypeOf<ContractOutputs["checkRepository"]>().toEqualTypeOf<
      Static<typeof RepositoryCheckResultSchema>
    >();
  });

  it("derives cross-module release and workspace types from their structural schemas", () => {
    type SchemaParity = [
      ReleaseDerivationSource extends Static<typeof ReleaseDerivationSourceSchema> ? true : false,
      DerivedReleaseSelection extends Static<typeof DerivedReleaseSelectionSchema> ? true : false,
      ReleaseDerivationResult extends Static<typeof ReleaseDerivationResultSchema> ? true : false,
      ContentWorkspaceSnapshot extends Static<typeof ContentWorkspaceSnapshotSchema> ? true : false,
      ContentWorkspaceInspection extends Static<typeof ContentWorkspaceInspectionSchema>
        ? true
        : false,
    ];

    expectTypeOf<SchemaParity>().toEqualTypeOf<[true, true, true, true, true]>();
    expectTypeOf<keyof ReleaseDerivationSource>().toEqualTypeOf<
      keyof Static<typeof ReleaseDerivationSourceSchema>
    >();
    expectTypeOf<keyof DerivedReleaseSelection>().toEqualTypeOf<
      keyof Static<typeof DerivedReleaseSelectionSchema>
    >();
    expectTypeOf<keyof ContentWorkspaceSnapshot>().toEqualTypeOf<
      keyof Static<typeof ContentWorkspaceSnapshotSchema>
    >();
    expectTypeOf<
      ReleaseDerivationSource["releaseInput"]
    >().toEqualTypeOf<AgentPluginReleaseInput>();
    expectTypeOf<
      ReleaseDerivationSource["payloads"][number]["payload"]
    >().toEqualTypeOf<AgentPluginPayload>();
    expectTypeOf<DerivedReleaseSelection["releases"][number]>().toEqualTypeOf<AgentPluginRelease>();
    expectTypeOf<DerivedReleaseSelection["releaseSet"]>().toEqualTypeOf<
      AgentPluginReleaseSet | undefined
    >();
    expectTypeOf<ContentWorkspaceSnapshot["releaseInput"]>().toEqualTypeOf<
      ReleaseDerivationSource["releaseInput"]
    >();
    expectTypeOf<
      Extract<ReleaseDerivationResult, { ok: true }>["value"]
    >().toEqualTypeOf<DerivedReleaseSelection>();
  });

  it("admits representative closed release-derivation and workspace values", () => {
    const fixture = productFixture();
    const source = {
      repositoryIdentity: SOURCE.sourceRepository,
      sourceCommit: SOURCE.sourceCommit,
      sourceTree: SOURCE.sourceTree,
      releaseInput: fixture.releaseInput,
      payloads: [
        { pluginId: "alpha", payload: fixture.alphaPayload },
        { pluginId: "beta", payload: fixture.betaPayload },
      ],
    };
    const snapshot = {
      ...source,
      objectBindings: [
        {
          path: "skills/alpha/SKILL.md",
          objectId: "d".repeat(40),
          mode: 0o644,
        },
      ],
      eligibilityBinding: workspaceBinding,
    };
    const result = {
      ok: true,
      value: {
        releases: [fixture.alphaRelease, fixture.betaRelease],
        releaseSet: fixture.releaseSet,
      },
    };
    const failureResult = {
      ok: false,
      failure: {
        reason: "InvalidRelease",
        pluginId: "alpha",
        issueCodes: ["INVALID_DIGEST"],
        detail: "release digest is invalid",
      },
    };

    expect(Value.Check(ReleaseDerivationSourceSchema, source)).toBe(true);
    expect(Value.Check(ContentWorkspaceSnapshotSchema, snapshot)).toBe(true);
    expect(Value.Check(ReleaseDerivationResultSchema, result)).toBe(true);
    expect(
      Value.Check(ReleaseDerivationResultSchema, {
        ok: true,
        value: { releases: [fixture.alphaRelease] },
      })
    ).toBe(true);
    expect(Value.Check(ReleaseDerivationResultSchema, failureResult)).toBe(true);
    expect(
      Value.Check(ReleaseDerivationSourceSchema, {
        ...source,
        unexpected: true,
      })
    ).toBe(false);
    expect(
      Value.Check(ReleaseDerivationSourceSchema, {
        repositoryIdentity: source.repositoryIdentity,
        sourceCommit: source.sourceCommit,
        sourceTree: source.sourceTree,
        payloads: source.payloads,
      })
    ).toBe(false);
    expect(
      Value.Check(ContentWorkspaceSnapshotSchema, {
        ...snapshot,
        objectBindings: [{ ...snapshot.objectBindings[0], mode: 0o600 }],
      })
    ).toBe(false);
    expect(
      Value.Check(DerivedReleaseSelectionSchema, {
        releases: [],
      })
    ).toBe(false);
    expect(
      Value.Check(ReleaseDerivationSourceSchema, {
        ...source,
        payloads: Array.from({ length: MAX_RELEASE_MEMBERS + 1 }, () => source.payloads[0]),
      })
    ).toBe(false);
    expect(
      Value.Check(ContentWorkspaceInspectionSchema, {
        kind: "Ineligible",
        issues: [],
      })
    ).toBe(false);
  });

  it("inherits service metadata and keeps release overrides local", () => {
    const expectedMetadata = {
      idempotent: true,
      domain: "agent-plugin-lifecycle",
      audience: "internal",
      audit: "full",
      entity: "releases",
    };

    for (const operation of [
      "check",
      "releaseInputRecord",
      "refreshReleaseInput",
      "checkRepository",
    ] as const) {
      expect(getProcedureMetadata(contract[operation])).toEqual({
        idempotent: true,
        audit: "full",
        entity: "releases",
      });
      expect(getProcedureMetadata(serviceContract.releases[operation])).toEqual(expectedMetadata);
    }
  });

  it("admits only the two closed release selections", () => {
    expect(
      Value.Check(CheckInputSchema, {
        contentWorkspace,
        mode: { kind: "targeted", pluginId: "cognition" },
      })
    ).toBe(true);
    expect(
      Value.Check(CheckInputSchema, {
        contentWorkspace,
        mode: { kind: "complete-set" },
      })
    ).toBe(true);
    expect(
      Value.Check(CheckInputSchema, {
        contentWorkspace,
        mode: { kind: "complete-set" },
        failpoint: "not-public",
      })
    ).toBe(false);
    expect(
      Value.Check(CheckInputSchema, {
        contentWorkspace,
        mode: { kind: "all" },
      })
    ).toBe(false);
  });

  it("projects workspace structure and admits its remaining semantics in policy", async () => {
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
      { ...contentWorkspace, sourceCommit: "A".repeat(40) },
      { ...contentWorkspace, sourceCommit: "a".repeat(41) },
      { ...contentWorkspace, sourceTree: "b".repeat(63) },
      { ...contentWorkspace, releaseInputPath: "/.rawr/release-input.json" },
      { ...contentWorkspace, releaseInputPath: ".rawr/../release-input.json" },
      { ...contentWorkspace, releaseInputPath: "release:input.json" },
      { ...contentWorkspace, pluginRoot: "plugins\\agents" },
      { ...contentWorkspace, pluginRoot: "plugins/agents/" },
    ];

    for (const invalid of invalidWorkspaces) {
      const request = { contentWorkspace: invalid, mode: { kind: "complete-set" } };
      expect(Value.Check(CheckInputSchema, request)).toBe(false);
      const validated = await standard(CheckInputSchema)["~standard"].validate(request);
      expect("issues" in validated).toBe(true);
    }

    const policyInvalidWorkspaces = [
      { ...contentWorkspace, refName: "refs/heads/.hidden" },
      { ...contentWorkspace, refName: "refs/heads/release.lock" },
      { ...contentWorkspace, refName: "refs/heads/main..next" },
      { ...contentWorkspace, releaseInputPath: "cafe\u0301/release-input.json" },
      { ...contentWorkspace, pluginRoot: "\u{00e9}".repeat(513) },
    ];
    for (const invalid of policyInvalidWorkspaces) {
      const request = { contentWorkspace: invalid, mode: { kind: "complete-set" } };
      expect(Value.Check(CheckInputSchema, request)).toBe(true);
      const validated = await standard(CheckInputSchema)["~standard"].validate(request);
      expect("value" in validated).toBe(true);
      expect(validateCleanContentWorkspacePolicy(invalid)).toBeDefined();
    }

    for (const pluginId of ["Cognition", "cognition/tools", "a".repeat(513)]) {
      expect(
        Value.Check(CheckInputSchema, {
          contentWorkspace,
          mode: { kind: "targeted", pluginId },
        })
      ).toBe(false);
    }

    expect(
      Value.Check(CheckInputSchema, {
        contentWorkspace: {
          ...contentWorkspace,
          sourceCommit: "a".repeat(64),
          sourceTree: "b".repeat(64),
          pluginRoot: "\u{00e9}".repeat(512),
        },
        mode: { kind: "targeted", pluginId: "cognition.state-machine" },
      })
    ).toBe(true);
  });

  it("keeps derivation outcomes in a closed non-authorizing union", () => {
    expect(
      Value.Check(CheckResultSchema, {
        kind: "EligibleReport",
        derivation: {
          kind: "complete-set",
          releaseSetDigest,
          members: [{ pluginId: "cognition", releaseDigest }],
        },
        eligibilityBinding: workspaceBinding,
      })
    ).toBe(true);
    expect(
      Value.Check(CheckResultSchema, {
        kind: "EligibleReport",
        derivation: {
          kind: "release",
          pluginId: "cognition",
          releaseDigest,
          localHandle: "/tmp/release",
        },
        eligibilityBinding: workspaceBinding,
      })
    ).toBe(false);
    expect(
      Value.Check(CheckResultSchema, {
        kind: "EligibleReport",
        mode: { kind: "complete-set" },
        derivation: {
          kind: "complete-set",
          releaseSetDigest,
          members: [{ pluginId: "cognition", releaseDigest }],
        },
        eligibilityBinding: workspaceBinding,
      })
    ).toBe(false);
    expect(
      Value.Check(CheckResultSchema, {
        kind: "EligibleReport",
        derivation: { kind: "complete-set", releaseSetDigest, members: [] },
        eligibilityBinding: workspaceBinding,
      })
    ).toBe(false);
    expect(
      Value.Check(CheckResultSchema, {
        kind: "EligibleReport",
        derivation: {
          kind: "release",
          pluginId: "cognition",
          releaseDigest,
          storePath: "/not-public",
        },
        eligibilityBinding: workspaceBinding,
      })
    ).toBe(false);
  });

  it("rejects malformed and surplus check outcomes at the callable boundary", async () => {
    const invalidCheckResults = [
      {
        kind: "EligibleReport",
        derivation: {
          kind: "complete-set",
          releaseSetDigest,
          members: [{ pluginId: "cognition", releaseDigest, locator: "not-public" }],
        },
        eligibilityBinding: workspaceBinding,
      },
      {
        kind: "EligibleReport",
        derivation: {
          kind: "complete-set",
          releaseSetDigest,
          members: [{ pluginId: "cognition", releaseDigest }],
        },
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
      const validated = await standard(CheckResultSchema)["~standard"].validate(candidate);
      expect("issues" in validated).toBe(true);
    }
  });

  it("keeps release-input record authoring pure and schema closed", async () => {
    expect(
      Value.Check(ReleaseInputRecordInputSchema, {
        kind: "encode-body",
        body: { invalidUntilHandledByReleasePolicy: true },
      })
    ).toBe(true);
    expect(
      Value.Check(ReleaseInputRecordInputSchema, {
        kind: "validate-envelope",
        bytes: new Uint8Array([123, 125, 10]),
      })
    ).toBe(true);
    expect(
      Value.Check(ReleaseInputRecordInputSchema, {
        kind: "validate-envelope",
        bytes: "{}\n",
      })
    ).toBe(true);
    expect(
      Value.Check(ReleaseInputRecordInputSchema, {
        kind: "encode-body",
        body: {},
        path: ".rawr/release-input.json",
      })
    ).toBe(false);

    expect(
      Value.Check(ReleaseInputRecordResultSchema, {
        ok: true,
        value: {
          releaseInputDigest: `ri1_${"a".repeat(64)}`,
          byteLength: 3,
          bytes: new Uint8Array([123, 125, 10]),
        },
      })
    ).toBe(true);
    expect(
      Value.Check(ReleaseInputRecordResultSchema, {
        ok: false,
        issues: [
          {
            code: "UNKNOWN_FIELD",
            path: "releaseInput.body.extra",
            message: "Unknown field",
          },
        ],
      })
    ).toBe(true);
    expect(
      Value.Check(ReleaseInputRecordResultSchema, {
        ok: false,
        issues: [
          {
            code: "NOT_A_RELEASE_ISSUE",
            path: "releaseInput",
            message: "Not admitted",
          },
        ],
      })
    ).toBe(false);

    const invalidInputs = [{ kind: "encode-body", body: {}, path: ".rawr/release-input.json" }];
    for (const candidate of invalidInputs) {
      const validated = await standard(ReleaseInputRecordInputSchema)["~standard"].validate(
        candidate
      );
      expect("issues" in validated).toBe(true);
    }
    expect(
      await standard(ReleaseInputRecordInputSchema)["~standard"].validate({
        kind: "validate-envelope",
        bytes: "{}\n",
      })
    ).toHaveProperty("value");

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
        issues: [
          {
            code: "UNKNOWN_FIELD",
            path: "releaseInput.body.extra",
            message: "Unknown field",
            source: "not-public",
          },
        ],
      },
    ];
    for (const candidate of invalidResults) {
      const validated = await standard(ReleaseInputRecordResultSchema)["~standard"].validate(
        candidate
      );
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
    expect(
      Value.Check(ReleaseInputRefreshInputSchema, {
        ...request,
        memberIds: ["cognition", "cognition"],
      })
    ).toBe(false);
    expect(
      Value.Check(ReleaseInputRefreshInputSchema, {
        ...request,
        memberIds: [],
      })
    ).toBe(false);
    expect(
      Value.Check(ReleaseInputRefreshInputSchema, {
        ...request,
        memberIds: ["Cognition"],
      })
    ).toBe(false);
    expect(
      Value.Check(ReleaseInputRefreshInputSchema, {
        ...request,
        outputPath: ".rawr/release-input.json",
      })
    ).toBe(false);

    const success = {
      kind: "ReleaseInputCandidateReady",
      releaseInputDigest: `ri1_${"a".repeat(64)}`,
      byteLength: 3,
      bytes: new Uint8Array([123, 125, 10]),
    };
    expect(Value.Check(ReleaseInputRefreshResultSchema, success)).toBe(true);
    expect(
      Value.Check(ReleaseInputRefreshResultSchema, { ...success, receipt: "not-public" })
    ).toBe(false);
    expect(
      Value.Check(ReleaseInputRefreshResultSchema, {
        kind: "RepositoryIneligible",
        mode: "staged",
        issues: [{ code: "PayloadMismatch", detail: "undeclared member" }],
      })
    ).toBe(true);
    expect(
      Value.Check(ReleaseInputRefreshResultSchema, {
        kind: "ReleaseInputRejected",
        issues: [],
      })
    ).toBe(false);

    for (const candidate of [
      { ...request, memberIds: ["cognition"], write: true },
      { ...request, memberIds: ["cognition", "cognition"] },
    ]) {
      const validated = await standard(ReleaseInputRefreshInputSchema)["~standard"].validate(
        candidate
      );
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
    expect(
      Value.Check(RepositoryCheckInputSchema, {
        kind: "staged",
        contentWorkspace: stagedWorkspace,
      })
    ).toBe(true);
    expect(
      Value.Check(RepositoryCheckInputSchema, {
        kind: "clean",
        contentWorkspace,
      })
    ).toBe(true);
    expect(
      Value.Check(RepositoryCheckInputSchema, {
        kind: "staged",
        contentWorkspace: { ...stagedWorkspace, sourceCommit: "a".repeat(40) },
      })
    ).toBe(false);
    expect(
      Value.Check(RepositoryCheckInputSchema, {
        kind: "clean",
        contentWorkspace: stagedWorkspace,
      })
    ).toBe(false);

    expect(
      Value.Check(RepositoryCheckResultSchema, {
        kind: "StagedRepositoryEligible",
        repositoryIdentity: contentWorkspace.repositoryIdentity,
        refName: contentWorkspace.refName,
        headCommit: contentWorkspace.sourceCommit,
        headTree: contentWorkspace.sourceTree,
        stagedBinding: workspaceBinding,
      })
    ).toBe(true);
    expect(
      Value.Check(RepositoryCheckResultSchema, {
        kind: "StagedRepositoryEligible",
        repositoryIdentity: contentWorkspace.repositoryIdentity,
        refName: contentWorkspace.refName,
        headCommit: contentWorkspace.sourceCommit,
        headTree: contentWorkspace.sourceTree,
        stagedBinding: workspaceBinding,
        candidate: { kind: "complete-set", releaseSetDigest },
      })
    ).toBe(false);
    expect(
      Value.Check(RepositoryCheckResultSchema, {
        kind: "CleanRepositoryEligible",
        repositoryIdentity: contentWorkspace.repositoryIdentity,
        refName: contentWorkspace.refName,
        sourceCommit: contentWorkspace.sourceCommit,
        sourceTree: contentWorkspace.sourceTree,
        eligibilityBinding: workspaceBinding,
        stagedBinding: "forbidden",
      })
    ).toBe(false);
    expect(
      Value.Check(RepositoryCheckResultSchema, {
        kind: "SourceChanged",
        mode: "clean",
        detail: "forbidden clean source-changed variant",
      })
    ).toBe(false);
  });

  it("admits only exact lowercase SHA-256 workspace bindings", () => {
    const checkResult = {
      kind: "EligibleReport",
      derivation: {
        kind: "complete-set",
        releaseSetDigest,
        members: [{ pluginId: "cognition", releaseDigest }],
      },
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
      expect(
        Value.Check(CheckResultSchema, {
          ...checkResult,
          eligibilityBinding: invalid,
        })
      ).toBe(false);
      expect(
        Value.Check(RepositoryCheckResultSchema, {
          ...stagedResult,
          stagedBinding: invalid,
        })
      ).toBe(false);
      expect(
        Value.Check(RepositoryCheckResultSchema, {
          ...cleanResult,
          eligibilityBinding: invalid,
        })
      ).toBe(false);
    }
  });

  it("bounds module-owned externally influenced diagnostics at their constructors", () => {
    const oversized = "x".repeat(8_192);
    const sourceIssue = sourceEligibilityIssue("GitFailure", oversized);
    const constructionIssue = releaseConstructionIssue(oversized);
    const sourceChangedDetail = normalizeReleaseSourceChangedDetail(oversized);

    expect(sourceIssue.detail).toHaveLength(MAX_SOURCE_ELIGIBILITY_ISSUE_DETAIL_LENGTH);
    expect(Value.Check(SourceEligibilityIssueSchema, sourceIssue)).toBe(true);
    expect(constructionIssue.detail).toHaveLength(MAX_RELEASE_CONSTRUCTION_ISSUE_DETAIL_LENGTH);
    expect(Value.Check(ReleaseCheckIssueSchema, constructionIssue)).toBe(true);
    expect(sourceChangedDetail).toHaveLength(MAX_RELEASE_SOURCE_CHANGED_DETAIL_LENGTH);

    expect(
      Value.Check(SourceEligibilityIssueSchema, {
        code: "GitFailure",
        detail: oversized,
      })
    ).toBe(false);
    expect(
      Value.Check(ReleaseCheckIssueSchema, {
        kind: "ReleaseConstruction",
        detail: oversized,
      })
    ).toBe(false);
    expect(
      Value.Check(ReleaseInputRefreshResultSchema, {
        kind: "SourceChanged",
        mode: "staged",
        detail: oversized,
      })
    ).toBe(false);
    expect(
      Value.Check(RepositoryCheckResultSchema, {
        kind: "SourceChanged",
        mode: "staged",
        detail: oversized,
      })
    ).toBe(false);
  });
});
