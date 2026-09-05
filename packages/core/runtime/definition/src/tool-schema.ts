import { Type } from "typebox";

/** Native TypeBox constructors; tool declaration adapts the completed schema once. */
export const toolSchema = Object.freeze({
  object: Type.Object,
  string: Type.String,
  optional: Type.Optional,
});
