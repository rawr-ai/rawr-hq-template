#!/usr/bin/env bun
import { runCommand } from "../phase-2/_verify-utils.mjs";

await runCommand(
  "bun run phase-2:gate:u00:no-legacy-cutover",
  "HQ declaration and server host direction check"
);

console.log("legacy composition authority removed");
