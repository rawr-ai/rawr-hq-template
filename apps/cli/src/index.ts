import { flush, handle, run } from "@oclif/core";
import { journalId, safePreview, writeEvent, writeSnippet, type JournalEvent, type JournalSnippet } from "@rawr/journal";
import { getJournalContext, resetJournalContext } from "./lib/journal-context";
import { findWorkspaceRoot } from "./lib/workspace-plugins";

class InterceptedExit extends Error {
  code: number;
  constructor(code: number) {
    super(`Intercepted process.exit(${code})`);
    this.code = code;
  }
}

function guessCommandId(argv: string[]): string | undefined {
  const first = argv.find((a) => !a.startsWith("-"));
  return first ? String(first) : undefined;
}

async function tryWriteJournal(opts: {
  cwd: string;
  argv: string[];
  exitCode: number;
  durationMs: number;
}): Promise<void> {
  const workspaceRoot = await findWorkspaceRoot(opts.cwd);
  if (!workspaceRoot) return;

  const nowIso = new Date().toISOString();
  const id = journalId();
  const ctx = getJournalContext();
  const commandId = guessCommandId(opts.argv);

  const event: JournalEvent = {
    id,
    ts: nowIso,
    cwd: opts.cwd,
    argv: opts.argv,
    commandId,
    exitCode: opts.exitCode,
    durationMs: opts.durationMs,
    artifacts: ctx.artifacts.length ? ctx.artifacts : undefined,
    steps: ctx.steps.length ? ctx.steps : undefined,
  };

  const cmd = ["rawr", ...opts.argv].join(" ").trim();
  const snippet: JournalSnippet = {
    id: `${id}-cmd`,
    ts: nowIso,
    kind: "command",
    title: cmd ? `$ ${cmd}` : "$ rawr",
    preview: safePreview(`exitCode=${opts.exitCode} durationMs=${opts.durationMs} cwd=${opts.cwd}`),
    body: [
      cmd ? `cmd: ${cmd}` : "cmd: rawr",
      `cwd: ${opts.cwd}`,
      `exitCode: ${opts.exitCode}`,
      `durationMs: ${opts.durationMs}`,
      ctx.steps.length ? `steps: ${ctx.steps.length}` : undefined,
    ]
      .filter(Boolean)
      .join("\n"),
    tags: ["command", commandId].filter((t): t is string => Boolean(t)),
    sourceEventId: id,
  };

  try {
    await writeEvent(workspaceRoot, event);
    await writeSnippet(workspaceRoot, snippet);
  } catch {
    // Best-effort; never block command execution on journaling.
  }
}

async function main(): Promise<void> {
  const startedAt = Date.now();
  const argv = process.argv.slice(2);
  const cwd = process.cwd();
  resetJournalContext();

  let exitCode = 0;
  const originalExit = process.exit;
  (process as any).exit = (code?: number) => {
    throw new InterceptedExit(typeof code === "number" ? code : 0);
  };

  try {
    await run(argv, import.meta.url);
    await flush();
  } catch (err) {
    if (err instanceof InterceptedExit) {
      exitCode = err.code;
    } else {
      try {
        handle(err as any);
      } catch (handleErr) {
        if (handleErr instanceof InterceptedExit) exitCode = handleErr.code;
        else throw handleErr;
      }
      if (exitCode === 0) exitCode = 1;
    }
  } finally {
    (process as any).exit = originalExit;
    process.exitCode = exitCode;
    await tryWriteJournal({
      cwd,
      argv,
      exitCode,
      durationMs: Date.now() - startedAt,
    });
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
