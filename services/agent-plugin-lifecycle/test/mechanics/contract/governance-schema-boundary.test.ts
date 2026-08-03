import { getProcedureMetadata } from "@habitat-ai/rawr-hq-sdk";
import { standard } from "@habitat-ai/typebox-adapter";
import type { InferRouterContractInputs, InferRouterContractOutputs } from "@orpc/contract";
import { type Static } from "typebox";
import { Value } from "typebox/value";
import { describe, expect, expectTypeOf, it } from "vitest";
import { contract as serviceContract } from "../../../src/service/contract";
import {
  type CanonicalRef,
  CanonicalRefSchema,
  type ExactGitBlobPointer,
  ExactGitBlobPointerSchema,
  type GitBlobId,
  GitBlobIdSchema,
  type GitBlobSelection,
  GitBlobSelectionSchema,
  type GitLocator,
  GitLocatorSchema,
} from "../../../src/service/model/dto/current-main-git";
import {
  type CanonicalChannelSelection,
  CanonicalChannelSelectionSchema,
  type CurrentMainSelectionLocator,
  CurrentMainSelectionLocatorSchema,
  type CurrentMainSelectionResult,
  MAX_CURRENT_MAIN_SELECTION_REASON_LENGTH,
} from "../../../src/service/model/dto/current-main-selection";
import { parseCanonicalRef } from "../../../src/service/model/policy/current-main-git";
import { decodeGitLocator } from "../../../src/service/model/policy/current-main-locator";
import { parseReleaseInputDigest } from "../../../src/service/model/policy/release-digest";
import {
  parseContentAuthority,
  parseGitCommitId,
  parseGitTreeId,
  parseRepositoryIdentity,
} from "../../../src/service/model/policy/release-identity";
import { contract } from "../../../src/service/modules/governance/contract";
import {
  CurrentMainRecordInputSchema,
  CurrentMainRecordResultSchema,
  MAX_CURRENT_MAIN_V3_CODEC_MESSAGE_LENGTH,
  MAX_CURRENT_MAIN_V3_CODEC_PATH_LENGTH,
} from "../../../src/service/modules/governance/model/dto/current-main-record";
import {
  CurrentMainSelectionInputSchema,
  CurrentMainSelectionResultSchema,
} from "../../../src/service/modules/governance/model/dto/current-main-selection";
import { encodeCurrentMainBodyV3 } from "../../../src/service/modules/governance/model/policy/current-main-record";

