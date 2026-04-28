#!/usr/bin/env bun
import { runCommand } from "../phase-2/_verify-utils.mjs";

await runCommand(
  "bun run phase-2:gate:u00:server-role-runtime-path -- --allow-findings",
  "M2 server-role runtime path current-findings check",
);

console.log("M2 legacy composition authority current findings recorded");
