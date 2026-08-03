import { getSnippet } from "./router/get-snippet";
import { searchSnippets } from "./router/search-snippets";
import { tailSnippets } from "./router/tail-snippets";
import { writeEvent } from "./router/write-event";
import { writeSnippet } from "./router/write-snippet";

/** Completed Journal operation tree consumed by the HQ Ops service router. */
export const router = {
  writeEvent,
  writeSnippet,
  getSnippet,
  tailSnippets,
  searchSnippets,
};
