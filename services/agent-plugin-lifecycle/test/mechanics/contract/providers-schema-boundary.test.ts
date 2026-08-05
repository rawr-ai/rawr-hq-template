import { getProcedureMetadata } from "@habitat-ai/rawr-hq-sdk";
import { standard } from "@habitat-ai/typebox-adapter";
import type { InferRouterContractInputs, InferRouterContractOutputs } from "@orpc/contract";
import type { Static, TSchema } from "typebox";
import { Value } from "typebox/value";
import { describe, expect, expectTypeOf, it } from "vitest";
import { contract as serviceContract } from "../../../src/service/contract";
import { contract } from "../../../src/service/modules/providers/contract";
import {
  type ProviderMutationTargetResult,
  ProviderMutationTargetResultSchema,
  ProviderStatusRequestSchema,
  ProviderStatusResultSchema,
  ProviderSyncRequestSchema,
  ProviderSyncResultSchema,
  ProviderTargetsSchema,
  ProviderTestRequestSchema,
  ProviderTestResultSchema,
  SelectedContentObservationSchema,
} from "../../../src/service/modules/providers/model/dto/provider-lifecycle";
import { mutationClassification } from "../../../src/service/modules/providers/model/policy/operation-result";
import {
  channelRequest,
  createProviderLifecycleClient,
  FakeNativeProviders,
  fakeNativeSession,
  selectedContent,
  testRequest,
} from "../../support/modules/providers/fixture";
import { testInvocation } from "../../support/service/client";

