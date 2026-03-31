import { contract as stateContract } from "@rawr/hq-ops/service/contract";

const stateTag = ["state"] as const;

const router = {
  state: {
    getRuntimeState: stateContract.repoState.getState.route({
      method: "GET",
      path: "/state/runtime",
      tags: stateTag,
      summary: "Read runtime plugin state",
      operationId: "stateGetRuntimeState",
    }),
  },
} as const;

export const stateApiContract = router;

export type StateApiContract = typeof stateApiContract;
