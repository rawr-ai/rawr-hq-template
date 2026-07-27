import type { AgentPluginRelease } from "../dto/agent-plugin-release";
import type {
  ReleaseDerivationFailure,
  ReleaseDerivationResult,
  ReleaseDerivationSelection,
  ReleaseDerivationSource,
} from "../dto/release-derivation";
import { createAgentPluginRelease } from "./agent-plugin-release";
import { createAgentPluginReleaseSet } from "./agent-plugin-release-set";
import { compareCanonicalText } from "./canonical-text-ordering";

/**
 * Constructs the selected in-memory release values from one exact content
 * snapshot. The policy reports neutral construction detail so each consuming
 * module retains ownership of its public failure and success shapes.
 */
export function deriveReleaseSelection(
  source: ReleaseDerivationSource,
  mode: ReleaseDerivationSelection
): ReleaseDerivationResult {
  const requested =
    mode.kind === "complete-set"
      ? source.releaseInput.body.members.map((member) => member.pluginId)
      : mode.kind === "targeted"
        ? [mode.pluginId]
        : [...mode.pluginIds];
  requested.sort(compareCanonicalText);
  if (requested.length === 0 || new Set(requested).size !== requested.length) {
    return failed({
      reason: "InvalidSelection",
      detail: "selected plugin identities are empty or duplicated",
    });
  }

  const declared = new Set(source.releaseInput.body.members.map((member) => member.pluginId));
  const absent = requested.find((pluginId) => !declared.has(pluginId));
  if (absent !== undefined) {
    return failed({
      reason: "UndeclaredMember",
      pluginId: absent,
      detail: "selected plugin is not declared by the release input",
    });
  }
  const payloadByPlugin = new Map(
    source.payloads.map((entry) => [entry.pluginId, entry.payload] as const)
  );
  const releases: AgentPluginRelease[] = [];
  for (const pluginId of requested) {
    const payload = payloadByPlugin.get(pluginId);
    if (payload === undefined) {
      return failed({
        reason: "MissingPayload",
        pluginId,
        detail: `verified payload is absent for ${pluginId}`,
      });
    }
    const constructed = createAgentPluginRelease({
      releaseInput: source.releaseInput,
      pluginId,
      source: {
        sourceRepository: source.repositoryIdentity,
        sourceCommit: source.sourceCommit,
        sourceTree: source.sourceTree,
      },
      payload,
    });
    if (!constructed.ok) {
      const issueCodes = Object.freeze(constructed.issues.map((issue) => issue.code));
      return failed({
        reason: "InvalidRelease",
        pluginId,
        issueCodes,
        detail: issueCodes.join(","),
      });
    }
    releases.push(constructed.value);
  }

  if (mode.kind !== "complete-set") {
    return {
      ok: true,
      value: Object.freeze({
        releases: Object.freeze(releases),
      }),
    };
  }

  const set = createAgentPluginReleaseSet({ releaseInput: source.releaseInput, releases });
  if (!set.ok) {
    const issueCodes = Object.freeze(set.issues.map((issue) => issue.code));
    return failed({
      reason: "InvalidReleaseSet",
      issueCodes,
      detail: issueCodes.join(","),
    });
  }
  return {
    ok: true,
    value: Object.freeze({
      releases: Object.freeze(releases),
      releaseSet: set.value,
    }),
  };
}

function failed(
  failure: ReleaseDerivationFailure
): Extract<ReleaseDerivationResult, { ok: false }> {
  return Object.freeze({ ok: false, failure });
}
