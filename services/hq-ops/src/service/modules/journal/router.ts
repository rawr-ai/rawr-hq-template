import { getSnippet } from "./router/get-snippet.router";
import { searchSnippets } from "./router/search-snippets.router";
import { tailSnippets } from "./router/tail-snippets.router";
import { writeEvent } from "./router/write-event.router";
import { writeSnippet } from "./router/write-snippet.router";

/** Completed Journal operation tree consumed by the HQ Ops service router. */
export const router = {
  writeEvent,
  writeSnippet,
  getSnippet,
  tailSnippets,
  searchSnippets,
};
