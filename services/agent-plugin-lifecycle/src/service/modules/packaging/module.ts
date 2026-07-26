import { service } from "../../impl";
import { capabilities } from "./middleware/capabilities.middleware";

/**
 * Packaging implementer composed from base-authored capability middleware.
 *
 * @remarks
 * TypeScript infers the additive capability contribution from the completed
 * middleware value; this attachment does not claim to remove inherited lanes.
 */
export const module = service.packaging.use(capabilities);
