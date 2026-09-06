import { defineRuntimeProvider } from "@habitat-ai/sdk/runtime/providers";
import { providerFx } from "@habitat-ai/sdk/runtime/providers/effect";
import { Effect } from "effect";
import { VersionedContentRuntimeResource } from "../../runtime.js";
import { makeNodeVersionedContentResource } from "./index.js";

/** Acquire a fresh capability factory without opening any caller-selected workspace or home. */
export function defineNodeVersionedContentRuntimeProvider() {
  return defineRuntimeProvider({
    id: "versioned-content.git-effect-platform-node",
    title: "Versioned content (git-effect-platform-node)",
    provides: VersionedContentRuntimeResource,
    requires: [],
    build: () =>
      providerFx.acquireRelease({
        acquire: Effect.sync(() => makeNodeVersionedContentResource()),
        // Native handles and mutations belong to the invoked operation's scope.
        release: () => Effect.void,
      }),
  });
}
