#!/usr/bin/env bun
import { execFileSync } from "node:child_process";
import { assertCondition, assertExactSet, pathExists, readPhase1Ledger } from "./_verify-utils.mjs";

const ledger = await readPhase1Ledger();
const prohibitedJoined = ledger.prohibited.join("\n");

assertCondition(
  prohibitedJoined.includes("Parked-lane edits are limited to deletions, rewires, compile fixes, and explicit unblockers."),
  "Phase 1 ledger must record the parked-lane freeze policy explicitly",
);

for (const relPath of ledger.parked) {
  assertCondition(await pathExists(relPath), `${relPath} must remain present while parked`);
}

const trackedFiles = execFileSync("git", ["ls-files", "plugins/agents/**", "plugins/server/api/**"], {
  cwd: process.cwd(),
  encoding: "utf8",
})
  .split("\n")
  .map((line) => line.trim())
  .filter(Boolean);

const trackedAgentRoots = [...new Set(trackedFiles.filter((file) => file.startsWith("plugins/agents/")).map((file) => file.split("/").slice(0, 3).join("/")))].sort();
const trackedServerApiRoots = [
  ...new Set(trackedFiles.filter((file) => file.startsWith("plugins/server/api/")).map((file) => file.split("/").slice(0, 4).join("/"))),
].sort();

assertExactSet(trackedAgentRoots, ["plugins/agents/hq"], "tracked Phase 1 marketplace compatibility lane");
assertExactSet(
  trackedServerApiRoots,
  ["plugins/server/api/example-todo", "plugins/server/api/state"],
  "tracked parked server API roots",
);

console.log("parked lane freeze verified");
