import "../../../../src/plugins/server/effect/index";
import { fstatSync } from "node:fs";
import type { WithEffectContext } from "@orpc/experimental-effect";
import { createRouterClient, implement } from "@orpc/server";
import { Effect } from "effect";
import { Type } from "typebox";
import type { RuntimeResource } from "../../../../src/runtime/resources/index";
import { defineService, resourceDep, sealService } from "../../../../src/service/index";
import { standard } from "../../../../src/service/schema";

/** Real private native router; managed construction receives only ready dependencies. */
export function createFileService(resource: RuntimeResource<"server.file", number>) {
  const definition = defineService({
    id: "server.file-service",
    deps: { file: resourceDep(resource) },
  });
  const contract = definition.oc.router({ read: definition.oc.output(standard(Type.String())) });
  return sealService(definition, {
    contract,
    construct: ({ deps, clients }) => {
      const base = implement(contract).$context<WithEffectContext<never>>();
      const router = base.router({
        read: base.read.effect(function* () {
          return yield* Effect.sync(() =>
            fstatSync(deps.file).isFile() ? "file-live" : "missing"
          );
        }),
      });
      return {
        kind: "service.client.construction-bound",
        serviceId: definition.id,
        withInvocation: () =>
          clients.bind({
            context: () => ({}),
            createNativeClient: (options) => createRouterClient(router, options),
          }),
      };
    },
  });
}
