import { service } from "../../impl";
import { contentWorkspace } from "./middleware/content-workspace.middleware";
import { nativeProviders } from "./middleware/native-providers.middleware";

/**
 * Providers implementer composed from base-authored capability middleware.
 *
 * @remarks
 * TypeScript infers the additive capability contribution from the completed
 * middleware values; these attachments do not claim to remove inherited lanes.
 */
export const module = service.providers.use(contentWorkspace).use(nativeProviders);
