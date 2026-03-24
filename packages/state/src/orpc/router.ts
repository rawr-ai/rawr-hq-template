import { implement } from "@orpc/server";
import { getRepoState } from "../repo-state";
import { stateContract } from "./contract";

type StateRouterContext = {
  repoRoot: string;
};

export function createStateRouter<Context extends StateRouterContext = StateRouterContext>() {
  const state = implement<typeof stateContract, Context>(stateContract);

  return state.router({
    getRuntimeState: state.getRuntimeState.handler(async ({ context }) => {
      const currentState = await getRepoState(context.repoRoot);
      return { state: currentState, authorityRepoRoot: context.repoRoot };
    }),
  });
}
