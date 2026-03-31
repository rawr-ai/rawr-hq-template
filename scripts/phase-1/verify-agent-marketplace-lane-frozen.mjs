#!/usr/bin/env bun
import { assertCondition, listDirectChildDirs, readPackageJson, readPhase1Ledger } from "./_verify-utils.mjs";

const ledger = await readPhase1Ledger();
const actualAgentRoots = await listDirectChildDirs("plugins/agents");
const expectedAgentRoots = ["plugins/agents/hq", "plugins/agents/nx"];

assertCondition(
  actualAgentRoots.join("\n") === expectedAgentRoots.join("\n"),
  `plugins/agents topology drifted.\nExpected:\n${expectedAgentRoots.join("\n")}\n\nActual:\n${actualAgentRoots.join("\n")}`,
);

assertCondition(ledger.parked.includes("plugins/agents/hq"), "plugins/agents/hq must stay in the parked lane");
assertCondition(!ledger.live.includes("plugins/agents/hq"), "plugins/agents/hq must not appear in the live lane");
assertCondition(ledger.live.includes("plugins/agents/nx"), "plugins/agents/nx must stay classified as a live support surface");

const pluginHqPkg = await readPackageJson("plugins/agents/hq/package.json");
assertCondition(pluginHqPkg.name === "@rawr/plugin-hq", "plugins/agents/hq package name must stay @rawr/plugin-hq");
assertCondition(pluginHqPkg.rawr?.kind === "agent", "plugins/agents/hq must stay an agent plugin");
assertCondition(pluginHqPkg.rawr?.capability === "hq", "plugins/agents/hq must keep the hq capability marker");

console.log("agent marketplace compatibility lane remains frozen in place.");
