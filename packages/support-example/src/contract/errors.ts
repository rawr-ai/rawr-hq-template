import type { ORPCErrorConstructorMap } from "@orpc/server";
import { createOrpcErrorMapFromDomainCatalog, throwDomainErrorAsOrpcError } from "@rawr/orpc-standards";
import { isSupportExampleDomainError, supportExampleDomainErrorCatalog } from "../domain";

export const supportExampleContractErrorMap = createOrpcErrorMapFromDomainCatalog(supportExampleDomainErrorCatalog);

type SupportExampleContractErrorConstructors = ORPCErrorConstructorMap<typeof supportExampleContractErrorMap>;

export function throwSupportExampleDomainErrorAsContractError(
  error: unknown,
  errors: SupportExampleContractErrorConstructors,
): never {
  return throwDomainErrorAsOrpcError<typeof supportExampleDomainErrorCatalog>({
    error,
    errors,
    isDomainError: isSupportExampleDomainError,
  });
}