describe("governance procedure schema boundary", () => {
  it("separates policy-admitted Git identities from their projectable wire schemas", () => {
    expectTypeOf<Static<typeof CanonicalRefSchema>>().toEqualTypeOf<string>();
    expectTypeOf<Static<typeof GitBlobIdSchema>>().toEqualTypeOf<string>();
    expectTypeOf<CanonicalRef>().toMatchTypeOf<string>();
    expectTypeOf<GitBlobId>().toMatchTypeOf<string>();
    expectTypeOf<GitLocator>().toEqualTypeOf<Static<typeof GitLocatorSchema>>();
    expectTypeOf<GitBlobSelection>().toEqualTypeOf<Static<typeof GitBlobSelectionSchema>>();
    expectTypeOf<ExactGitBlobPointer>().toEqualTypeOf<Static<typeof ExactGitBlobPointerSchema>>();
    expectTypeOf<CurrentMainSelectionLocator>().toEqualTypeOf<GitLocator>();
    expect(CurrentMainSelectionLocatorSchema).toBe(GitLocatorSchema);
  });

  it("admits only closed, exact current-main Git collaboration values", () => {
    const locator = {
      workspacePath: "/tmp/personal-rawr-hq",
      expectedRepositoryIdentity: "git:github.com/rawr-ai/rawr-hq",
    };
    const selection = {
      repositoryIdentity: locator.expectedRepositoryIdentity,
      ref: "refs/heads/main",
      commit: "a".repeat(40),
      tree: "b".repeat(64),
      path: "agent-plugins/current-main.json",
    };
    const pointer = { ...selection, blob: "c".repeat(40) };
    for (const ref of [
      "refs/heads/main",
      "refs/tags/agent-plugins/content-2026-07-29",
      "refs/tags/release+candidate",
    ]) {
      expect(Value.Check(CanonicalRefSchema, ref)).toBe(true);
      expect(parseCanonicalRef(ref, "ref")).toEqual({ ok: true, value: ref });
    }
    for (const invalid of ["refs/remotes/main", "refs/heads/main~next", null]) {
      expect(Value.Check(CanonicalRefSchema, invalid)).toBe(false);
    }
    for (const semanticallyInvalid of [
      "refs/heads/.main",
      "refs/heads/main.lock",
      "refs/heads/main..next",
      "refs/heads/main//next",
      "refs/heads/main.",
    ]) {
      expect(Value.Check(CanonicalRefSchema, semanticallyInvalid)).toBe(true);
      expect(parseCanonicalRef(semanticallyInvalid, "ref").ok).toBe(false);
    }

    expect(Value.Check(GitBlobIdSchema, "d".repeat(40))).toBe(true);
    expect(Value.Check(GitBlobIdSchema, "e".repeat(64))).toBe(true);
    for (const invalid of ["f".repeat(39), "f".repeat(41), "f".repeat(65), "F".repeat(40), null]) {
      expect(Value.Check(GitBlobIdSchema, invalid)).toBe(false);
    }

    expect(Value.Check(GitLocatorSchema, locator)).toBe(true);
    expect(Value.Check(GitBlobSelectionSchema, selection)).toBe(true);
    expect(Value.Check(ExactGitBlobPointerSchema, pointer)).toBe(true);
    expect(Value.Check(GitLocatorSchema, { ...locator, unexpected: true })).toBe(false);
    expect(Value.Check(GitBlobSelectionSchema, { ...selection, unexpected: true })).toBe(false);
    expect(Value.Check(ExactGitBlobPointerSchema, { ...pointer, unexpected: true })).toBe(false);
    expect(
      Value.Check(GitLocatorSchema, {
        workspacePath: locator.workspacePath,
      })
    ).toBe(false);
    expect(
      Value.Check(GitBlobSelectionSchema, {
        repositoryIdentity: selection.repositoryIdentity,
        ref: selection.ref,
        commit: selection.commit,
        tree: selection.tree,
      })
    ).toBe(false);
    expect(Value.Check(ExactGitBlobPointerSchema, selection)).toBe(false);
    expect(Value.Check(GitBlobSelectionSchema, pointer)).toBe(false);
  });

  it("retains the 4096-byte locator policy behind the shared schema", () => {
    const expectedRepositoryIdentity = mustParse(
      parseRepositoryIdentity("git:github.com/rawr-ai/rawr-hq")
    );
    const maximum = {
      workspacePath: `/${"x".repeat(4_095)}`,
      expectedRepositoryIdentity,
    };
    const oversized = {
      ...maximum,
      workspacePath: `/${"x".repeat(4_096)}`,
    };

    expect(Value.Check(GitLocatorSchema, maximum)).toBe(true);
    expect(Value.Check(GitLocatorSchema, oversized)).toBe(true);
    expect(decodeGitLocator(maximum).ok).toBe(true);
    expect(decodeGitLocator(oversized)).toEqual({
      ok: false,
      reason: "locator.workspacePath must be a canonical non-root absolute path",
    });
  });

  it("derives the public selection and result types from TypeBox", () => {
    type ContractInputs = InferRouterContractInputs<typeof contract>;
    type ContractOutputs = InferRouterContractOutputs<typeof contract>;
    type SelectionSchema = Readonly<Static<typeof CanonicalChannelSelectionSchema>>;
    type ResultSchema = Readonly<Static<typeof CurrentMainSelectionResultSchema>>;
    type Equal<TLeft, TRight> =
      (<T>() => T extends TLeft ? 1 : 2) extends <T>() => T extends TRight ? 1 : 2
        ? (<T>() => T extends TRight ? 1 : 2) extends <T>() => T extends TLeft ? 1 : 2
          ? true
          : false
        : false;
    type SelectionParity = Equal<CanonicalChannelSelection, SelectionSchema>;
    type ResultParity = Equal<CurrentMainSelectionResult, ResultSchema>;

    expectTypeOf<SelectionParity>().toEqualTypeOf<true>();
    expectTypeOf<ResultParity>().toEqualTypeOf<true>();
    expectTypeOf<ContractInputs["currentMainRecord"]>().toEqualTypeOf<
      Static<typeof CurrentMainRecordInputSchema>
    >();
    expectTypeOf<ContractOutputs["currentMainRecord"]>().toEqualTypeOf<
      Static<typeof CurrentMainRecordResultSchema>
    >();
    expectTypeOf<ContractInputs["currentMainSelection"]>().toEqualTypeOf<
      Static<typeof CurrentMainSelectionInputSchema>
    >();
    expectTypeOf<ContractOutputs["currentMainSelection"]>().toEqualTypeOf<
      Static<typeof CurrentMainSelectionResultSchema>
    >();
  });

  it("exposes only the v3 record codec and current-main selector", () => {
    expect(Object.keys(contract).sort()).toEqual(["currentMainRecord", "currentMainSelection"]);
  });

  it("inherits service metadata and keeps governance overrides local", () => {
    const expectedMetadata = {
      idempotent: true,
      domain: "agent-plugin-lifecycle",
      audience: "internal",
      audit: "full",
      entity: "governance",
    };

    for (const operation of ["currentMainRecord", "currentMainSelection"] as const) {
      expect(getProcedureMetadata(contract[operation])).toEqual({
        idempotent: true,
        audit: "full",
        entity: "governance",
      });
      expect(getProcedureMetadata(serviceContract.governance[operation])).toEqual(expectedMetadata);
    }
  });

  it("closes both codec actions around the direct v3 record", async () => {
    const record = recordFixture();
    const encoded = encodeCurrentMainBodyV3(record);
    expect(encoded.ok).toBe(true);
    if (!encoded.ok) throw new Error(encoded.failure.message);

    expect(
      Value.Check(CurrentMainRecordInputSchema, {
        kind: "encode-body",
        body: record,
      })
    ).toBe(true);
    expect(
      Value.Check(CurrentMainRecordInputSchema, {
        kind: "validate-record",
        bytes: encoded.value.bytes,
      })
    ).toBe(true);

    for (const invalid of [
      { kind: "encode-body", body: record, bytes: encoded.value.bytes },
      { kind: "encode-body", body: { ...record, schemaVersion: 2 } },
      { kind: "encode-body", body: { ...record, projections: [] } },
      { kind: "validate-record", bytes: encoded.value.bytes, body: record },
    ]) {
      expect(Value.Check(CurrentMainRecordInputSchema, invalid)).toBe(false);
      expect(
        await standard(CurrentMainRecordInputSchema)["~standard"].validate(invalid)
      ).toHaveProperty("issues");
    }

    expect(Value.Check(CurrentMainRecordResultSchema, encoded)).toBe(true);
    expect(
      Value.Check(CurrentMainRecordResultSchema, {
        ...encoded,
        value: { ...encoded.value, currentMainDigest: `cm2_${"0".repeat(64)}` },
      })
    ).toBe(false);
  });

  it("accepts only the explicit repository locator for selection", async () => {
    const locator = {
      workspacePath: "/tmp/personal-rawr-hq",
      expectedRepositoryIdentity: "git:github.com/example/personal-rawr-hq",
    };
    expect(Value.Check(CurrentMainSelectionInputSchema, { locator })).toBe(true);

    for (const invalid of [
      { locator, canonicalRef: "refs/heads/main" },
      { locator: { ...locator, canonicalRef: "refs/heads/main" } },
      { locator: { ...locator, workspacePath: "relative/personal-rawr-hq" } },
      { locator: { ...locator, expectedRepositoryIdentity: "file:tmp/personal-rawr-hq" } },
      {
        workspacePath: locator.workspacePath,
        expectedRepositoryIdentity: locator.expectedRepositoryIdentity,
      },
    ]) {
      expect(Value.Check(CurrentMainSelectionInputSchema, invalid)).toBe(false);
      expect(
        await standard(CurrentMainSelectionInputSchema)["~standard"].validate(invalid)
      ).toHaveProperty("issues");
    }
  });

  it("closes the eligible result around exactly the nine-field v3 selection", () => {
    const eligible = { kind: "CURRENT_ELIGIBLE", selection: recordFixture() };
    expect(Value.Check(CurrentMainSelectionResultSchema, eligible)).toBe(true);

    for (const invalid of [
      { ...eligible, currentMainDigest: `cm2_${"0".repeat(64)}` },
      {
        ...eligible,
        selection: {
          ...eligible.selection,
          releaseSetDigest: `rs1_${"0".repeat(64)}`,
        },
      },
      { ...eligible, selection: { ...eligible.selection, sourceRef: "refs/heads/main" } },
      { ...eligible, selection: { ...eligible.selection, projections: [] } },
      { kind: "ACCEPTED_PENDING_CONVERGENCE", reason: "legacy" },
    ]) {
      expect(Value.Check(CurrentMainSelectionResultSchema, invalid)).toBe(false);
    }
  });

  it("bounds public selection and codec diagnostics", () => {
    expect(
      Value.Check(CurrentMainSelectionResultSchema, {
        kind: "UNREACHABLE_REPOSITORY",
        reason: "r".repeat(MAX_CURRENT_MAIN_SELECTION_REASON_LENGTH),
      })
    ).toBe(true);
    expect(
      Value.Check(CurrentMainSelectionResultSchema, {
        kind: "UNREACHABLE_REPOSITORY",
        reason: "r".repeat(MAX_CURRENT_MAIN_SELECTION_REASON_LENGTH + 1),
      })
    ).toBe(false);

    const boundedFailure = {
      ok: false,
      failure: {
        code: "InvalidSchema",
        path: "p".repeat(MAX_CURRENT_MAIN_V3_CODEC_PATH_LENGTH),
        message: "m".repeat(MAX_CURRENT_MAIN_V3_CODEC_MESSAGE_LENGTH),
      },
    };
    expect(Value.Check(CurrentMainRecordResultSchema, boundedFailure)).toBe(true);
    expect(
      Value.Check(CurrentMainRecordResultSchema, {
        ...boundedFailure,
        failure: {
          ...boundedFailure.failure,
          path: "p".repeat(MAX_CURRENT_MAIN_V3_CODEC_PATH_LENGTH + 1),
        },
      })
    ).toBe(false);
  });
});

function recordFixture(): CanonicalChannelSelection {
  return {
    schemaVersion: 3,
    channel: "current-main",
    contentAuthority: mustParse(parseContentAuthority("rawr-hq")),
    sourceRepositoryIdentity: mustParse(parseRepositoryIdentity("git:github.com/rawr-ai/rawr-hq")),
    sourceRepositoryUrl: "https://github.com/rawr-ai/rawr-hq.git",
    sourceRef: "refs/tags/agent-plugins/current-main-input",
    contentCommit: mustParse(parseGitCommitId("a".repeat(40))),
    contentTree: mustParse(parseGitTreeId("b".repeat(40))),
    releaseInputDigest: mustParse(parseReleaseInputDigest(`ri1_${"c".repeat(64)}`)),
  };
}

function mustParse<T>(
  result: { readonly ok: true; readonly value: T } | { readonly ok: false }
): T {
  if (!result.ok) throw new Error("Invalid current-main fixture value");
  return result.value;
}
