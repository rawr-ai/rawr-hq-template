import { defineRuntimeProvider } from "@habitat-ai/sdk/runtime/providers";
import { providerFx } from "@habitat-ai/sdk/runtime/providers/effect";
import { Effect } from "effect";
import { CodexNativeAgentProviderRuntimeResource } from "../../runtime.js";
import { makeNodeCodexNativeAgentProviderResource } from "./index.js";

/** Acquire a fresh capability factory without opening any caller-selected workspace or home. */
export function defineNodeCodexNativeAgentProviderRuntimeProvider() {
  return defineRuntimeProvider({
    id: "native-agent-provider.codex.codex-effect-platform-node",
    title: "Codex native agent provider (codex-effect-platform-node)",
    provides: CodexNativeAgentProviderRuntimeResource,
    requires: [],
    build: () =>
      providerFx.acquireRelease({
        acquire: Effect.sync(() => makeNodeCodexNativeAgentProviderResource()),
        // Native handles and mutations belong to the invoked operation's scope.
        release: () => Effect.void,
      }),
  });
}
