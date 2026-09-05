import { NodeChildProcessSpawner } from "@effect/platform-node";
import { FilesystemRuntimeResource } from "@habitat-ai/resource-filesystem/runtime";
import { defineRuntimeProvider } from "@habitat-ai/sdk/runtime/providers";
import { providerFx } from "@habitat-ai/sdk/runtime/providers/effect";
import { requireResource } from "@habitat-ai/sdk/runtime/resources";
import { Context, Effect, FileSystem, Layer, Path } from "effect";
import { ChildProcessSpawner } from "effect/unstable/process";
import { ChildProcessRuntimeResource } from "../../runtime.js";

/** Captures native spawning capabilities without opening a child or retaining an operation scope. */
export function defineNodeChildProcessRuntimeProvider() {
  const filesystem = requireResource({
    resource: FilesystemRuntimeResource,
    reason: "Native child processes use the selected filesystem and path capabilities",
  });

  return defineRuntimeProvider({
    id: "child-process.effect-platform-node",
    title: "Native Node child process",
    provides: ChildProcessRuntimeResource,
    requires: [filesystem],
    build: ({ resources }) =>
      providerFx.acquireRelease({
        acquire: Effect.scoped(
          Effect.gen(function* () {
            const ready = resources.get(filesystem);
            const context = yield* Layer.build(NodeChildProcessSpawner.layer).pipe(
              Effect.provideService(FileSystem.FileSystem, ready.fileSystem),
              Effect.provideService(Path.Path, ready.path)
            );
            return Context.get(context, ChildProcessSpawner.ChildProcessSpawner);
          })
        ),
        // The capability is stateless; caller scopes own spawned children and streams.
        release: () => Effect.void,
      }),
  });
}
