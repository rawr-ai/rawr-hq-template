import fs from "node:fs";
import path from "node:path";
import { decideStop, parseHookPayload, stopHookOutput } from "./logic";

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
  const decision = decideStop({
    payload: parseHookPayload(stdin),
    options: { ledgerPath: process.env.HYPERRESEARCH_CODEX_LEDGER },
  });
  appendLog(process.env.HYPERRESEARCH_HOOK_EVENT_LOG, JSON.stringify({
    event: "Stop",
    decision,
    at: new Date().toISOString(),
  }));
  const output = stopHookOutput(decision);
  if (output.stdout) process.stdout.write(output.stdout);
  if (output.stderr) process.stderr.write(output.stderr);
  process.exit(output.exitCode);
} catch (error) {
  process.stderr.write(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
