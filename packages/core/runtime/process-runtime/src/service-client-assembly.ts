import { createEffectClient } from "@orpc/experimental-effect";
import { Context } from "effect";

import type { ServiceClientAssembly } from "../../definition/src/index";
import { type InvocationTracker, invocationContinuationContext } from "./invocation-tracker";
import { withNativeEffectTracing } from "./native-effect-tracing";

export function createServiceClientAssembly(admission: InvocationTracker): ServiceClientAssembly {
  // Domain dependencies are explicit constructor inputs, not a process-wide Context store.
  const context = Context.empty();
  return Object.freeze<ServiceClientAssembly>({
    bind({ context: serviceContext, createNativeClient }) {
      // Capture before the native client's first await leaves the calling Effect fiber.
      const parent = admission.captureContinuation();
      admission.assertAdmission(parent);
      return createEffectClient(
        createNativeClient({
          context: () => {
            admission.assertAdmission(parent);
            return {
              ...serviceContext(),
              "effect/context": context,
              "effect/wrap": (program, options) =>
                withNativeEffectTracing(program, "service.operation", {
                  "rpc.method": options.path.join("."),
                }),
            };
          },
          interceptors: [
            ({ next, ...options }) =>
              admission.run(
                (lease) =>
                  next({
                    ...options,
                    context: {
                      ...options.context,
                      "effect/context": invocationContinuationContext(lease),
                    },
                  }),
                parent
              ),
          ],
        })
      );
    },
  });
}
