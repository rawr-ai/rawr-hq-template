import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { expect, it } from "vitest";

it("runs reverse replay from canonical bytes in a fresh pinned Bun 1.3.14 process", () => {
  const fixture = fileURLToPath(new URL("./fixtures/bun-cold-resume.ts", import.meta.url));
  const child = spawnSync("bun", ["run", fixture], {
    encoding: "utf8",
    env: process.env,
  });

  expect(child.status, child.stderr).toBe(0);
  expect(child.stdout).toContain("bun-1.3.14 cold inverse replay: verified");
});
