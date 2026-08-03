import { Type } from "typebox";

/** Shared data shape for source-material failures declared by module contracts. */
export const CorpusErrorDataSchema = Type.Object(
  {
    path: Type.String({
      minLength: 1,
      description: "Path of the source material that failed admission or normalization.",
    }),
    reason: Type.String({
      minLength: 1,
      description: "Domain reason the source material could not be processed.",
    }),
  },
  { additionalProperties: false }
);
