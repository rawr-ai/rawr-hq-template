/**
 * @fileoverview Canonical analytics client port.
 *
 * @remarks
 * This is a host-provided analytics capability contract. The current SDK
 * baseline still depends on an analytics client, but the capability contract is
 * owned by the SDK ports layer so implementations can be swapped cleanly.
 */
export interface AnalyticsClient {
  track(event: string, payload?: Record<string, unknown>): void | Promise<void>;
}
