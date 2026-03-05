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
 * The service router (`service/router.ts`) should only compose module routers and
 * call `.router(...)` once (no `.use(...)` there).
 */
import { implement } from "@orpc/server";

import type { ServiceContext } from "./base";
import { contract } from "./contract";
import { withReadOnlyMode } from "./middleware/with-read-only-mode";
import { withAnalytics } from "../orpc/middleware/with-analytics";
import { withTelemetry } from "../orpc/middleware/with-telemetry";
import { createImplementer } from "../orpc-sdk";
import { withFeedback, type WithFeedbackContext } from "../orpc/middleware/with-feedback";

/**
 * Central implementer tree derived from the root contract.
 *
 * @remarks
 * Middleware order is authored here:
 * 1) telemetry (baseline)
 * 2) analytics (baseline)
 * 2) domain guards (read-only mode)
 */
export const implManual = implement(contract)
  .$context<ServiceContext>()
  .use(withTelemetry({ defaultDomain: "todo" }))
  .use(withAnalytics({ app: "todo" }))
  .use(withReadOnlyMode);

/**
 * Proto-SDK-shaped implementer wiring.
 *
 * @remarks
 * This should remain behavior-identical to `implManual`. Keep both exported
 * until we're confident the SDK abstraction is truly zero-footgun.
 */
export const impl =
  createImplementer<typeof contract, ServiceContext>(contract, {
    telemetry: { defaultDomain: "todo" },
    analytics: { app: "todo" },
  }).use(withReadOnlyMode);

/**
 * Optional feature example: opt into feedback middleware at the service layer.
 *
 * @remarks
 * This illustrates the intended contract:
 * - baseline middleware (telemetry + analytics) is always attached by the SDK,
 * - optional middleware is attached only by services that also provide the
 *   required deps adapter.
 */
export const implWithFeedback =
  createImplementer<typeof contract, WithFeedbackContext<ServiceContext>>(contract, {
    telemetry: { defaultDomain: "todo" },
    analytics: { app: "todo" },
  })
    .use(withReadOnlyMode)
    .use(withFeedback());
