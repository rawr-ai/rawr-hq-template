import { schema } from "@rawr/hq-sdk";
import { Type } from "typebox";

export const ErrorMessageSchema = Type.Object(
  {
    message: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false },
);

export const SESSION_NOT_FOUND = {
  status: 404,
  message: "Session not found",
  data: schema(ErrorMessageSchema),
} as const;

export const UNKNOWN_SESSION_FORMAT = {
  status: 422,
  message: "Unknown session format",
  data: schema(ErrorMessageSchema),
} as const;

export const INVALID_REGEX = {
  status: 400,
  message: "Invalid search regex",
  data: schema(ErrorMessageSchema),
} as const;
