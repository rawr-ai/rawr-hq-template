import { Type } from "typebox";

/** Shared public data shape for session-domain failures declared by module contracts. */
export const ErrorMessageSchema = Type.Object(
  {
    message: Type.String({
      minLength: 1,
      description: "Domain reason the requested session operation could not complete.",
    }),
  },
  { additionalProperties: false }
);
