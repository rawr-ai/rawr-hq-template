import { implement } from "@orpc/server";
import { supportExampleRouter } from "@rawr/support-example/router";
import type { SupportExampleApiContext } from "./context";

// Treat the package router as the contract surface; API plugin only swaps the handler to delegate via `context.supportExample`.
export const os = implement<typeof supportExampleRouter, SupportExampleApiContext>(
  supportExampleRouter as unknown as typeof supportExampleRouter,
);
