import { createAnalyticsMiddlewareCallback } from "@habitat-ai/rawr-hq-sdk";
import { base } from "../base";
import { metadataDefaults } from "../model/policy";

/** Emits one service-owned analytics event with its qualified operation identity. */
export const middleware = base.middleware(
  createAnalyticsMiddlewareCallback(metadataDefaults, {
    payload: ({ context, meta, pathLabel, outcome }) => {
      const classification = meta.analytics;
      return {
        analytics_workspace_id: context.scope.workspaceId,
        analytics_trace_id: context.invocation.traceId,
        analytics_read_only: context.config.readOnly,
        ...(classification
          ? {
              analytics_layer: classification.layer,
              ...(classification.module ? { analytics_module: classification.module } : {}),
              ...(classification.operation
                ? { analytics_procedure: classification.operation }
                : {}),
              analytics_path: pathLabel,
              analytics_outcome: outcome,
            }
          : {}),
      };
    },
  })
);
