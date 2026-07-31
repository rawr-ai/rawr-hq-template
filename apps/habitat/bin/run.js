#!/usr/bin/env bun

import { fileURLToPath } from "node:url";
import { executeHabitat } from "../dist/application.js";

await executeHabitat({
  appRoot: fileURLToPath(new URL("..", import.meta.url)),
  workspaceRoot: process.cwd(),
});
