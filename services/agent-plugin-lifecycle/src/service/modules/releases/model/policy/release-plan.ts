import type { ContentWorkspaceSnapshot } from "../../../../model/dto/releases/content-workspace";
import {
  type AgentPluginRelease,
  type AgentPluginReleaseSet,
  createAgentPluginRelease,
  createAgentPluginReleaseSet,
} from "../../../../shared/release";
import {
  type ReleaseCheckIssue,
  type ReleaseDerivationIdentity,
  type ReleaseSelection,
  releaseConstructionIssue,
} from "../dto/release-lifecycle";

export interface DerivedReleaseSelection {
  readonly releases: readonly AgentPluginRelease[];
  readonly releaseSet?: AgentPluginReleaseSet;
  readonly identity: ReleaseDerivationIdentity;
}

export function deriveReleaseSelection(
  snapshot: ContentWorkspaceSnapshot,
  mode: ReleaseSelection
):
  | { readonly ok: true; readonly value: DerivedReleaseSelection }
  | {
      readonly ok: false;
      readonly issues: readonly [ReleaseCheckIssue, ...ReleaseCheckIssue[]];
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
        identity: Object.freeze({
          kind: "release",
          pluginId: release.artifactBody.releaseBody.pluginId,
          releaseDigest: release.releaseDigest,
          artifactDigest: release.artifactDigest,
        }),
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
      identity: Object.freeze({
        kind: "complete-set",
        releaseSetDigest: set.value.releaseSetDigest,
        members: Object.freeze(
          set.value.body.members.map((member) =>
            Object.freeze({
              pluginId: member.pluginId,
              releaseDigest: member.releaseDigest,
              artifactDigest: member.artifactDigest,
            })
          )
        ),
      }),
    }),
  };
}

function constructionIssue(detail: string): ReleaseCheckIssue {
  return releaseConstructionIssue(detail);
}
