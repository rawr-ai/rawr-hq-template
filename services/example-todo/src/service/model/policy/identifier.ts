import { Value } from "typebox/value";
import { TodoIdentifierSchema, type TodoIdentifierType } from "../dto";

/**
 * Admits one host-generated identifier before any domain record is persisted.
 *
 * @remarks
 * Identifier generation is a host capability, but the service retains
 * structural authority over identities entering its domain. A host contract
 * violation is an unexpected defect and must fail before store mutation.
 */
export function admitGeneratedIdentifier(value: unknown): TodoIdentifierType {
  if (Value.Check(TodoIdentifierSchema, value)) return value;
  throw new Error("The host identifier generator returned an invalid UUID");
}
