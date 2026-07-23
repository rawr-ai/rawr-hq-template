import {
  createHqOpsCallOptions,
  createHqOpsClient,
  type HqOpsJournalSnippet,
} from "../../src/lib/hq-ops-client";

// Test-only state fixture. It is not a CLI entrypoint.
const workspaceRoot = process.argv[2];
const encodedSnippet = process.argv[3];
if (workspaceRoot === undefined || encodedSnippet === undefined) {
  throw new Error("usage: bun seed-journal.ts <workspace-root> <snippet-json>");
}

const snippet = JSON.parse(encodedSnippet) as HqOpsJournalSnippet;
await createHqOpsClient(workspaceRoot).journal.writeSnippet(
  snippet,
  createHqOpsCallOptions("test.journal.seed")
);
