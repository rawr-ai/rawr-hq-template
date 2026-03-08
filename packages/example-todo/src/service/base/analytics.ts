import type { BaseAnalyticsProfile } from "../../orpc-sdk";

/**
 * Baseline analytics profile for the todo service.
 *
 * @remarks
 * Keep this file even when thin so agents have a stable place to expand
 * package-level analytics behavior later.
 */
export const analytics: BaseAnalyticsProfile = {
  app: "todo",
};
