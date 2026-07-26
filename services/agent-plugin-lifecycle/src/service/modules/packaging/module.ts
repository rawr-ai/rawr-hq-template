import { service } from "../../impl";
import { contentWorkspace } from "./middleware/content-workspace.middleware";
import { packageOutput } from "./middleware/package-output.middleware";

/**
 * Packaging implementer composed from base-authored capability middleware.
 *
 * @remarks
 * TypeScript infers the additive capability contribution from the completed
 * middleware values; these attachments do not claim to remove inherited lanes.
 */
export const module = service.packaging.use(contentWorkspace).use(packageOutput);
