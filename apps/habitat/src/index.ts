import { executeHabitat } from "./application.js";
import { cliPackageRoot } from "./product-version.js";

await executeHabitat({
  appRoot: cliPackageRoot(),
  development: true,
  workspaceRoot: process.cwd(),
});
