import { os } from "@orpc/server";

import type { CurrentMainSelectionReader } from "#agent-plugin-lifecycle-service/model/dependencies/current-main";

type CurrentMainContext = {
  readonly provided: {
    readonly currentMain: CurrentMainSelectionReader;
  };
};

/** Narrows the shared current-main reader to the selection operation alone. */
export const currentMain = os.$context<CurrentMainContext>().middleware(({ context, next }) =>
  next({
    context: {
      currentMain: context.provided.currentMain,
    },
  })
);
