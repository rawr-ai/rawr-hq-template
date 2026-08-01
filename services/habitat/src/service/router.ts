import { impl } from "./impl.js";
import { router as catalog } from "./modules/catalog/router.js";

/** Completes the Habitat service from its catalog module router. */
export const router = impl.router({ catalog });