describe("provider public schema boundary", () => {
  it("derives every public provider contract type from its TypeBox schema", () => {
    type ContractInputs = InferRouterContractInputs<typeof contract>;
    type ContractOutputs = InferRouterContractOutputs<typeof contract>;

    expectTypeOf<ContractInputs["test"]>().toEqualTypeOf<
      Static<typeof ProviderTestRequestSchema>
    >();
    expectTypeOf<ContractOutputs["test"]>().toEqualTypeOf<
      Static<typeof ProviderTestResultSchema>
    >();
    expectTypeOf<ContractInputs["status"]>().toEqualTypeOf<
      Static<typeof ProviderStatusRequestSchema>
    >();
    expectTypeOf<ContractOutputs["status"]>().toEqualTypeOf<
      Static<typeof ProviderStatusResultSchema>
    >();
    expectTypeOf<ContractInputs["sync"]>().toEqualTypeOf<
      Static<typeof ProviderSyncRequestSchema>
    >();
    expectTypeOf<ContractOutputs["sync"]>().toEqualTypeOf<
      Static<typeof ProviderSyncResultSchema>
    >();
  });

  it("inherits service metadata and keeps provider overrides local", () => {
    const expectedMetadata = {
      test: {
        idempotent: true,
        domain: "agent-plugin-lifecycle",
        audience: "internal",
        audit: "full",
        entity: "providers",
      },
      status: {
        idempotent: true,
        domain: "agent-plugin-lifecycle",
        audience: "internal",
        audit: "basic",
        entity: "providers",
      },
      sync: {
        idempotent: true,
        domain: "agent-plugin-lifecycle",
        audience: "internal",
        audit: "full",
        entity: "providers",
      },
    } as const;
    const expectedOverrides = {
      test: { idempotent: true, audit: "full", entity: "providers" },
      status: { idempotent: true, entity: "providers" },
      sync: { idempotent: true, audit: "full", entity: "providers" },
    } as const;

    for (const operation of ["test", "status", "sync"] as const) {
      expect(getProcedureMetadata(contract[operation])).toEqual(expectedOverrides[operation]);
      expect(getProcedureMetadata(serviceContract.providers[operation])).toEqual(
        expectedMetadata[operation]
      );
    }
  });

  it("admits only closed requests with structurally distinct provider targets", () => {
    expect(Value.Check(ProviderStatusRequestSchema, channelRequest)).toBe(true);
    expect(Value.Check(ProviderSyncRequestSchema, channelRequest)).toBe(true);
    expect(Value.Check(ProviderTestRequestSchema, testRequest)).toBe(true);
    expect(
      Value.Check(ProviderTestRequestSchema, {
        ...testRequest,
        targets: [{ provider: "codex", home: testRequest.disposableRoot }],
      })
    ).toBe(true);
    expect(
      Value.Check(ProviderTestRequestSchema, {
        ...testRequest,
        targets: [{ provider: "codex", home: "/tmp/rawr-provider-test-sibling/codex-home" }],
      })
    ).toBe(true);
    expect(
      Value.Check(ProviderTestRequestSchema, {
        ...testRequest,
        targets: [
          {
            provider: "codex",
            home: `${testRequest.disposableRoot}/nested/../codex-home`,
          },
        ],
      })
    ).toBe(true);
    expect(
      Value.Check(ProviderTestRequestSchema, {
        ...testRequest,
        disposableRoot: "/",
      })
    ).toBe(false);
    expect(
      Value.Check(ProviderStatusRequestSchema, { ...channelRequest, artifact: "ar1_dead" })
    ).toBe(false);
    expect(
      Value.Check(ProviderTargetsSchema, [
        { provider: "codex", home: "/tmp/home" },
        { provider: "codex", home: "/tmp/home" },
      ])
    ).toBe(false);
    expect(Value.Check(ProviderTargetsSchema, [{ provider: "codex", home: "/" }])).toBe(false);
  });

  it("publishes provider-home structure without losing noncanonical-path rejection", () => {
    const request = {
      ...testRequest,
      targets: [
        {
          provider: "codex" as const,
          home: "relative/provider-home",
        },
      ],
    };
    const projected = standard(ProviderTestRequestSchema)["~standard"].jsonSchema.input({
      target: "draft-2020-12",
    });
    const published = JSON.parse(JSON.stringify(projected)) as TSchema;

    expect(Value.Check(ProviderTestRequestSchema, request)).toBe(false);
    expect(Value.Check(published, request)).toBe(false);
  });

  it("rejects semantic provider-home policy at every Provider procedure boundary", async () => {
    const content = selectedContent();
    const { client, resourceCalls } = createProviderLifecycleClient(
      content,
      new FakeNativeProviders([])
    );
    const noncanonicalHome = `${testRequest.disposableRoot}/nested/../codex-home`;

    for (const { home, message } of [
      {
        home: testRequest.disposableRoot,
        message: "Every provider test home must be a strict descendant of the disposable root",
      },
      {
        home: "/tmp/rawr-provider-test-sibling/codex-home",
        message: "Every provider test home must be a strict descendant of the disposable root",
      },
      {
        home: noncanonicalHome,
        message: "Expected a canonical non-root absolute path",
      },
    ]) {
      await expect(
        client.providers.test(
          { ...testRequest, targets: [{ provider: "codex", home }] },
          testInvocation
        )
      ).rejects.toMatchObject({ code: "BAD_REQUEST", message });
    }
    const channelWithNoncanonicalHome = {
      ...channelRequest,
      targets: [{ provider: "codex" as const, home: noncanonicalHome }],
    };
    await expect(
      client.providers.status(channelWithNoncanonicalHome, testInvocation)
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "Expected a canonical non-root absolute path",
    });
    await expect(
      client.providers.sync(channelWithNoncanonicalHome, testInvocation)
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "Expected a canonical non-root absolute path",
    });
    expect(resourceCalls).toEqual([]);
  });

  it("validates a complete finite public status result from the handler", async () => {
    const content = selectedContent();
    const session = fakeNativeSession({
      target: channelRequest.targets[0],
      content,
      installed: ["cognition"],
    });
    const { client } = createProviderLifecycleClient(content, new FakeNativeProviders([session]));
    const result = await client.providers.status(channelRequest, testInvocation);
    expect(Value.Check(ProviderStatusResultSchema, result)).toBe(true);
    expect(Value.Check(ProviderStatusResultSchema, { ...result, plan: [] })).toBe(false);
    expect(
      Value.Check(ProviderStatusResultSchema, {
        ...result,
        targets: result.targets.map((target) => ({ ...target, classification: "Changed" })),
      })
    ).toBe(false);
    expect(
      Value.Check(ProviderStatusResultSchema, {
        ...result,
        targets: result.targets.map((target) => ({
          ...target,
          operations: [{ kind: "plugin-installed", selector: "cognition@rawr-hq" }],
        })),
      })
    ).toBe(false);
    expect(result).not.toHaveProperty("receipt");
    expect(result).not.toHaveProperty("projection");
    expect(result).not.toHaveProperty("evidence");
  });

  it("validates the disposable-test result and rejects surplus public fields", async () => {
    const content = selectedContent();
    const session = fakeNativeSession({
      target: testRequest.targets[0],
      content,
      installed: ["cognition"],
    });
    const { client } = createProviderLifecycleClient(content, new FakeNativeProviders([session]));

    const result = await client.providers.test(testRequest, testInvocation);

    expect(Value.Check(ProviderTestResultSchema, result)).toBe(true);
    expect(Value.Check(ProviderTestResultSchema, { ...result, unexpected: true })).toBe(false);
  });

  it("keeps possible mutation histories in Provider result policy", () => {
    const operation = { kind: "plugin-installed", selector: "cognition@rawr-hq" } as const;
    const base = {
      target: channelRequest.targets[0],
      facts: [],
      issues: [],
    };
    expect(
      Value.Check(ProviderMutationTargetResultSchema, {
        ...base,
        classification: "Converged",
        operations: [],
      })
    ).toBe(true);
    expect(
      Value.Check(ProviderMutationTargetResultSchema, {
        ...base,
        classification: "Changed",
        operations: [operation],
      })
    ).toBe(true);
    expect(
      Value.Check(ProviderMutationTargetResultSchema, {
        ...base,
        classification: "Drifted",
        operations: [],
      })
    ).toBe(false);
    for (const candidate of [
      { ...base, classification: "Changed", operations: [] },
      { ...base, classification: "Converged", operations: [operation] },
      { ...base, classification: "Blocked", operations: [operation] },
      { ...base, classification: "NotAttempted", operations: [operation] },
    ]) {
      expect(Value.Check(ProviderMutationTargetResultSchema, candidate)).toBe(true);
    }
    const impossibleCandidates: readonly ProviderMutationTargetResult[] = [
      { ...base, classification: "Changed", operations: [] },
      { ...base, classification: "Converged", operations: [operation] },
      { ...base, classification: "Blocked", operations: [operation] },
      { ...base, classification: "NotAttempted", operations: [operation] },
    ];
    for (const candidate of impossibleCandidates) {
      expect(() => mutationClassification([candidate])).toThrow(
        "impossible confirmed-operation history"
      );
    }
  });

  it("admits the release-owned member bound beyond the retired 256-member limit", () => {
    const pluginIds = Array.from(
      { length: 257 },
      (_, index) => `plugin-${index.toString().padStart(3, "0")}`
    );
    expect(
      Value.Check(ProviderTestRequestSchema, {
        ...testRequest,
        mode: { kind: "targeted", pluginIds },
      })
    ).toBe(true);

    const content = selectedContent();
    expect(
      Value.Check(SelectedContentObservationSchema, {
        repositoryIdentity: content.repositoryIdentity,
        sourceCommit: content.sourceCommit,
        sourceTree: content.sourceTree,
        releaseInputDigest: content.releaseInputDigest,
        releaseSetDigest: content.releaseSetDigest,
        pluginIds,
      })
    ).toBe(true);
  });
});
