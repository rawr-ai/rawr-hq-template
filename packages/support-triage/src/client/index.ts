import type { RouterClient } from "@orpc/server";
export type { SupportTriageClientContext } from "./context";
export {
  supportTriageClientErrorMap,
  throwSupportTriageDomainErrorAsClientError,
} from "./errors";
import { supportTriageClientProcedures } from "./procedures";

export { supportTriageClientProcedures } from "./procedures";
export const supportTriageClientRouter = supportTriageClientProcedures;

export type SupportTriageClient = RouterClient<typeof supportTriageClientRouter>;
