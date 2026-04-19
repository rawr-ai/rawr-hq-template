#!/usr/bin/env bun
import { assertCondition, listDirectChildDirs, readPackageJson, readPhase1Ledger } from "./_verify-utils.mjs";

const ledger = await readPhase1Ledger();
const actualAgentRoots = await listDirectChildDirs("plugins/agents");
assertCondition(actualAgentRoots.includes("plugins/agents/hq"), "plugins/agents/hq must remain present during Phase 1");

assertCondition(ledger.parked.includes("plugins/agents/hq"), "plugins/agents/hq must stay in the parked lane");
assertCondition(!ledger.live.includes("plugins/agents/hq"), "plugins/agents/hq must not appear in the live lane");

const pluginHqPkg = await readPackageJson("plugins/agents/hq/package.json");
assertCondition(pluginHqPkg.name === "@rawr/plugin-hq", "plugins/agents/hq package name must stay @rawr/plugin-hq");
assertCondition(pluginHqPkg.rawr?.kind === "agent", "plugins/agents/hq must stay an agent plugin");
assertCondition(pluginHqPkg.rawr?.capability === "hq", "plugins/agents/hq must keep the hq capability marker");

const hqChildDirs = (await listDirectChildDirs("plugins/agents/hq")).filter((item) => !item.endsWith("/.turbo"));
const expectedHqChildDirs = [
  "plugins/agents/hq/agents",
  "plugins/agents/hq/scripts",
  "plugins/agents/hq/skills",
  "plugins/agents/hq/workflows",
];

assertCondition(
  hqChildDirs.join("\n") === expectedHqChildDirs.join("\n"),
  `plugins/agents/hq topology drifted.\nExpected:\n${expectedHqChildDirs.join("\n")}\n\nActual:\n${hqChildDirs.join("\n")}`,
);

console.log("agent marketplace compatibility lane remains frozen in place.");
