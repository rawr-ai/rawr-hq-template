import { schema } from "@rawr/hq-sdk";
import type { ErrorMapItem } from "@orpc/server";
import { Type } from "typebox";

const ValidationFailedData = schema(
  Type.Object(
    {
      reason: Type.String({ minLength: 1 }),
    },
    { additionalProperties: false },
  ),
);

export const CORPUS_ARTIFACT_VALIDATION_FAILED: ErrorMapItem<typeof ValidationFailedData> = {
  status: 422,
  message: "Corpus artifact validation failed",
  data: ValidationFailedData,
} as const;
