import type { ServiceAnalyticsProfile } from "../../orpc-sdk";
import type { ServiceContext, ServiceMetadata } from "./types";

/**
 * Baseline analytics profile for the todo service.
 *
 * @remarks
 * Keep this file even when thin so agents have a stable place to expand
 * package-level analytics behavior later.
 *
 * The SDK derives the baseline event shape and package identity from the
 * service metadata, so this file only contributes extra package-specific
 * payload fields when needed.
 */
export const analytics: ServiceAnalyticsProfile<ServiceMetadata, ServiceContext> = {};
