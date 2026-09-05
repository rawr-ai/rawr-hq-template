import { provisionProcess } from "../../../runtime/substrate/effect/src/index";
import { produceProvisioningFixture } from "./provisioning-fixture";

const appRoot = process.argv[2];
const processId = process.argv[3];
if (appRoot === undefined || processId === undefined)
  throw new Error("Missing child fixture arguments");
const fixture = produceProvisioningFixture(appRoot, { processId, cohost: true });
const provisioned = await provisionProcess({
  compilation: fixture.compilation,
  bootgraph: fixture.bootgraph,
  sources: { appRoot },
});
try {
  const lease = provisioned.processResources.get(fixture.serverRequirement);
  process.stdout.write(
    `${JSON.stringify({ ...lease, acquisitions: fixture.calls.acquire, sameLease: lease === provisioned.processResources.get(fixture.asyncRequirement) })}\n`
  );
  for await (const _chunk of process.stdin) {
    /* EOF requests orderly native disposal. */
  }
} finally {
  await provisioned.managedRuntime.dispose();
}
