import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const testDir = dirname(fileURLToPath(import.meta.url));
const srcDir = join(testDir, "..", "src");

function walk(dir: string, out: string[] = []) {
  for (const entry of readdirSync(dir)) {
    const abs = join(dir, entry);
    const st = statSync(abs);
    if (st.isDirectory()) walk(abs, out);
    else out.push(abs);
  }
  return out;
}

function toPosixPath(p: string) {
  return p.replaceAll("\\", "/");
}

describe("vite env hygiene", () => {
  it("does not use `process.env` in client code", () => {
    for (const file of walk(srcDir)) {
      const contents = readFileSync(file, "utf8");
      expect(contents.includes("process.env")).toBe(false);
    }
  });

  it("restricts `import.meta.env` usage to a single module", () => {
    const allowed = new Set(["ui/config/publicEnv.ts"]);

    for (const file of walk(srcDir)) {
      const rel = toPosixPath(relative(srcDir, file));
      const contents = readFileSync(file, "utf8");
      if (!contents.includes("import.meta.env")) continue;

      expect(allowed.has(rel)).toBe(true);
      expect(contents).not.toMatch(/=\s*import\.meta\.env\s*[;)]/);
      expect(contents).not.toMatch(/\{\s*[^}]*\}\s*=\s*import\.meta\.env/);
    }
  });
});

