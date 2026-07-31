import { getSnippet } from "./get-snippet";
import { searchSnippets } from "./search-snippets";
import { tailSnippets } from "./tail-snippets";
import { writeEvent } from "./write-event";
import { writeSnippet } from "./write-snippet";

/** Journal module contract composed from its operation leaves. */
export const contract = {
  writeEvent,
  writeSnippet,
  getSnippet,
  tailSnippets,
  searchSnippets,
};
