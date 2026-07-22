import { schema } from "@rawr/hq-sdk";
import { describe, expect, expectTypeOf, it } from "vitest";
import type { Static } from "typebox";
import { Value } from "typebox/value";

import {
  CurrentMainRecordInputSchema,
  CurrentMainRecordResultSchema,
  CurrentMainSelectionInputSchema,
  CurrentMainSelectionResultSchema,
} from "../../../src/service/modules/governance/schemas";
import {
  encodeCurrentMainBodyV2,
  type CurrentMainBodyV2,
} from "../../../src/service/modules/governance/model";
import {
  CanonicalChannelSelectionSchema,
  type CanonicalChannelSelection,
  type CurrentMainSelectionResult,
} from "../../../src/service/model/dto/current-main-selection";
import { contract } from "../../../src/service/modules/governance/contract";

describe("governance procedure schema boundary", () => {
  it("keeps neutral selection observations exact with governance schemas", () => {
    type SelectionSchema = Readonly<Static<typeof CanonicalChannelSelectionSchema>>;
    type ResultSchema = Readonly<Static<typeof CurrentMainSelectionResultSchema>>;
    type Equal<TLeft, TRight> =
      (<T>() => T extends TLeft ? 1 : 2) extends
      (<T>() => T extends TRight ? 1 : 2)
        ? (<T>() => T extends TRight ? 1 : 2) extends
          (<T>() => T extends TLeft ? 1 : 2)
          ? true
          : false
        : false;
    type Assert<TValue extends true> = TValue;
    type ExactObject<TLeft, TRight> = Equal<keyof TLeft, keyof TRight> extends true
      ? {
        [TKey in keyof TLeft]: TKey extends keyof TRight
          ? Equal<TLeft[TKey], TRight[TKey]>
          : false;
      }[keyof TLeft] extends true
        ? true
        : false
      : false;
    type SelectionParity = Assert<Equal<CanonicalChannelSelection, SelectionSchema>>;
    type ResultKindParity = Assert<Equal<
      CurrentMainSelectionResult["kind"],
      ResultSchema["kind"]
    >>;
    type ResultBranchParity<TKind extends CurrentMainSelectionResult["kind"]> = ExactObject<
      Extract<CurrentMainSelectionResult, { kind: TKind }>,
      Extract<ResultSchema, { kind: TKind }>
    >;
    type EligibleParity = Assert<ResultBranchParity<"CURRENT_ELIGIBLE">>;
    type DirtyParity = Assert<ResultBranchParity<"DIRTY_REPOSITORY">>;
    type WrongParity = Assert<ResultBranchParity<"WRONG_REPOSITORY">>;
    type UnreachableParity = Assert<ResultBranchParity<"UNREACHABLE_REPOSITORY">>;
    type StaleParity = Assert<ResultBranchParity<"STALE_RECORD">>;
    type ForgedParity = Assert<ResultBranchParity<"FORGED_RECORD">>;

    expectTypeOf<SelectionParity>().toEqualTypeOf<true>();
    expectTypeOf<ResultKindParity>().toEqualTypeOf<true>();
    expectTypeOf<EligibleParity>().toEqualTypeOf<true>();
    expectTypeOf<DirtyParity>().toEqualTypeOf<true>();
    expectTypeOf<WrongParity>().toEqualTypeOf<true>();
    expectTypeOf<UnreachableParity>().toEqualTypeOf<true>();
    expectTypeOf<StaleParity>().toEqualTypeOf<true>();
    expectTypeOf<ForgedParity>().toEqualTypeOf<true>();
  });

  it("exposes only the v2 record codec and current-main selector", () => {
    expect(Object.keys(contract).sort()).toEqual([
      "currentMainRecord",
      "currentMainSelection",
    ]);
  });

  it("closes both current-main codec actions", () => {
    const body = currentMainBodyFixture();
    const encoded = encodeCurrentMainBodyV2(body);
    expect(encoded.ok).toBe(true);
    if (!encoded.ok) throw new Error(encoded.failure.message);

    expect(Value.Check(CurrentMainRecordInputSchema, {
      kind: "encode-body",
      body,
    })).toBe(true);
    expect(Value.Check(CurrentMainRecordInputSchema, {
      kind: "validate-envelope",
      bytes: encoded.value.bytes,
    })).toBe(true);

    for (const invalid of [
      { kind: "encode-body", body, bytes: encoded.value.bytes },
      { kind: "encode-body", body, ambientAuthority: true },
      { kind: "encode-body", body: { ...body, approver: "person" } },
      { kind: "encode-body", body: { ...body, schemaVersion: 1 } },
      { kind: "validate-envelope", bytes: encoded.value.bytes, body },
    ]) {
      expect(Value.Check(CurrentMainRecordInputSchema, invalid)).toBe(false);
    }

    expect(Value.Check(CurrentMainRecordResultSchema, encoded)).toBe(true);
    expect(Value.Check(CurrentMainRecordResultSchema, {
      ...encoded,
      value: { ...encoded.value, receipt: "state" },
    })).toBe(false);
  });

  it("accepts only the v2 locator request for current-main selection", async () => {
    const locator = {
      workspacePath: "/tmp/personal-rawr-hq",
      expectedRepositoryIdentity: "git:github.com/example/personal-rawr-hq",
    };
    expect(Value.Check(CurrentMainSelectionInputSchema, { locator })).toBe(true);

    const v1Pointer = {
      repositoryIdentity: locator.expectedRepositoryIdentity,
      ref: "refs/heads/main",
      commit: "a".repeat(40),
      tree: "b".repeat(40),
      path: "plugins/agents/.lifecycle/policy.json",
      blob: "c".repeat(40),
    };
    const invalid = [
      { locator, policyObject: v1Pointer },
      {
        locator,
        policyObject: v1Pointer,
        requestObject: v1Pointer,
        acceptanceObject: v1Pointer,
      },
      { locator: { ...locator, canonicalRef: "refs/heads/main" } },
      { workspacePath: locator.workspacePath, expectedRepositoryIdentity: locator.expectedRepositoryIdentity },
    ];

    for (const candidate of invalid) {
      expect(Value.Check(CurrentMainSelectionInputSchema, candidate)).toBe(false);
      const validated = await schema(CurrentMainSelectionInputSchema)["~standard"].validate(candidate);
      expect("issues" in validated).toBe(true);
    }
  });

  it("closes eligible and refused current-main selection results", () => {
    const eligible = {
      kind: "CURRENT_ELIGIBLE",
      selection: {
        currentMainDigest: `cm2_${"0".repeat(64)}`,
        contentAuthority: "personal-rawr-hq",
        sourceRepositoryIdentity: "git:github.com/example/personal-rawr-hq",
        sourceCommit: "a".repeat(40),
        sourceTree: "b".repeat(40),
        releaseInputDigest: `ri1_${"c".repeat(64)}`,
        releaseSetDigest: `rs1_${"d".repeat(64)}`,
        evaluationProfile: "provider-smoke@v1",
        projections: currentMainBodyFixture().projections,
      },
    };

    expect(Value.Check(CurrentMainSelectionResultSchema, eligible)).toBe(true);
    expect(Value.Check(CurrentMainSelectionResultSchema, {
      kind: "STALE_RECORD",
      reason: "selected source is unavailable",
    })).toBe(true);
    expect(Value.Check(CurrentMainSelectionResultSchema, {
      ...eligible,
      observation: { legacy: true },
    })).toBe(false);
    expect(Value.Check(CurrentMainSelectionResultSchema, {
      kind: "ACCEPTED_PENDING_CONVERGENCE",
      reason: "legacy state",
    })).toBe(false);
  });
});

function currentMainBodyFixture(): CurrentMainBodyV2 {
  return {
    schemaVersion: 2,
    channel: "current-main",
    contentAuthority: "rawr-hq",
    sourceRepositoryIdentity: "git:github.com/rawr-ai/rawr-hq",
    sourceCommit: "a".repeat(40),
    sourceTree: "b".repeat(40),
    releaseInputDigest: `ri1_${"c".repeat(64)}`,
    releaseSetDigest: `rs1_${"d".repeat(64)}`,
    evaluationProfile: "provider-smoke@v1",
    projections: [
      {
        provider: "claude",
        projectionDigest: `ap1_${"e".repeat(64)}`,
        rendererProtocol: "claude-projection@v1",
        adapterProtocol: "claude-native-adapter@v1",
        capabilityProfileDigest: `cp1_${"f".repeat(64)}`,
      },
      {
        provider: "codex",
        projectionDigest: `ap1_${"1".repeat(64)}`,
        rendererProtocol: "codex-projection@v1",
        adapterProtocol: "codex-native-adapter@v1",
        capabilityProfileDigest: `cp1_${"2".repeat(64)}`,
      },
    ],
  };
}
