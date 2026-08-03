import { clearIndex } from "./router/clear-index";
import { content } from "./router/content";
import { facets } from "./router/facets";
import { metadata } from "./router/metadata";
import { reindex } from "./router/reindex";

/** Composes the completed search operations into the module router face. */
export const router = {
  metadata,
  content,
  facets,
  reindex,
  clearIndex,
};
