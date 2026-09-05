import { defineRuntimeResource } from "@habitat-ai/sdk/runtime/resources";
import type { NativeAgentProviderResources } from "./contract.js";

/** A cold process-lifetime capability; operations retain their own native scopes. */
export const CodexNativeAgentProviderRuntimeResource = defineRuntimeResource<
  "native-agent-provider.codex",
  NativeAgentProviderResources["codex"]
>({
  id: "native-agent-provider.codex",
  title: "Codex native agent provider",
  purpose: "Explicit-home Codex plugin operations",
  defaultLifetime: "process",
  allowedLifetimes: ["process"],
});

/** A cold process-lifetime capability; operations retain their own native scopes. */
export const ClaudeNativeAgentProviderRuntimeResource = defineRuntimeResource<
  "native-agent-provider.claude",
  NativeAgentProviderResources["claude"]
>({
  id: "native-agent-provider.claude",
  title: "Claude native agent provider",
  purpose: "Explicit-home Claude plugin operations",
  defaultLifetime: "process",
  allowedLifetimes: ["process"],
});
