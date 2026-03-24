/**
 * @fileoverview Canonical logger port.
 *
 * @remarks
 * This is a host-provided logging capability contract. The SDK baseline may
 * require a logger, but the logger contract itself is not baseline-owned.
 * Concrete host adapters may satisfy this port with any compatible logger
 * implementation.
 */
export interface Logger {
  info(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}
