import { FilesystemRuntimeResource } from "@habitat-ai/resource-filesystem/runtime";
import { RuleEvaluationRuntimeResource } from "@habitat-ai/resource-rule-evaluation/runtime";
import { SourceInventoryRuntimeResource } from "@habitat-ai/resource-source-inventory/runtime";
import { RuntimeSchema } from "@habitat-ai/sdk/runtime/schema";
import { defineService, resourceDep, sealService } from "@habitat-ai/sdk/service";
import type { RouterContractClient } from "@orpc/contract";
import { createRouterClient } from "@orpc/server";
import { Context as EffectContext } from "effect";
import { Type } from "typebox";
import type { Context } from "./service/base.js";
import { type Contract, contract } from "./service/contract.js";
import { router } from "./service/router.js";

export { type Contract, contract };

/** Host-supplied ready Effect capabilities used by Habitat operations. */
export type Deps = Context["deps"];

/** Stable absolute workspace binding fixed at client construction. */
export type Scope = Context["scope"];

/** App-selected policy-pack locators admitted by the Habitat service. */
export type Config = Context["config"];

/** Public construction boundary for one local Habitat client. */
export type CreateClientOptions = Pick<Context, "deps" | "scope" | "config">;

/** Typed local caller surface derived from the public Habitat contract. */
export type Client = RouterContractClient<Contract>;

/** Native Promise client for callers outside managed execution, with already supplied dependencies. */
export function createClient({ deps, scope, config }: CreateClientOptions): Client {
  return createRouterClient(router, {
    context: {
      deps,
      scope,
      config,
      invocation: {},
      provided: {},
      "effect/context": EffectContext.empty(),
    },
  });
}

/** Service-owned cold declaration; the selected app supplies every ready dependency. */
export const definition = defineService({
  id: "habitat.catalog",
  deps: {
    filesystem: resourceDep(FilesystemRuntimeResource),
    ruleEvaluation: resourceDep(RuleEvaluationRuntimeResource),
    sourceInventory: resourceDep(SourceInventoryRuntimeResource),
  },
  scope: RuntimeSchema.fromTypeBox(
    Type.Object({ workspaceRoot: Type.String({ minLength: 1 }) }, { additionalProperties: false })
  ),
  config: RuntimeSchema.fromTypeBox(
    Type.Object(
      {
        policyPack: Type.Object(
          {
            name: Type.String({ minLength: 1 }),
            packageJsonPath: Type.String({ minLength: 1 }),
            manifestPath: Type.String({ minLength: 1 }),
          },
          { additionalProperties: false }
        ),
      },
      { additionalProperties: false }
    )
  ),
});

/** Complete managed construction boundary; no native execution or provider acquisition occurs here. */
export const serviceRuntimeExport = sealService(definition, {
  contract,
  construct: ({ clients, deps, scope, config }) => ({
    kind: "service.client.construction-bound",
    serviceId: definition.id,
    withInvocation: () =>
      clients.bind({
        context: () =>
          ({
            deps: {
              ...deps.filesystem,
              ruleEvaluation: deps.ruleEvaluation,
              sourceInventory: deps.sourceInventory,
            },
            scope,
            config,
            invocation: {},
            provided: {},
          }) satisfies Context,
        createNativeClient: (options) => createRouterClient(router, options),
      }),
  }),
});
