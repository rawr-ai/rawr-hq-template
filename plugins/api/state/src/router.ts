import { implement } from "@orpc/server";
import type { StateApiContext, StateClientResolver } from "./context";
import { stateApiContract } from "./contract";

const os = implement<typeof stateApiContract, StateApiContext>(stateApiContract);

export function createStateRouter(resolveClient: StateClientResolver) {
  return os.router({
    state: {
      getRuntimeState: os.state.getRuntimeState.handler(async ({ context, input }) => {
        return resolveClient(context.repoRoot).getState(input, {
          context: {
            invocation: {
              traceId: context.correlationId,
            },
          },
        });
      }),
    },
  });
}

export type StateApiRouter = ReturnType<typeof createStateRouter>;
