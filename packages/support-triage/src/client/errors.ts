import type { ORPCErrorConstructorMap } from "@orpc/server";
import { createOrpcErrorMapFromDomainCatalog, throwDomainErrorAsOrpcError } from "@rawr/orpc-standards";
import {
  isSupportTriageDomainError,
  supportTriageDomainErrorCatalog,
} from "../domain";
export const supportTriageClientErrorMap = createOrpcErrorMapFromDomainCatalog(supportTriageDomainErrorCatalog);

type SupportTriageClientErrorConstructors = ORPCErrorConstructorMap<typeof supportTriageClientErrorMap>;

/**
 * Convert a transport-neutral support-triage domain error into a typed oRPC client error.
 */
export function throwSupportTriageDomainErrorAsClientError(
  error: unknown,
  errors: SupportTriageClientErrorConstructors,
): never {
  return throwDomainErrorAsOrpcError<typeof supportTriageDomainErrorCatalog>({
    error,
    errors,
    isDomainError: isSupportTriageDomainError,
  });
}
