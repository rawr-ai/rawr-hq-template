import {
  createCompleteSetArtifactRef,
  type ReleaseSetDigest,
} from "../../service/shared/release";
import {
  CLAUDE_RENDERER_PROTOCOL,
  CODEX_RENDERER_PROTOCOL,
  parseAdapterProtocol,
  parseCapabilityProfileDigest,
  parseProjectionDigest,
} from "../../service/modules/providers/model/policy/projection";
import { parseLifecycleRecordDigest } from "../../service/modules/providers/model/policy/receipt";
import { failure, issue, success } from "../../service/modules/providers/model/errors/deployment-result";
import type { CanonicalChannelReader } from "../../service/modules/providers/ports/channel";

export interface CurrentMainChannelObservation {
  readonly acceptance: Readonly<{
    evidence: Readonly<{ acceptanceDigest: string }>;
  }>;
  readonly promotion: Readonly<{ attestationDigest: string }>;
  readonly record: Readonly<{
    body: Readonly<{
      releaseSetDigest: ReleaseSetDigest;
      projections: readonly Readonly<{
        provider: "claude" | "codex";
        adapterProtocol: string;
        capabilityProfileDigest: string;
        projectionDigest: string;
      }>[];
    }>;
  }>;
}

export type CurrentMainChannelResolution =
  | Readonly<{ kind: "CURRENT_ELIGIBLE"; observation: CurrentMainChannelObservation }>
  | Readonly<{ kind: "ACCEPTED_PENDING_CONVERGENCE"; observation: CurrentMainChannelObservation }>
  | Readonly<{ kind: "CONTENT_AHEAD_OF_ACCEPTANCE"; reason: string }>
  | Readonly<{ kind: "BLOCKED_ACCEPTANCE_AUTHORITY"; reason: string }>
  | Readonly<{
    kind:
      | "DIRTY_REPOSITORY"
      | "FORGED_RECORD"
      | "STALE_RECORD"
      | "UNREACHABLE_REPOSITORY"
      | "WRONG_REPOSITORY";
    reason: string;
  }>;

export interface CurrentMainChannelResolver {
  resolve(input: Readonly<{
    workspacePath: string;
    expectedRepositoryIdentity: string;
  }>): Promise<CurrentMainChannelResolution>;
}

/** Adapts one injected governance query without importing its implementation. */
export function createCanonicalChannelReader(
  currentMain: CurrentMainChannelResolver,
): CanonicalChannelReader {
  const channel: CanonicalChannelReader = {
    async resolve(locator: Parameters<CanonicalChannelReader["resolve"]>[0]) {
      const resolution = await currentMain.resolve({
        workspacePath: locator.workspaceRoot,
        expectedRepositoryIdentity: locator.repositoryIdentity,
      });
      if (resolution.kind === "CONTENT_AHEAD_OF_ACCEPTANCE") {
        return success(Object.freeze({ kind: "content-ahead-of-acceptance" as const }));
      }
      if (resolution.kind === "BLOCKED_ACCEPTANCE_AUTHORITY") {
        return success(Object.freeze({ kind: "blocked-acceptance-authority" as const }));
      }
      if (
        resolution.kind !== "CURRENT_ELIGIBLE"
        && resolution.kind !== "ACCEPTED_PENDING_CONVERGENCE"
      ) {
        return failure([issue(
          "CHANNEL_NOT_ELIGIBLE",
          "channel.current-main",
          `${resolution.kind}: ${resolution.reason}`,
        )]);
      }
      const observation = resolution.observation;
      const acceptanceDigest = parseLifecycleRecordDigest(
        observation.acceptance.evidence.acceptanceDigest,
        "channel.acceptanceDigest",
      );
      if (!acceptanceDigest.ok) return acceptanceDigest;
      const promotionDigest = parseLifecycleRecordDigest(
        observation.promotion.attestationDigest,
        "channel.promotionDigest",
      );
      if (!promotionDigest.ok) return promotionDigest;
      const projections = [];
      for (const [index, binding] of observation.record.body.projections.entries()) {
        const adapterProtocol = parseAdapterProtocol(
          binding.adapterProtocol,
          `channel.projections[${index}].adapterProtocol`,
        );
        if (!adapterProtocol.ok) return adapterProtocol;
        const capabilityProfileDigest = parseCapabilityProfileDigest(
          binding.capabilityProfileDigest,
          `channel.projections[${index}].capabilityProfileDigest`,
        );
        if (!capabilityProfileDigest.ok) return capabilityProfileDigest;
        const projectionDigest = parseProjectionDigest(
          binding.projectionDigest,
          `channel.projections[${index}].projectionDigest`,
        );
        if (!projectionDigest.ok) return projectionDigest;
        projections.push(Object.freeze({
          provider: binding.provider,
          rendererProtocol: binding.provider === "codex"
            ? CODEX_RENDERER_PROTOCOL
            : CLAUDE_RENDERER_PROTOCOL,
          adapterProtocol: adapterProtocol.value,
          capabilityProfileDigest: capabilityProfileDigest.value,
          projectionDigest: projectionDigest.value,
        }));
      }
      return success(Object.freeze({
        kind: resolution.kind === "CURRENT_ELIGIBLE"
          ? "current-eligible" as const
          : "accepted-pending-convergence" as const,
        releaseSet: createCompleteSetArtifactRef(observation.record.body.releaseSetDigest),
        acceptanceDigest: acceptanceDigest.value,
        promotionDigest: promotionDigest.value,
        projections: Object.freeze(projections),
      }));
    },
  };
  return Object.freeze(channel);
}
