import { service } from "../../impl";
import { capabilities } from "./middleware/capabilities.middleware";

/** Governance implementer rooted in the service-owned contract branch. */
export const module = service.governance.use(capabilities);
