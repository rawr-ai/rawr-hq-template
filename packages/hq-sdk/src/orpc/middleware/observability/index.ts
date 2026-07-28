import { os } from "@orpc/server";
import type { BaseMetadata } from "../../metadata";
import type { Logger } from "../../ports/logger";
import { createObservabilityHandler } from "./handler";
import { resolveObservabilityProfile } from "./profiles";
import type { ObservabilityMiddlewareInput } from "./types";

export type {
  ObservabilityErrorDetails,
  ObservabilityMiddlewareInput,
} from "./types";

type ObservabilityContext = {
  deps: {
    logger: Logger;
  };
};

/**
 * Creates one native oRPC middleware for procedure spans, events, and logs.
 *
 * @remarks
 * The service supplies its complete context type and metadata defaults. The
 * returned middleware adds no context and has no required/additive wrapper
 * tiers; service-specific signal fields are ordinary options on this one
 * execution boundary.
 */
export function createObservabilityMiddleware<
  TContext extends ObservabilityContext,
  TMeta extends BaseMetadata = BaseMetadata,
  TPolicyEvents extends Record<string, string | undefined> | undefined = undefined,
>(
  metadataDefaults: TMeta,
  input: ObservabilityMiddlewareInput<TMeta, TContext, TPolicyEvents> = {}
) {
  const profile = resolveObservabilityProfile(metadataDefaults, input);

  return os.$context<TContext>().middleware(
    createObservabilityHandler({
      metadataDefaults,
      profile,
      policyEvents: input.policyEvents,
    })
  );
}
