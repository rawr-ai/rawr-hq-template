/**
 * @fileoverview Narrow support seam for sibling service-base concern files.
 *
 * @remarks
 * `index.ts` is still the single service-type declaration and assembly point.
 * This file exists only so sibling concern files can reference the bound kit
 * and derived service types without importing the assembly manifest directly
 * and recreating a file-level cycle.
 */
import type {
  BasePolicyProfile,
  ServiceAnalyticsProfile,
  ServiceObservabilityProfile,
} from "../../orpc-sdk";

export type TodoServiceKit = import("./index").TodoServiceKit;
export type ServiceContext = import("./index").ServiceContext;
export type ServiceMetadata = import("./index").ServiceMetadata;

/**
 * Bound helper for service-wide observability profile definition.
 *
 * @remarks
 * Keep sibling concern files lightweight and semantic. They should fill out
 * this helper, not carry SDK generic ceremony by hand.
 */
export function defineObservabilityProfile(
  profile: ServiceObservabilityProfile<ServiceMetadata, ServiceContext, BasePolicyProfile>,
) {
  return profile;
}

/**
 * Bound helper for service-wide analytics profile definition.
 *
 * @remarks
 * Keep sibling concern files focused on service-specific deltas, not SDK
 * generic wiring.
 */
export function defineAnalyticsProfile(
  profile: ServiceAnalyticsProfile<ServiceMetadata, ServiceContext>,
) {
  return profile;
}
