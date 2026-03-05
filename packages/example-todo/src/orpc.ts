/**
 * @fileoverview Central oRPC implementer for the todo domain package.
 *
 * @remarks
 * This file is intentionally oRPC-native and domain-authored:
 * - import the root contract (contract bubble-up),
 * - implement the contract once (central implementer),
 * - attach package-wide middleware here (telemetry, read-only mode),
 * - export the implementer tree for modules to derive from (`impl.<module>`).
 *
 * The domain router (`domain/router.ts`) should only compose module routers and
 * call `.router(...)` once (no `.use(...)` there).
 */
import { implement } from "@orpc/server";

import type { Deps } from "./domain/deps";
import { contract } from "./domain/contract";
import { withReadOnlyMode } from "./domain/middleware/with-read-only-mode";
import { withTelemetry } from "./orpc/middleware/with-telemetry";
import type { InitialContext } from "./orpc-sdk";

/**
 * Central implementer tree derived from the root contract.
 *
 * @remarks
 * Middleware order is authored here:
 * 1) telemetry (baseline)
 * 2) domain guards (read-only mode)
 */
export const impl = implement(contract)
  .$context<InitialContext<Deps>>()
  .use(withTelemetry({ defaultDomain: "todo" }))
  .use(withReadOnlyMode);