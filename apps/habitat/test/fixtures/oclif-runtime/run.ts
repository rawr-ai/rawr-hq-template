import { startApp } from "@habitat-ai/sdk/app";
import { createOclifHost } from "../../../dist/host.js";
import { appRoot, entrypoint, record, sourceBundle } from "./app.js";

const host = createOclifHost({
  harnessId: "native.oclif",
  root: appRoot,
  sourceBundle,
  args: process.argv.slice(2),
});
const startup = startApp(entrypoint, {
  sources: { appRoot },
  integrations: [host.integration],
  finalization: { policy: "waitForNativeStop", deadlineMs: 0 },
  observation: {
    sink: {
      publish(event) {
        if (event.name?.startsWith("oclif.")) record(event.name);
      },
    },
  },
}).then((started) => {
  const root = process.env.HABITAT_FIXTURE_DATA;
  if (root === undefined) throw new Error("Missing native fixture data root.");
  writeFileSync(
    join(root, "ready-catalog.json"),
    JSON.stringify({
      selectedExecutionIds: sourceBundle.entries.map(({ ref }) => ref.executionId),
      catalog: started.catalog(),
    })
  );
  return started;
});
if (process.env.HABITAT_FIXTURE_CAPTURE === "1") {
  const previousExitCode = process.exitCode;
  try {
    const result = await host.run(startup);
    if (process.exitCode !== previousExitCode)
      throw new Error("Capture changed native exit status.");
    record(`captured:${JSON.stringify(result)}`);
  } catch (error) {
    if (process.exitCode !== previousExitCode)
      throw new Error("Capture changed native exit status.");
    record(`rejected:${error instanceof Error ? error.message : String(error)}`);
  }
} else {
  await host.execute(startup);
}

import { writeFileSync } from "node:fs";
import { join } from "node:path";
