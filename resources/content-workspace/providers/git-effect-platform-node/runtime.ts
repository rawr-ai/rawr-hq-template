import { defineRuntimeProvider } from "@habitat-ai/sdk/runtime/providers";
import { providerFx } from "@habitat-ai/sdk/runtime/providers/effect";
import { Effect } from "effect";
import { ContentWorkspaceRuntimeResource } from "../../runtime.js";
import { makeNodeContentWorkspaceResource } from "./index.js";

/** Acquire a fresh capability factory without opening any caller-selected workspace or home. */
export function defineNodeContentWorkspaceRuntimeProvider() {
  return defineRuntimeProvider({
    id: "content-workspace.git-effect-platform-node",
    title: "Content workspace (git-effect-platform-node)",
    provides: ContentWorkspaceRuntimeResource,
    requires: [],
    build: () =>
      providerFx.acquireRelease({
        acquire: Effect.sync(() => makeNodeContentWorkspaceResource()),
        // Native handles and mutations belong to the invoked operation's scope.
        release: () => Effect.void,
      }),
  });
}
