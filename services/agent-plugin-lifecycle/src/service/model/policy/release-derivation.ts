import { type AgentPluginRelease, createAgentPluginRelease } from "../../shared/release/release";
import { createAgentPluginReleaseSet } from "../../shared/release/release-set";
import type { DerivedReleaseSelection, ReleaseSelection } from "../dto/release-derivation";
import type { ContentWorkspaceSnapshot } from "../dto/releases/content-workspace";

type ReleaseDerivationResult =
  | { readonly ok: true; readonly value: DerivedReleaseSelection }
  | { readonly ok: false; readonly detail: string };

/**
 * Constructs the selected in-memory release artifacts from one exact content
 * snapshot. The policy reports neutral construction detail so each consuming
 * module retains ownership of its public failure and success shapes.
 */
export function deriveReleaseSelection(
  snapshot: ContentWorkspaceSnapshot,
  mode: ReleaseSelection
): ReleaseDerivationResult {
  const members =
    mode.kind === "targeted"
      ? snapshot.releaseInput.body.members.filter((member) => member.pluginId === mode.pluginId)
      : snapshot.releaseInput.body.members;
  if (members.length === 0) {
    return {
      ok: false,
      detail: "selected plugin is not declared by the release input",
    };
  }

  const releases: AgentPluginRelease[] = [];
  for (const member of members) {
    const payload = snapshot.payloads.find((entry) => entry.pluginId === member.pluginId)?.payload;
    if (payload === undefined) {
      return {
        ok: false,
        detail: `verified payload is absent for ${member.pluginId}`,
      };
    }
    const constructed = createAgentPluginRelease({
      releaseInput: snapshot.releaseInput,
      pluginId: member.pluginId,
      source: {
        sourceRepository: snapshot.repositoryIdentity,
        sourceCommit: snapshot.sourceCommit,
        sourceTree: snapshot.sourceTree,
      },
      payload,
    });
    if (!constructed.ok) {
      return {
        ok: false,
        detail: constructed.issues.map((issue) => issue.code).join(","),
      };
    }
    releases.push(constructed.value);
  }

  if (mode.kind === "targeted") {
    return {
      ok: true,
      value: Object.freeze({
        releases: Object.freeze(releases),
      }),
    };
  }

  const set = createAgentPluginReleaseSet({ releaseInput: snapshot.releaseInput, releases });
  if (!set.ok) {
    return {
      ok: false,
      detail: set.issues.map((issue) => issue.code).join(","),
    };
  }
  return {
    ok: true,
    value: Object.freeze({
      releases: Object.freeze(releases),
      releaseSet: set.value,
    }),
  };
}
