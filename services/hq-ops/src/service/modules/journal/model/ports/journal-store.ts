import type { JournalEvent, JournalSnippet } from "../entities";
import type { JournalIndex } from "./journal-index";

/** Canonical Journal records plus scoped access to the service-owned derived index. */
export type JournalStore = {
  writeEvent(event: JournalEvent): Promise<string>;
  writeSnippet(snippet: JournalSnippet): Promise<string>;
  getSnippet(id: string): Promise<JournalSnippet | null>;
  withIndex<Result>(operation: (index: JournalIndex) => Promise<Result> | Result): Promise<Result>;
};
