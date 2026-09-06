import { defineRuntimeResource } from "@habitat-ai/sdk/runtime/resources";
import type { AgentPluginPackageOutputResource } from "./contract.js";

/** A cold process-lifetime capability; operations retain their own native scopes. */
export const AgentPluginPackageOutputRuntimeResource = defineRuntimeResource<
  "agent-plugin-package-output",
  AgentPluginPackageOutputResource<never>
>({
  id: "agent-plugin-package-output",
  title: "Agent plugin package output",
  purpose: "Deterministic archive encoding and bounded publication",
  defaultLifetime: "process",
  allowedLifetimes: ["process"],
});
