import {
  createAgentPluginRelease,
  createAgentPluginReleaseSet,
  createCompleteSetArtifactRef,
  createReleaseArtifactRef,
  type AgentPluginRelease,
  type AgentPluginReleaseSet,
  type ArtifactRef,
} from "../../../../shared/release";
import type { ContentWorkspaceSnapshot } from "../../../../model/dto/releases/content-workspace";
import {
  releaseConstructionBuildIssue,
  type BuildIssue,
  type BuildMode,
} from "../dto/release-lifecycle";

export interface ConstructedPlan {
  readonly releases: readonly AgentPluginRelease[];
  readonly releaseSet?: AgentPluginReleaseSet;
  readonly finalRef: ArtifactRef;
}

export function constructPlan(
  snapshot: ContentWorkspaceSnapshot,
  mode: BuildMode
):
  | { readonly ok: true; readonly value: ConstructedPlan }
  | {
      readonly ok: false;
      readonly issues: readonly [BuildIssue, ...BuildIssue[]];
    } {
  const members =
    mode.kind === "targeted"
      ? snapshot.releaseInput.body.members.filter((member) => member.pluginId === mode.pluginId)
      : snapshot.releaseInput.body.members;
  if (members.length === 0) {
    return {
      ok: false,
      issues: [constructionIssue("selected plugin is not declared by the release input")],
    };
  }
  const releases: AgentPluginRelease[] = [];
  for (const member of members) {
    const payload = snapshot.payloads.find((entry) => entry.pluginId === member.pluginId)?.payload;
    if (payload === undefined) {
      return {
        ok: false,
        issues: [constructionIssue(`verified payload is absent for ${member.pluginId}`)],
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
        issues: [constructionIssue(constructed.issues.map((issue) => issue.code).join(","))],
      };
    }
    releases.push(constructed.value);
  }
  if (mode.kind === "targeted") {
    const release = releases[0]!;
    return {
      ok: true,
      value: Object.freeze({
        releases: Object.freeze(releases),
        finalRef: createReleaseArtifactRef(release.releaseDigest, release.artifactDigest),
      }),
    };
  }
  const set = createAgentPluginReleaseSet({ releaseInput: snapshot.releaseInput, releases });
  if (!set.ok)
    return {
      ok: false,
      issues: [constructionIssue(set.issues.map((issue) => issue.code).join(","))],
    };
  return {
    ok: true,
    value: Object.freeze({
      releases: Object.freeze(releases),
      releaseSet: set.value,
      finalRef: createCompleteSetArtifactRef(set.value.releaseSetDigest),
    }),
  };
}

function constructionIssue(detail: string): BuildIssue {
  return releaseConstructionBuildIssue(detail);
}
