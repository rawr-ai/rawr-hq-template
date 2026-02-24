import type { RuntimeRouterContext } from "@rawr/core/orpc";
import type { SupportExampleClient } from "@rawr/support-example/client";

export type SupportExampleApiContext = RuntimeRouterContext & {
  supportExample: SupportExampleClient;
};
