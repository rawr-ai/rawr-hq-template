import fs from "node:fs";
import readline from "node:readline";

export async function* readJsonlObjects(filePath: string): AsyncGenerator<unknown> {
  const stream = fs.createReadStream(filePath, { encoding: "utf8" });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  try {
    for await (const line of rl) {
      const trimmed = String(line).trim();
      if (!trimmed) continue;
      try {
        yield JSON.parse(trimmed) as unknown;
      } catch {
        // ignore parse errors
      }
    }
  } finally {
    rl.close();
    stream.close();
  }
}

export async function readFirstJsonlObject(filePath: string): Promise<unknown | null> {
  for await (const obj of readJsonlObjects(filePath)) {
    return obj;
  }
  return null;
}

