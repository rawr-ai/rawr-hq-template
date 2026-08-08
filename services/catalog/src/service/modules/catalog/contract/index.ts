import { catalog } from "./catalog.js";

/** Catalog module contract exposed through its single composition face. */
export const contract: typeof catalog = { ...catalog };
