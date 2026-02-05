import fs from "node:fs/promises";
import path from "node:path";

export async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

export async function writeJsonFile(dir: string, fileName: string, data: unknown): Promise<string> {
  const abs = path.join(dir, fileName);
  await fs.writeFile(abs, JSON.stringify(data, null, 2), "utf8");
  return abs;
}

export async function writeTextFile(dir: string, fileName: string, data: string): Promise<string> {
  const abs = path.join(dir, fileName);
  await fs.writeFile(abs, data, "utf8");
  return abs;
}

