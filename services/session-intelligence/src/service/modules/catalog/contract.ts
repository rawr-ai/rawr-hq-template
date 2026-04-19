import { schema } from "@rawr/hq-sdk";
import { Type } from "typebox";
import { ocBase } from "../../base";
import { SESSION_NOT_FOUND } from "../../shared/errors";
import {
  ResolveResultSchema,
  SessionFiltersSchema,
  SessionListItemSchema,
  SessionSourceFilterSchema,
} from "./schemas";

export const contract = {
  list: ocBase
    .meta({ idempotent: true, entity: "catalog" })
    .input(
      schema(
        Type.Object(
          {
            source: SessionSourceFilterSchema,
            limit: Type.Number(),
            filters: Type.Optional(SessionFiltersSchema),
          },
          { additionalProperties: false },
        ),
      ),
    )
    .output(schema(Type.Object({ sessions: Type.Array(SessionListItemSchema) }, { additionalProperties: false }))),
  resolve: ocBase
    .meta({ idempotent: true, entity: "catalog" })
    .input(
      schema(
        Type.Object(
          {
            session: Type.String({ minLength: 1 }),
            source: SessionSourceFilterSchema,
          },
          { additionalProperties: false },
        ),
      ),
    )
    .output(schema(ResolveResultSchema))
    .errors({ SESSION_NOT_FOUND }),
};
