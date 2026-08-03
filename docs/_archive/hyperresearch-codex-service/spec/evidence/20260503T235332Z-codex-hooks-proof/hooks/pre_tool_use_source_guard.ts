import fs from "node:fs";
import path from "node:path";
import { decidePreToolUse, parseHookPayload, preToolUseHookOutput } from "./logic";

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

function appendLog(filePath: string | undefined, content: string) {
  if (!filePath) return;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.appendFileSync(filePath, `${content}\n`);
}

try {
  const stdin = await readStdin();
  appendLog(process.env.HYPERRESEARCH_HOOK_PAYLOAD_LOG, stdin);
  const allowedSourceUrls = (process.env.HYPERRESEARCH_ALLOWED_SOURCE_URLS ?? "")
    .split(/\s+/)
    .filter(Boolean);
  const decision = decidePreToolUse({
    payload: parseHookPayload(stdin),
    options: { allowedSourceUrls },
  });
  appendLog(process.env.HYPERRESEARCH_HOOK_EVENT_LOG, JSON.stringify({
    event: "PreToolUse",
    decision,
    at: new Date().toISOString(),
  }));
  const output = preToolUseHookOutput(decision);
  if (output.stdout) process.stdout.write(output.stdout);
  if (output.stderr) process.stderr.write(output.stderr);
  process.exit(output.exitCode);
} catch (error) {
  process.stderr.write(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
