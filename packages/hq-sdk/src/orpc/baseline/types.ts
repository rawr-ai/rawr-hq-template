import type { AnalyticsClient } from "../ports/analytics";
import type { Logger } from "../ports/logger";

/**
 * Minimum dependency contract expected by service packages.
 *
 * @remarks
 * Baseline depends on these capability ports, but it does not own the port
 * contracts themselves.
 */
export interface BaseDeps {
  logger: Logger;
  analytics: AnalyticsClient;
}

/**
 * Service-local dependency extension helper.
 */
export type ServiceDepsOf<T extends object> = BaseDeps & T;

/**
 * Baseline procedure metadata shared across service packages.
 */
export type BaseMetadata = {
  idempotent: boolean;
  domain?: string;
  audience?: string;
};

/**
 * Service-local metadata extension helper.
 */
export type ServiceMetadataOf<T extends object = {}> = BaseMetadata & T;
