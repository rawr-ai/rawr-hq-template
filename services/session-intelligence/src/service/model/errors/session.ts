import { standard } from "@habitat-ai/typebox-adapter";
import { Type } from "typebox";

export const ErrorMessageSchema = Type.Object(
  {
    message: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false }
);

export const SESSION_NOT_FOUND = {
  message: "Session not found",
  data: standard(ErrorMessageSchema),
} as const;

export const UNKNOWN_SESSION_FORMAT = {
  message: "Unknown session format",
  data: standard(ErrorMessageSchema),
} as const;

export const INVALID_REGEX = {
  message: "Invalid search regex",
  data: standard(ErrorMessageSchema),
} as const;
