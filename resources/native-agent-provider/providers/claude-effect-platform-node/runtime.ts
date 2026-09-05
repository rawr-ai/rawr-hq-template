import { defineRuntimeProvider } from "@habitat-ai/sdk/runtime/providers";
import { providerFx } from "@habitat-ai/sdk/runtime/providers/effect";
import { Effect } from "effect";
import { ClaudeNativeAgentProviderRuntimeResource } from "../../runtime.js";
import { makeNodeClaudeNativeAgentProviderResource } from "./index.js";

/** Acquire a fresh capability factory without opening any caller-selected workspace or home. */
export function defineNodeClaudeNativeAgentProviderRuntimeProvider() {
  return defineRuntimeProvider({
    id: "native-agent-provider.claude.claude-effect-platform-node",
    title: "Claude native agent provider (claude-effect-platform-node)",
    provides: ClaudeNativeAgentProviderRuntimeResource,
    requires: [],
    build: () =>
      providerFx.acquireRelease({
        acquire: Effect.sync(() => makeNodeClaudeNativeAgentProviderResource()),
        // Native handles and mutations belong to the invoked operation's scope.
        release: () => Effect.void,
      }),
  });
}
