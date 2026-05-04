import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type { HyperresearchCodexIO } from "@rawr/hyperresearch-codex/resources";

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.stat(filePath);
    return true;
  } catch {
    return false;
  }
}

export function createNodeHyperresearchIO(): HyperresearchCodexIO {
  return {
    now: () => new Date().toISOString(),
    randomId: (prefix) => `${prefix}-${crypto.randomUUID()}`,
    join: (...parts) => path.join(...parts),
    dirname: (filePath) => path.dirname(filePath),
    ensureDir: async (dirPath) => {
      await fs.mkdir(dirPath, { recursive: true });
    },
    pathExists,
    readTextFile: async (filePath) => {
      try {
        return await fs.readFile(filePath, "utf8");
      } catch {
        return null;
      }
    },
    writeTextFile: async (filePath, content) => {
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, content, "utf8");
    },
    readJsonFile: async (filePath) => {
      try {
        return JSON.parse(await fs.readFile(filePath, "utf8"));
      } catch {
        return null;
      }
    },
    writeJsonFile: async (filePath, data) => {
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
    },
    sha256: (content) => crypto.createHash("sha256").update(content).digest("hex"),
  };
}
