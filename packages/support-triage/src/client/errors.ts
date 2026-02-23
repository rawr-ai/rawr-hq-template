import type { ErrorMap, Schema } from "@orpc/contract";
import type { ORPCErrorConstructorMap } from "@orpc/server";
import { schema } from "@rawr/orpc-standards";
import type { Static, TSchema } from "typebox";
import {
  isSupportTriageDomainError,
  supportTriageDomainErrorCatalog,
  type SupportTriageDomainErrorCode,
} from "../domain";

type DomainErrorCatalog = Record<
  string,
  {
    status: number;
    message: string;
    data: TSchema;
  }
>;

type ClientErrorMapFromDomainCatalog<TCatalog extends DomainErrorCatalog> = {
  [Code in keyof TCatalog]: {
    status: TCatalog[Code]["status"];
    message: TCatalog[Code]["message"];
    data: Schema<Static<TCatalog[Code]["data"]>, Static<TCatalog[Code]["data"]>>;
  };
};

function createSupportTriageClientErrorMap<TCatalog extends DomainErrorCatalog>(
  catalog: TCatalog,
): ClientErrorMapFromDomainCatalog<TCatalog> {
  const mapped = {} as ClientErrorMapFromDomainCatalog<TCatalog>;

  for (const code of Object.keys(catalog) as Array<keyof TCatalog>) {
    const definition = catalog[code];
    mapped[code] = {
      status: definition.status,
      message: definition.message,
      data: schema(definition.data),
    } as ClientErrorMapFromDomainCatalog<TCatalog>[typeof code];
  }

  return mapped;
}

export const supportTriageClientErrorMap = createSupportTriageClientErrorMap(
  supportTriageDomainErrorCatalog,
) satisfies ErrorMap;

type SupportTriageClientErrorConstructors = ORPCErrorConstructorMap<typeof supportTriageClientErrorMap>;

/**
 * Convert a transport-neutral support-triage domain error into a typed oRPC client error.
 */
export function throwSupportTriageDomainErrorAsClientError(
  error: unknown,
  errors: SupportTriageClientErrorConstructors,
): never {
  if (!isSupportTriageDomainError(error)) {
    throw error;
  }

  const code = error.code as keyof SupportTriageClientErrorConstructors & SupportTriageDomainErrorCode;
  const createOrpcError = errors[code] as (payload: { message: string; data: unknown }) => never;

  throw createOrpcError({
    message: error.message,
    data: error.details ?? {},
  });
}
