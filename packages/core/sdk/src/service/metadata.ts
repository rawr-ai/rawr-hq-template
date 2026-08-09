import { defineMeta } from "@orpc/contract";

type AnalyticsMetadata = {
  readonly layer?: string;
  readonly module?: string;
  readonly operation?: string;
};

/** Stable procedure-policy metadata shared by Habitat services. */
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

const [attachProcedureMetadata, readProcedureMetadata] = defineMeta<
  "habitat.procedure",
  BaseMetadata
>("habitat.procedure", (incoming, current) => ({
  ...current,
  ...incoming,
}));

/** Attaches Habitat procedure metadata through oRPC's native metadata API. */
export const procedureMetadata = attachProcedureMetadata;

/** Reads Habitat procedure metadata through oRPC's native metadata API. */
export const getProcedureMetadata = readProcedureMetadata;
