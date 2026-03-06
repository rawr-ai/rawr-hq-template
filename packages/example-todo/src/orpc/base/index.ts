/**
 * @fileoverview Baseline contracts for oRPC domain service packages.
 *
 * @remarks
 * These are the baseline guarantees that all domain packages can rely on.
 * Domain packages can extend these shapes (deps + metadata) as needed.
 */

/**
 * Canonical logger contract used by baseline middleware (telemetry).
 */
export interface Logger {
  info(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

/**
 * Canonical analytics client contract used by baseline middleware (analytics).
 */
export interface AnalyticsClient {
  track(event: string, payload?: Record<string, unknown>): void | Promise<void>;
}

/**
 * Minimum dependency contract expected by ORPC domain packages.
 *
 * @remarks
 * Domain packages should extend this with domain-specific capabilities (for
 * example `sql`, `clock`, external service adapters).
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
 * Baseline metadata shared across procedures.
 *
 * @remarks
 * Domain packages can extend this metadata bag per-package. Baseline middleware
 * may read fields from this baseline (`idempotent`, optional `domain`).
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

/**
 * Baseline context shape used by domain-package routers.
 *
 * @remarks
 * This is the *unextended* context contract: what the SDK guarantees before any
 * service/package-specific additions. Services can extend context for their
 * package; the resulting shape is modeled as `InitialContext`.
 */
export type BaseContext<TDeps> = {
  deps: TDeps;
};

/**
 * Service/package-specific initial context.
 *
 * @remarks
 * Conceptually, "initial context" is the *extended* context: base + service
 * additions. In many packages it remains `BaseContext<TDeps>` (no extensions),
 * but this type exists so extension has a single obvious place to land.
 */
export type InitialContext<TDeps, TExt extends object = {}> = BaseContext<TDeps> & TExt;

/**
 * Service-local initial context extension helper.
 */
export type ServiceContextOf<TDeps extends BaseDeps, TExtra extends object = {}> = InitialContext<TDeps, TExtra>;
