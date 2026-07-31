import { fileURLToPath } from "node:url";
import { executeHabitat } from "./application.js";

await executeHabitat({
  appRoot: fileURLToPath(new URL("..", import.meta.url)),
  development: true,
  workspaceRoot: process.cwd(),
});
