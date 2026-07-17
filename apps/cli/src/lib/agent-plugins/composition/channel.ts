import { createCompleteSetArtifactRef } from "@rawr/agent-plugin-release";
import type {
  CurrentMainResolution,
  ResolveCurrentMainInput,
} from "@rawr/agent-plugin-promotion";
import {
  CLAUDE_RENDERER_PROTOCOL,
  CODEX_RENDERER_PROTOCOL,
  parseAdapterProtocol,
  parseCapabilityProfileDigest,
  parseLifecycleRecordDigest,
  parseProjectionDigest,
  type CanonicalChannelReader,
  type CanonicalChannelResolution,
  type DeploymentResult,
  type ProviderDeploymentIssue,
} from "@rawr/agent-provider-deployment";

export type CurrentMainResolver = (
  input: ResolveCurrentMainInput,
) => Promise<CurrentMainResolution>;

export function createPromotionCanonicalChannelReader(
  resolveCurrentMain: CurrentMainResolver,
): CanonicalChannelReader {
  const adapter: CanonicalChannelReader = {
    async resolve(locator) {
      const resolution = await resolveCurrentMain({
        locator: {
          workspacePath: locator.workspaceRoot,
          expectedRepositoryIdentity: locator.repositoryIdentity,
        },
      });
      if (resolution.kind === "CONTENT_AHEAD_OF_ACCEPTANCE") {
        return success({ kind: "content-ahead-of-acceptance" });
      }
      if (resolution.kind === "BLOCKED_ACCEPTANCE_AUTHORITY") {
        return success({ kind: "blocked-acceptance-authority" });
      }
      if (
        resolution.kind !== "CURRENT_ELIGIBLE"
        && resolution.kind !== "ACCEPTED_PENDING_CONVERGENCE"
      ) {
        return channelFailure(`${resolution.kind}: ${resolution.reason}`);
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
          ? "current-eligible"
          : "accepted-pending-convergence",
        releaseSet: createCompleteSetArtifactRef(observation.record.body.releaseSetDigest),
        acceptanceDigest: acceptanceDigest.value,
        promotionDigest: promotionDigest.value,
        projections: Object.freeze(projections),
      }));
    },
  };
  return Object.freeze(adapter);
}

function success<T extends CanonicalChannelResolution>(value: T): DeploymentResult<T> {
  return Object.freeze({ ok: true, value });
}

function channelFailure(message: string): DeploymentResult<CanonicalChannelResolution> {
  const issue: ProviderDeploymentIssue = Object.freeze({
    code: "CHANNEL_NOT_ELIGIBLE",
    path: "channel.current-main",
    message,
    expected: "governed current-main",
    actual: "unavailable",
  });
  const issues: readonly [ProviderDeploymentIssue] = Object.freeze([issue]);
  return Object.freeze({ ok: false, issues });
}
