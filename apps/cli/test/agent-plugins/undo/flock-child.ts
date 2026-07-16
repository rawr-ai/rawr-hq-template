import { constants } from "node:fs";
import { open } from "node:fs/promises";

import { createBunFfiCapsuleAdvisoryLock } from "../../../src/lib/agent-plugins/undo/advisory-lock";

const lockPath = process.argv[2];
if (lockPath === undefined) throw new Error("lock path required");
const mode = process.argv[3] ?? "hold";

const handle = await open(lockPath, constants.O_RDWR | constants.O_NOFOLLOW);
const lock = createBunFfiCapsuleAdvisoryLock();
const acquired = await lock.acquire(handle.fd);
if (mode === "probe") {
  process.stdout.write(`${acquired.kind}\n`);
  if (acquired.kind === "Acquired") await lock.release(handle.fd);
  await handle.close();
  process.exit(0);
}
if (acquired.kind !== "Acquired") {
  process.stderr.write(`${JSON.stringify(acquired)}\n`);
  process.exit(2);
}
process.stdout.write("LOCKED\n");
process.on("SIGTERM", async () => {
  await lock.release(handle.fd);
  await handle.close();
  process.exit(0);
});
setInterval(() => undefined, 10_000);
