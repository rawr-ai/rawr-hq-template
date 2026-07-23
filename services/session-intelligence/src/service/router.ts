import { impl } from "./impl";
import { router as catalog } from "./modules/catalog/router";
import { router as search } from "./modules/search/router";
import { router as transcripts } from "./modules/transcripts/router";

export const router = impl.router({
  catalog,
  transcripts,
  search,
});

export type Router = typeof router;
