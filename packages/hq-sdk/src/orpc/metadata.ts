import { defineMeta } from "@orpc/contract";

/** Stable semantic classification for a service's single analytics event. */
export type AnalyticsMetadata = {
  readonly layer?: string;
  readonly module?: string;
  readonly operation?: string;
};

/** Stable procedure-policy metadata shared by RAWR services. */
export type BaseMetadata = {
  idempotent: boolean;
  domain?: string;
  audience?: string;
  audit?: string;
  entity?: string;
  analytics?: AnalyticsMetadata;
};

/** Narrows the shared metadata vocabulary for one service domain. */
export type ServiceMetadataOf<T extends object = Record<never, never>> = BaseMetadata & T;

const [attachProcedureMetadata, readProcedureMetadata] = defineMeta<"rawr.procedure", BaseMetadata>(
  "rawr.procedure",
  (incoming, current) => ({
    ...current,
    ...incoming,
  })
);

/** Attaches RAWR's stable procedure metadata through oRPC's native plugin API. */
export const procedureMetadata = attachProcedureMetadata;

/** Reads RAWR procedure metadata through oRPC's native plugin API. */
export const getProcedureMetadata = readProcedureMetadata;
