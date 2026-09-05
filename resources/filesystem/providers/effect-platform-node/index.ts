import { NodeServices } from "@effect/platform-node";
import { defineRuntimeProvider } from "@habitat-ai/sdk/runtime/providers";
import { providerFx } from "@habitat-ai/sdk/runtime/providers/effect";
import { Context, Effect, FileSystem, Layer, Path } from "effect";
import { FilesystemRuntimeResource } from "../../runtime.js";
/** Declares stateless Node filesystem capabilities; individual operations own their handles. */
export function defineNodeFilesystemRuntimeProvider() {
  return defineRuntimeProvider({
    id: "filesystem.effect-platform-node",
    title: "Native Node filesystem",
    provides: FilesystemRuntimeResource,
    requires: [],
    build: () =>
      providerFx.acquireRelease({
        acquire: Effect.scoped(
          Effect.gen(function* () {
            const context = yield* Layer.build(NodeServices.layer);
            return Object.freeze({
              fileSystem: Context.get(context, FileSystem.FileSystem),
              path: Context.get(context, Path.Path),
            });
          })
        ),
        // Capability construction owns no handles; each operation owns its scope.
        release: () => Effect.void,
      }),
  });
}
