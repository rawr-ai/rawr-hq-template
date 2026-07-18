import { describe, expect, it } from "vitest";

import {
  createCanonicalChannelReader,
  type CanonicalChannelReader,
  type CurrentMainChannelObservation,
  type CurrentMainChannelResolution,
} from "../../../src/bindings/providers";
import {
  governedObservation,
  promotionFixture,
  REPOSITORY,
} from "../governance/fixtures";

const LOCATOR = {
  repositoryIdentity: REPOSITORY,
  workspaceRoot: "/tmp/personal-rawr-hq",
} as unknown as Parameters<CanonicalChannelReader["resolve"]>[0];

describe("canonical provider channel binding", () => {
  it.each([
    ["CURRENT_ELIGIBLE", "current-eligible"],
    ["ACCEPTED_PENDING_CONVERGENCE", "accepted-pending-convergence"],
  ] as const)("maps %s with exact accepted projection authority", async (kind, expectedKind) => {
    let forwarded: Parameters<Resolver["resolve"]>[0] | undefined;
    const observation = channelObservation();
    const reader = createCanonicalChannelReader({
      resolve: async (input) => {
        forwarded = input;
        return { kind, observation };
      },
    });

    const result = await reader.resolve(LOCATOR);

    expect(forwarded).toEqual({
      workspacePath: LOCATOR.workspaceRoot,
      expectedRepositoryIdentity: LOCATOR.repositoryIdentity,
    });
    expect(result).toMatchObject({
      ok: true,
      value: {
        kind: expectedKind,
        releaseSet: {
          kind: "complete-set",
          releaseSetDigest: observation.record.body.releaseSetDigest,
        },
        acceptanceDigest: observation.acceptance.evidence.acceptanceDigest,
        promotionDigest: observation.promotion.attestationDigest,
        projections: [
          { provider: "claude", rendererProtocol: "rawr-provider-renderer/claude@v1" },
          { provider: "codex", rendererProtocol: "rawr-provider-renderer/codex@v1" },
        ],
      },
    });
  });

  it.each([
    ["CONTENT_AHEAD_OF_ACCEPTANCE", "content-ahead-of-acceptance"],
    ["BLOCKED_ACCEPTANCE_AUTHORITY", "blocked-acceptance-authority"],
  ] as const)("preserves the non-eligible %s authority state", async (kind, expectedKind) => {
    const reader = createCanonicalChannelReader({
      resolve: async () => ({ kind, reason: "fixture authority state" }),
    });

    await expect(reader.resolve(LOCATOR)).resolves.toEqual({
      ok: true,
      value: { kind: expectedKind },
    });
  });

  it.each([
    "DIRTY_REPOSITORY",
    "FORGED_RECORD",
    "STALE_RECORD",
    "UNREACHABLE_REPOSITORY",
    "WRONG_REPOSITORY",
  ] as const)("fails closed for %s", async (kind) => {
    const reader = createCanonicalChannelReader({
      resolve: async () => ({ kind, reason: "fixture refusal" }),
    });

    const result = await reader.resolve(LOCATOR);

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected channel refusal");
    expect(result.issues[0]).toMatchObject({
      code: "CHANNEL_NOT_ELIGIBLE",
      path: "channel.current-main",
    });
  });

  it.each([
    ["acceptance digest", (observation: CurrentMainChannelObservation) => ({
      ...observation,
      acceptance: { evidence: { acceptanceDigest: "not-an-acceptance-digest" } },
    })],
    ["promotion digest", (observation: CurrentMainChannelObservation) => ({
      ...observation,
      promotion: { attestationDigest: "not-a-promotion-digest" },
    })],
    ["adapter protocol", (observation: CurrentMainChannelObservation) => withFirstProjection(
      observation,
      { adapterProtocol: "" },
    )],
    ["capability profile", (observation: CurrentMainChannelObservation) => withFirstProjection(
      observation,
      { capabilityProfileDigest: "not-a-capability-profile" },
    )],
    ["projection digest", (observation: CurrentMainChannelObservation) => withFirstProjection(
      observation,
      { projectionDigest: "not-a-projection-digest" },
    )],
  ] as const)("rejects a malformed %s binding", async (_name, mutate) => {
    const malformed = mutate(channelObservation()) as CurrentMainChannelObservation;
    const reader = createCanonicalChannelReader({
      resolve: async () => ({ kind: "CURRENT_ELIGIBLE", observation: malformed }),
    });

    const result = await reader.resolve(LOCATOR);

    expect(result.ok).toBe(false);
  });
});

type Resolver = Readonly<{
  resolve(input: Readonly<{
    workspacePath: string;
    expectedRepositoryIdentity: string;
  }>): Promise<CurrentMainChannelResolution>;
}>;

function channelObservation(): CurrentMainChannelObservation {
  const fixture = promotionFixture();
  return {
    acceptance: governedObservation(fixture),
    promotion: fixture.promotion,
    record: fixture.currentMain,
  };
}

function withFirstProjection(
  observation: CurrentMainChannelObservation,
  patch: Partial<CurrentMainChannelObservation["record"]["body"]["projections"][number]>,
): CurrentMainChannelObservation {
  const [first, ...rest] = observation.record.body.projections;
  if (first === undefined) throw new Error("Channel fixture requires one provider projection");
  return {
    ...observation,
    record: {
      body: {
        ...observation.record.body,
        projections: [{ ...first, ...patch }, ...rest],
      },
    },
  };
}
