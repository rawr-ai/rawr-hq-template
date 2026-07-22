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
        // Session logs are append-only and may contain partial lines.
      }
    }
  } finally {
    rl.close();
    stream.close();
  }
}
