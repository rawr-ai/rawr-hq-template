import { defineNodeFilesystemRuntimeProvider } from "@habitat-ai/resource-filesystem/providers/effect-platform-node";
import { FilesystemRuntimeResource } from "@habitat-ai/resource-filesystem/runtime";
import { defineGritRuleEvaluationRuntimeProvider } from "@habitat-ai/resource-rule-evaluation/providers/grit-effect-platform-node/runtime";
import { RuleEvaluationRuntimeResource } from "@habitat-ai/resource-rule-evaluation/runtime";
import { defineGitSourceInventoryRuntimeProvider } from "@habitat-ai/resource-source-inventory/providers/git-effect-platform-node/runtime";
import { SourceInventoryRuntimeResource } from "@habitat-ai/resource-source-inventory/runtime";
import { defineRuntimeProfile, providerSelection } from "@habitat-ai/sdk/runtime/profiles";

export const localProfile = defineRuntimeProfile({
  id: "local",
  providers: [
    providerSelection({
      resource: FilesystemRuntimeResource,
      provider: defineNodeFilesystemRuntimeProvider(),
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
