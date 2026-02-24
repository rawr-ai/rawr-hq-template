import type { RuntimeRouterContext } from "@rawr/core/orpc";
import type { RouterClient } from "@orpc/server";
import type { SupportExampleRouter } from "@rawr/support-example/router";

export type SupportExampleClient = RouterClient<SupportExampleRouter>;

export type SupportExampleApiContext = RuntimeRouterContext & {
  supportExample: SupportExampleClient;
};
