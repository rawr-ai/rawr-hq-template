import { createCompleteSetArtifactRef } from "../../../../shared/release";
import type { GovernanceLifecycleRuntime } from "../../../governance/ports";
import { createResolveCurrentMain } from "../../../governance/internal";
import {
  CLAUDE_RENDERER_PROTOCOL,
  CODEX_RENDERER_PROTOCOL,
  parseAdapterProtocol,
  parseCapabilityProfileDigest,
  parseProjectionDigest,
} from "../domain/projection";
import { parseLifecycleRecordDigest } from "../domain/receipt";
import { failure, issue, success } from "../domain/result";
import type { CanonicalChannelReader } from "../ports/channel";

/** Composes governance truth into the provider channel inside the service boundary. */
export function createGovernedCanonicalChannelReader(
  governance: GovernanceLifecycleRuntime,
): CanonicalChannelReader {
  const resolveCurrentMain = createResolveCurrentMain(governance);
  const channel: CanonicalChannelReader = {
    async resolve(locator: Parameters<CanonicalChannelReader["resolve"]>[0]) {
      const resolution = await resolveCurrentMain({
        locator: {
          workspacePath: locator.workspaceRoot,
          expectedRepositoryIdentity: locator.repositoryIdentity,
        },
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
