import { schema } from "@rawr/hq-sdk";
import { Type } from "typebox";
import {
  INVALID_CONVERSATION_EXPORT,
  INVALID_CONVERSATION_JSON,
} from "../../shared/errors";
import { ocBase } from "../../base";
import { SourceSnapshotSchema } from "../source-materials/schemas";
import {
  BuildArtifactsInputSchema,
  BuildArtifactsOutputSchema,
  MaterializeArtifactsOutputSchema,
} from "./schemas";

const EmptyInputSchema = Type.Object({}, { additionalProperties: false });

export const contract = {
  build: ocBase
    .meta({ idempotent: true })
    .input(schema(BuildArtifactsInputSchema))
    .output(schema(BuildArtifactsOutputSchema)),
  materialize: ocBase
    .meta({ idempotent: false })
    .input(schema(EmptyInputSchema))
    .output(schema(MaterializeArtifactsOutputSchema))
    .errors({
      INVALID_CONVERSATION_JSON,
      INVALID_CONVERSATION_EXPORT,
    }),
};
