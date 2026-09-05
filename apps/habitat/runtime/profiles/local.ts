import { defineNodeAgentPluginPackageOutputRuntimeProvider } from "@habitat-ai/resource-agent-plugin-package-output/providers/cowork-v1-effect-platform-node/runtime";
import { AgentPluginPackageOutputRuntimeResource } from "@habitat-ai/resource-agent-plugin-package-output/runtime";
import { defineNodeChildProcessRuntimeProvider } from "@habitat-ai/resource-child-process/providers/effect-platform-node";
import { ChildProcessRuntimeResource } from "@habitat-ai/resource-child-process/runtime";
import { defineNodeContentWorkspaceRuntimeProvider } from "@habitat-ai/resource-content-workspace/providers/git-effect-platform-node/runtime";
import { ContentWorkspaceRuntimeResource } from "@habitat-ai/resource-content-workspace/runtime";
import { defineNodeFilesystemRuntimeProvider } from "@habitat-ai/resource-filesystem/providers/effect-platform-node";
import { FilesystemRuntimeResource } from "@habitat-ai/resource-filesystem/runtime";
import { defineNodeClaudeNativeAgentProviderRuntimeProvider } from "@habitat-ai/resource-native-agent-provider/providers/claude-effect-platform-node/runtime";
import { defineNodeCodexNativeAgentProviderRuntimeProvider } from "@habitat-ai/resource-native-agent-provider/providers/codex-effect-platform-node/runtime";
import {
  ClaudeNativeAgentProviderRuntimeResource,
  CodexNativeAgentProviderRuntimeResource,
} from "@habitat-ai/resource-native-agent-provider/runtime";
import { defineGritRuleEvaluationRuntimeProvider } from "@habitat-ai/resource-rule-evaluation/providers/grit-effect-platform-node/runtime";
import { RuleEvaluationRuntimeResource } from "@habitat-ai/resource-rule-evaluation/runtime";
import { defineGitSourceInventoryRuntimeProvider } from "@habitat-ai/resource-source-inventory/providers/git-effect-platform-node/runtime";
import { SourceInventoryRuntimeResource } from "@habitat-ai/resource-source-inventory/runtime";
import { defineNodeVersionedContentRuntimeProvider } from "@habitat-ai/resource-versioned-content/providers/git-effect-platform-node/runtime";
import { VersionedContentRuntimeResource } from "@habitat-ai/resource-versioned-content/runtime";
import { defineRuntimeProfile, providerSelection } from "@habitat-ai/sdk/runtime/profiles";
import {
  defineOpenTelemetryNodeRuntimeProvider,
  TelemetryRuntimeResource,
} from "@habitat-ai/sdk/telemetry";

export const localProfile = defineRuntimeProfile({
  id: "local",
  providers: [
    providerSelection({
      resource: TelemetryRuntimeResource,
      provider: defineOpenTelemetryNodeRuntimeProvider({
        releaseDeadline: () => ({ deadlineMonotonicMilliseconds: performance.now() + 5_000 }),
      }),
      config: { kind: "runtime.config", key: "habitat.telemetry" },
    }),
    providerSelection({
      resource: ContentWorkspaceRuntimeResource,
      provider: defineNodeContentWorkspaceRuntimeProvider(),
    }),
    providerSelection({
      resource: AgentPluginPackageOutputRuntimeResource,
      provider: defineNodeAgentPluginPackageOutputRuntimeProvider(),
    }),
    providerSelection({
      resource: VersionedContentRuntimeResource,
      provider: defineNodeVersionedContentRuntimeProvider(),
    }),
    providerSelection({
      resource: CodexNativeAgentProviderRuntimeResource,
      provider: defineNodeCodexNativeAgentProviderRuntimeProvider(),
    }),
    providerSelection({
      resource: ClaudeNativeAgentProviderRuntimeResource,
      provider: defineNodeClaudeNativeAgentProviderRuntimeProvider(),
    }),
    providerSelection({
      resource: FilesystemRuntimeResource,
      provider: defineNodeFilesystemRuntimeProvider(),
    }),
    providerSelection({
      resource: ChildProcessRuntimeResource,
      provider: defineNodeChildProcessRuntimeProvider(),
    }),
    providerSelection({
      resource: SourceInventoryRuntimeResource,
      provider: defineGitSourceInventoryRuntimeProvider(),
      config: { kind: "runtime.config", key: "habitat.source-inventory" },
    }),
    providerSelection({
      resource: RuleEvaluationRuntimeResource,
      provider: defineGritRuleEvaluationRuntimeProvider(),
      config: { kind: "runtime.config", key: "habitat.rule-evaluation" },
    }),
  ],
  configSources: [{ kind: "memory" }],
  harnesses: ["habitat.oclif"],
});
