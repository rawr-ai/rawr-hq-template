import { defineRuntimeProvider } from "@habitat-ai/sdk/runtime/providers";
import { providerFx } from "@habitat-ai/sdk/runtime/providers/effect";
import { Effect } from "effect";
import { AgentPluginPackageOutputRuntimeResource } from "../../runtime.js";
import { makeNodeAgentPluginPackageOutputResource } from "./index.js";

/** Acquire a fresh capability factory without opening any caller-selected workspace or home. */
export function defineNodeAgentPluginPackageOutputRuntimeProvider() {
  return defineRuntimeProvider({
    id: "agent-plugin-package-output.cowork-v1-effect-platform-node",
    title: "Agent plugin package output (cowork-v1-effect-platform-node)",
    provides: AgentPluginPackageOutputRuntimeResource,
    requires: [],
    build: () =>
      providerFx.acquireRelease({
        acquire: Effect.sync(() => makeNodeAgentPluginPackageOutputResource()),
        // Native handles and mutations belong to the invoked operation's scope.
        release: () => Effect.void,
      }),
  });
}
