import { defineServiceAnalyticsProfile } from "../../orpc-sdk";
import type { ServiceContext, ServiceMetadata } from "./types";

/**
 * Baseline analytics profile for the todo service.
 *
 * @remarks
 * Keep this file even when thin so agents have a stable place to expand
 * service-wide analytics behavior later.
 *
 * This file is for service-wide defaults that `createServiceImplementer(...)`
 * auto-attaches. Module/procedure-local analytics should be additive middleware
 * authored with `createServiceAnalyticsMiddleware(...)`, not copied back into
 * `impl.ts`.
 *
 * The SDK derives the baseline event shape and package identity from the
 * service metadata, so this file only contributes extra package-specific
 * payload fields when needed.
 */
export const analytics = defineServiceAnalyticsProfile<ServiceMetadata, ServiceContext>({});
