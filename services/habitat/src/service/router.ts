import { impl } from "./impl";
import { router as catalog } from "./modules/catalog/router";

/** Completes the Habitat service from its catalog module router. */
export const router = impl.router({ catalog });
