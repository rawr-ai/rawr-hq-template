/**
 * @fileoverview Base contracts for domain-package ORPC kits.
 *
 * @remarks
 * These are the baseline guarantees that all domain packages can rely on.
 * Domain packages can extend these shapes (deps + metadata) as needed.
 */

/**
 * Canonical logger contract used by kit-level middleware (telemetry).
 */
export interface Logger {
  info(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
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
}

/**
 * Baseline metadata shared across procedures.
 *
 * @remarks
 * Domain packages can extend this metadata bag per-package. Kit-level middleware
 * may read fields from this baseline (`idempotent`, optional `domain`).
 */
export type BaseMetadata = {
  idempotent: boolean;
  domain?: string;
  audience?: string;
};

/**
 * Baseline initial context shape used by domain-package routers.
 */
export type InitialContext<TDeps> = {
  deps: TDeps;
};

