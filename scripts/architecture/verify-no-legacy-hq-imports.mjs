#!/usr/bin/env bun
import { collectImportSites, finishVerification, pathExists } from "../phase-2/_verify-utils.mjs";

const failures = [];

if (await pathExists("packages/hq")) {
  failures.push("packages/hq must not exist in the live tree.");
}

const importSites = await collectImportSites(["@rawr/hq"]);

for (const site of importSites) {
  failures.push(`legacy @rawr/hq facade import still live: ${site}`);
}

finishVerification({
  allowFindings: false,
  failures,
  successMessage: "legacy @rawr/hq facade imports are fully removed",
  findingPrefix: "legacy @rawr/hq facade invariant",
});
