import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const testDir = path.dirname(fileURLToPath(import.meta.url));

describe("@rawr/plugin-plugins", () => {
  it("keeps sweep candidate classification out of the projection command", async () => {
    const commandSource = await fs.readFile(
      path.join(testDir, "..", "src", "commands", "plugins", "sweep.ts"),
      "utf8",
    );

    expect(commandSource).toContain("planSweepCandidates");
    expect(commandSource).not.toContain("inferTypeFromPath");
  });
});
