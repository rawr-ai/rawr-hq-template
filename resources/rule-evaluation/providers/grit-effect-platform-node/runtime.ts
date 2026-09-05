import { NodeServices } from "@effect/platform-node";
import { defineRuntimeProvider } from "@habitat-ai/sdk/runtime/providers";
import { providerFx } from "@habitat-ai/sdk/runtime/providers/effect";
import { RuntimeSchema } from "@habitat-ai/sdk/runtime/schema";
import { Effect, Layer } from "effect";
import { RuleEvaluationRuntimeResource } from "../../runtime.js";
import { GritRuleEvaluationProviderConfigSchema, makeGritRuleEvaluationResource } from "./index.js";
export function defineGritRuleEvaluationRuntimeProvider() {
  return defineRuntimeProvider({
    id: "rule-evaluation.grit-effect-platform-node",
    title: "Grit rule evaluation",
    provides: RuleEvaluationRuntimeResource,
    requires: [],
    configSchema: RuntimeSchema.fromTypeBox(GritRuleEvaluationProviderConfigSchema),
    build: ({ config }) =>
      providerFx.acquireRelease({
        acquire: Effect.scoped(
          Effect.gen(function* () {
            const context = yield* Layer.build(NodeServices.layer);
            const resource = makeGritRuleEvaluationResource(config);
            return Object.freeze({
              evaluate: (input: Parameters<typeof resource.evaluate>[0]) =>
                Effect.provideContext(resource.evaluate(input), context),
            });
          })
        ),
        // Each evaluation scopes its own temporary files and subprocesses.
        release: () => Effect.void,
      }),
  });
}
