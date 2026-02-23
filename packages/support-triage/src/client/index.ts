import type { RouterClient } from "@orpc/server";
import { supportTriageClientRouter } from "./router";

export type { SupportTriageClientContext } from "./context";
export {
  supportTriageClientErrorMap,
  throwSupportTriageDomainErrorAsClientError,
} from "./errors";
export { supportTriageClientProcedures } from "./procedures";
export { supportTriageClientRouter } from "./router";

export type SupportTriageClient = RouterClient<typeof supportTriageClientRouter>;
