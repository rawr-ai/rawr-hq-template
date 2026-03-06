/**
 * @fileoverview Baseline contracts for oRPC domain service packages.
 *
 * @remarks
 * These are the stable building blocks that every domain package extends:
 * baseline deps, baseline metadata, and the initial-context shape.
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
 * Minimum dependency contract expected by domain packages.
 *
 * @remarks
 * Services extend this with domain-specific host dependencies.
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
 * Baseline procedure metadata shared across packages.
 *
 * @remarks
 * Services can extend this per-package. Baseline middleware may read
 * `idempotent` and optional routing tags like `domain`.
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
 * Baseline initial-context shape.
 *
 * @remarks
 * The SDK guarantees a top-level `deps` bag. Services extend this with
 * request-scoped input through `InitialContext`.
 */
export type BaseContext<TDeps> = {
  deps: TDeps;
};

/**
 * Service-specific initial context.
 *
 * @remarks
 * Use this for request-scoped top-level input that should exist before
 * middleware runs. Middleware-produced execution context belongs downstream.
 */
export type InitialContext<TDeps, TExt extends object = {}> = BaseContext<TDeps> & TExt;

/**
 * Service-local initial context extension helper.
 */
export type ServiceContextOf<TDeps extends BaseDeps, TExtra extends object = {}> = InitialContext<TDeps, TExtra>;
