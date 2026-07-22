import path from "node:path";

import {
  isCuratedAgentPluginIdentityIssue,
  parseCuratedAgentPluginIdentity,
  type CuratedAgentPluginIdentity,
  type CuratedAgentPluginIdentityIssue,
} from "./identity";

export type CuratedAgentPluginAuthoringRequest = Readonly<{
  pluginId: CuratedAgentPluginIdentity;
  contentWorkspace: string;
  dryRun: boolean;
}>;

export type CuratedAgentPluginRequestResult =
  | Readonly<{ ok: true; value: CuratedAgentPluginAuthoringRequest }>
  | Readonly<{
      ok: false;
      issues: readonly [CuratedAgentPluginIdentityIssue, ...CuratedAgentPluginIdentityIssue[]];
    }>;

export function parseCuratedAgentPluginAuthoringRequest(
  input: Readonly<{
    pluginId: unknown;
    contentWorkspace: unknown;
    dryRun: unknown;
  }>
): CuratedAgentPluginRequestResult {
  const pluginId = parseCuratedAgentPluginIdentity(input.pluginId);
  const issues: CuratedAgentPluginIdentityIssue[] = [];
  if (isCuratedAgentPluginIdentityIssue(pluginId)) issues.push(pluginId);
  if (typeof input.contentWorkspace !== "string" || input.contentWorkspace.length === 0) {
    issues.push(
      Object.freeze({
        path: "contentWorkspace",
        message: "An explicit content workspace is required",
      })
    );
  }
  if (issues.length > 0 || isCuratedAgentPluginIdentityIssue(pluginId)) {
    return Object.freeze({
      ok: false,
      issues: Object.freeze(issues) as readonly [
        CuratedAgentPluginIdentityIssue,
        ...CuratedAgentPluginIdentityIssue[],
      ],
    });
  }
  return Object.freeze({
    ok: true,
    value: Object.freeze({
      pluginId,
      contentWorkspace: path.resolve(input.contentWorkspace as string),
      dryRun: input.dryRun === true,
    }),
  });
}
