// @ts-expect-error public Effect facade must not export runtime access internals.
import type { EffectRuntimeAccess } from "@rawr/sdk/effect";

import { Effect, TaggedError, type EffectBody } from "@rawr/sdk/effect";
import { defineRuntimeProvider } from "@rawr/sdk/runtime/providers";
import {
  implementService,
  type ServiceProcedureExecutionContext,
} from "@rawr/sdk/service";
import { EmailSenderResource } from "../positive/resource-provider-profile";
import {
  WorkItemsService,
  WorkItemNotFound,
  type WorkItem,
} from "../positive/work-items-service";

void (undefined as unknown as EffectRuntimeAccess);

const service = implementService(WorkItemsService);

// @ts-expect-error .handler(...) is not part of canonical service authoring.
service.items.get.handler(() => ({ id: "1", title: "Wrong", status: "open" }));

// @ts-expect-error .effect(...) accepts generator/RawrEffect bodies, not async Promise bodies.
service.items.get.effect(async ({ input }) => ({
  id: input.id,
  title: "Wrong",
  status: "open" as const,
}));

// @ts-expect-error raw generator yields are not part of the RAWR Effect facade.
const badYieldBody: EffectBody<
  ServiceProcedureExecutionContext<{ readonly id: string }>,
  WorkItem,
  WorkItemNotFound
> = function* ({ input }) {
  yield "raw-yield";
  return {
    id: input.id,
    title: "Wrong",
    status: "open" as const,
  };
};

class WrongWorkItemError extends TaggedError("WrongWorkItemError")<{
  readonly code: string;
}> {}

// @ts-expect-error yielded Effect errors must match the declared error channel.
const wrongErrorBody: EffectBody<
  ServiceProcedureExecutionContext<{ readonly id: string }>,
  WorkItem,
  WorkItemNotFound
> = function* ({ input }) {
  return yield* Effect.fail(new WrongWorkItemError({ code: input.id }));
};

void badYieldBody;
void wrongErrorBody;

defineRuntimeProvider({
  kind: "runtime.provider",
  id: "bad.promise.provider",
  title: "Bad promise provider",
  provides: EmailSenderResource,
  requires: [],
  // @ts-expect-error provider build must return ProviderEffectPlan, not a bare Promise.
  async build() {
    return {
      async send() {},
    };
  },
});
