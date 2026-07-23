import { schema } from "@rawr/hq-sdk";
import { type Static } from "typebox";
import { Value } from "typebox/value";
import { describe, expect, expectTypeOf, it } from "vitest";

import {
  type CanonicalChannelSelection,
  CanonicalChannelSelectionSchema,
  type CurrentMainBodyV3,
  CurrentMainBodyV3Schema,
  type CurrentMainSelectionResult,
  MAX_CURRENT_MAIN_SELECTION_REASON_LENGTH,
  MAX_CURRENT_MAIN_V3_CODEC_MESSAGE_LENGTH,
  MAX_CURRENT_MAIN_V3_CODEC_PATH_LENGTH,
  encodeCurrentMainBodyV3,
} from "../../../src/service/modules/governance/model";
import { contract } from "../../../src/service/modules/governance/contract";
import {
  CurrentMainRecordInputSchema,
  CurrentMainRecordResultSchema,
  CurrentMainSelectionInputSchema,
  CurrentMainSelectionResultSchema,
} from "../../../src/service/modules/governance/schemas";
import {
  parseContentAuthority,
  parseGitCommitId,
  parseGitTreeId,
  parseRepositoryIdentity,
} from "../../../src/service/shared/release";

describe("governance procedure schema boundary", () => {
  it("derives the public selection and result types from TypeBox", () => {
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
  });

  it("exposes only the v3 record codec and current-main selector", () => {
    expect(Object.keys(contract).sort()).toEqual(["currentMainRecord", "currentMainSelection"]);
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
        await schema(CurrentMainRecordInputSchema)["~standard"].validate(invalid)
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
        await schema(CurrentMainSelectionInputSchema)["~standard"].validate(invalid)
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

function recordFixture(): CurrentMainBodyV3 {
  return {
    schemaVersion: 3,
    channel: "current-main",
    contentAuthority: mustParse(parseContentAuthority("rawr-hq")),
    sourceRepositoryIdentity: mustParse(
      parseRepositoryIdentity("git:github.com/rawr-ai/rawr-hq")
    ),
    sourceRepositoryUrl: "https://github.com/rawr-ai/rawr-hq.git",
    sourceRef: "refs/tags/agent-plugins/current-main-input",
    contentCommit: mustParse(parseGitCommitId("a".repeat(40))),
    contentTree: mustParse(parseGitTreeId("b".repeat(40))),
    releaseInputDigest: `ri1_${"c".repeat(64)}`,
  };
}

function mustParse<T>(result: { readonly ok: true; readonly value: T } | { readonly ok: false }): T {
  if (!result.ok) throw new Error("Invalid current-main fixture value");
  return result.value;
}

expectTypeOf<Static<typeof CurrentMainBodyV3Schema>>().toEqualTypeOf<CurrentMainBodyV3>();
