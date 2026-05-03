#!/usr/bin/env bun
import { collectImportSites, finishVerification, pathExists } from "../phase-2/_verify-utils.mjs";

const failures = [];

for (const relPath of [
  "services/state",
  "packages/control-plane",
  "packages/journal",
  "packages/security",
]) {
  if (await pathExists(relPath)) {
    failures.push(`${relPath} must not exist in the live tree.`);
  }
}

const importSites = await collectImportSites([
  "@rawr/control-plane",
  "@rawr/journal",
  "@rawr/security",
  "@rawr/state",
]);

for (const site of importSites) {
  failures.push(`old operational owner import still live: ${site}`);
}

finishVerification({
  allowFindings: false,
  failures,
  successMessage: "old operational owner packages removed and imports eliminated",
  findingPrefix: "old operational owner package invariant",
});
