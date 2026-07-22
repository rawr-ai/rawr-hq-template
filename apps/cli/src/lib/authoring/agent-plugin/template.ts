import {
  type CompleteOrderedWritePlan,
  completeOrderedWritePlan,
  qualifiedTextWrite,
  type VerifiedDestinationRoot,
} from "../shared";
import type { CuratedAgentPluginAuthoringRequest } from "./request";

export function curatedAgentPluginWritePlan(
  root: VerifiedDestinationRoot,
  request: CuratedAgentPluginAuthoringRequest
): CompleteOrderedWritePlan {
  const base = `plugins/agents/${request.pluginId}`;
  return completeOrderedWritePlan(root, [
    qualifiedTextWrite(
      `${base}/package.json`,
      `${JSON.stringify(
        {
          name: `@rawr/plugin-${request.pluginId}`,
          private: true,
          type: "module",
          rawr: {
            kind: "agent",
            pluginContent: {
              version: 1,
            },
            capability: request.pluginId,
          },
        },
        null,
        2
      )}\n`
    ),
    qualifiedTextWrite(
      `${base}/agents/${request.pluginId}.md`,
      `# ${request.pluginId}\n\nCurated agent guidance for this content plugin.\n`
    ),
    qualifiedTextWrite(
      `${base}/evaluation/policy.json`,
      `${JSON.stringify(
        {
          schemaVersion: 1,
          protocol: "rawr-agent-plugin-evaluation@v1",
          pluginId: request.pluginId,
          checks: [],
        },
        null,
        2
      )}\n`
    ),
    qualifiedTextWrite(
      `${base}/skills/${request.pluginId}/SKILL.md`,
      `---\nname: ${request.pluginId}\ndescription: Curated guidance for ${request.pluginId}.\n---\n\n# ${request.pluginId}\n\nAdd the skill instructions owned by this curated content plugin.\n`
    ),
    qualifiedTextWrite(
      `${base}/vendor/provenance.json`,
      `${JSON.stringify(
        {
          schemaVersion: 1,
          protocol: "rawr-agent-plugin-vendor-provenance@v1",
          pluginId: request.pluginId,
          sources: [],
        },
        null,
        2
      )}\n`
    ),
  ]);
}
