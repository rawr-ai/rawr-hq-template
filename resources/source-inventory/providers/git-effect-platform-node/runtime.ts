import { NodeServices } from "@effect/platform-node";
import { defineRuntimeProvider } from "@habitat-ai/sdk/runtime/providers";
import { providerFx } from "@habitat-ai/sdk/runtime/providers/effect";
import { RuntimeSchema } from "@habitat-ai/sdk/runtime/schema";
import { Effect, Layer } from "effect";
import { SourceInventoryRuntimeResource } from "../../runtime.js";
import {
  GitSourceInventoryProviderOptionsSchema,
  makeGitSourceInventoryResource,
} from "./index.js";
export function defineGitSourceInventoryRuntimeProvider() {
  return defineRuntimeProvider({
    id: "source-inventory.git-effect-platform-node",
    title: "Git source inventory",
    provides: SourceInventoryRuntimeResource,
    requires: [],
    configSchema: RuntimeSchema.fromTypeBox(GitSourceInventoryProviderOptionsSchema),
    build: ({ config }) =>
      providerFx.acquireRelease({
        acquire: Effect.scoped(
          Effect.gen(function* () {
            const context = yield* Layer.build(NodeServices.layer);
            const resource = makeGitSourceInventoryResource(config);
            return Object.freeze({
              observe: (input: Parameters<typeof resource.observe>[0]) =>
                Effect.provideContext(resource.observe(input), context),
            });
          })
        ),
        // Stateless capabilities; operation scopes own actual child-process handles.
        release: () => Effect.void,
      }),
  });
}
