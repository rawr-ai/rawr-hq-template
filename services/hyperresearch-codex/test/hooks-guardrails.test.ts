import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  classifyHookTimeout,
  decidePreToolUse,
  decideStop,
  parseHookPayload,
  preToolUseHookOutput,
  stopHookOutput,
} from "../spec/fixtures/hooks/logic";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

async function makeTempDir() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "hyperresearch-hooks-test-"));
  tempDirs.push(dir);
  return dir;
}

function basePayload(overrides: Record<string, unknown> = {}) {
  return {
    hook_event_name: "PreToolUse",
    session_id: "session-1",
    turn_id: "turn-1",
    cwd: "/tmp/hyperresearch-hooks-test",
    permission_mode: "default",
    model: "gpt-5.5",
    ...overrides,
  };
}

function stopPayload(cwd: string, overrides: Record<string, unknown> = {}) {
  return basePayload({
    hook_event_name: "Stop",
    cwd,
    stop_hook_active: true,
    last_assistant_message: "done",
    ...overrides,
  });
}

async function writeLedger(root: string, ledger: Record<string, unknown>) {
  const ledgerPath = path.join(root, "research", "temp", "hyperresearch-codex-run.json");
  await fs.mkdir(path.dirname(ledgerPath), { recursive: true });
  await fs.writeFile(ledgerPath, JSON.stringify(ledger, null, 2), "utf8");
  return ledgerPath;
}

function greenLedger(overrides: Record<string, unknown> = {}) {
  return {
    version: 2,
    runId: "run-hooks",
    completed: true,
    steps: [
      { id: "01-decompose", status: "complete" },
      { id: "16-readability-audit", status: "complete" },
    ],
    failures: [],
    reviewDispositions: [],
    patchGuard: { violations: [] },
    validation: { passed: true },
    ...overrides,
  };
}

describe("Hyperresearch Codex hook guardrails", () => {
  it("rejects malformed JSON payloads", () => {
    expect(() => parseHookPayload("{")).toThrow("Expected property name");
  });

  it("rejects unsupported hook events", () => {
    expect(decidePreToolUse({
      payload: basePayload({ hook_event_name: "PostToolUse" }),
    })).toEqual({
      action: "error",
      reason: "Unsupported hook event: PostToolUse",
    });
  });

  it("accepts event/session/turn aliases from observed Codex payloads", () => {
    expect(decidePreToolUse({
      payload: {
        event: "PreToolUse",
        session: "session-1",
        turn: "turn-1",
        cwd: "/tmp/hyperresearch-hooks-test",
        permission_mode: "default",
        model: "gpt-5.5",
        tool_name: "Bash",
        tool_input: { command: "echo ok" },
      },
    })).toEqual({ action: "allow" });
  });

  it("requires Bash command text for PreToolUse Bash payloads", () => {
    expect(decidePreToolUse({
      payload: basePayload({ tool_name: "Bash", tool_input: {} }),
    })).toEqual({
      action: "error",
      reason: "PreToolUse Bash payload missing tool_input.command",
    });
  });

  it("blocks obvious generic URL fetches with a non-empty permission reason", () => {
    const decision = decidePreToolUse({
      payload: basePayload({
        tool_name: "Bash",
        tool_input: { command: "curl https://example.com/source" },
      }),
    });

    expect(decision.action).toBe("block");
    if (decision.action !== "block") throw new Error("expected block");
    expect(decision.reason).toContain("packet sourceUrls");

    const output = preToolUseHookOutput(decision);
    expect(output.exitCode).toBe(0);
    expect(JSON.parse(output.stdout)).toMatchObject({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
      },
    });
  });

  it("blocks python URL fetches", () => {
    expect(decidePreToolUse({
      payload: basePayload({
        tool_name: "Bash",
        tool_input: { command: "python -c \"import urllib.request; urllib.request.urlopen('https://example.com')\"" },
      }),
    }).action).toBe("block");
  });

  it("blocks direct URL commands even without curl or wget", () => {
    expect(decidePreToolUse({
      payload: basePayload({
        tool_name: "Bash",
        tool_input: { command: "node ./tools/read-source.js https://example.com/source" },
      }),
    }).action).toBe("block");
  });

  it("allows Hyperresearch service commands", () => {
    expect(decidePreToolUse({
      payload: basePayload({
        tool_name: "Bash",
        tool_input: { command: "bun run --cwd apps/cli rawr hyperresearch codex validate --ledger /tmp/run.json --backend fixture --json" },
      }),
    })).toEqual({ action: "allow" });
  });

  it("allows explicitly routed source URLs", () => {
    expect(decidePreToolUse({
      payload: basePayload({
        tool_name: "Bash",
        tool_input: { command: "curl https://example.com/source" },
      }),
      options: {
        allowedSourceUrls: ["https://example.com/source"],
      },
    })).toEqual({
      action: "allow",
      reason: "Source URL is explicitly routed through Hyperresearch packet capture",
    });
  });

  it("allows source commands explicitly marked by Hyperresearch capture env convention", () => {
    expect(decidePreToolUse({
      payload: basePayload({
        tool_name: "Bash",
        tool_input: { command: "HYPERRESEARCH_CODEX_CAPTURE=1 python -c \"print('https://example.com/source')\"" },
      }),
    })).toEqual({
      action: "allow",
      reason: "Command is explicitly marked as routed through Hyperresearch capture",
    });
  });

  it("blocks Stop when the ledger is missing", async () => {
    const root = await makeTempDir();
    const decision = decideStop({ payload: stopPayload(root) });
    expect(decision.action).toBe("block");
    if (decision.action !== "block") throw new Error("expected block");
    expect(decision.reason).toContain("could not find ledger");
    expect(JSON.parse(stopHookOutput(decision).stdout)).toMatchObject({
      decision: "block",
    });
    expect(decision.reason.length).toBeGreaterThan(0);
  });

  it("blocks Stop when the ledger is incomplete", async () => {
    const root = await makeTempDir();
    await writeLedger(root, greenLedger({
      completed: false,
      steps: [{ id: "01-decompose", status: "complete" }],
    }));

    const decision = decideStop({ payload: stopPayload(root) });
    expect(decision.action).toBe("block");
    if (decision.action !== "block") throw new Error("expected block");
    expect(decision.reason).toContain("not complete");
  });

  it("blocks Stop when validation state is red", async () => {
    const root = await makeTempDir();
    await writeLedger(root, greenLedger({
      reviewDispositions: [{
        id: "finding-1",
        severity: "blocking",
        status: "open",
      }],
    }));

    const decision = decideStop({ payload: stopPayload(root) });
    expect(decision.action).toBe("block");
    if (decision.action !== "block") throw new Error("expected block");
    expect(decision.reason).toContain("open blocking review findings");
  });

  it("blocks Stop when completed ledger is missing a passed validation marker", async () => {
    const root = await makeTempDir();
    await writeLedger(root, greenLedger({
      validation: undefined,
      validationPassed: false,
    }));

    const decision = decideStop({ payload: stopPayload(root) });
    expect(decision.action).toBe("block");
    if (decision.action !== "block") throw new Error("expected block");
    expect(decision.reason).toContain("missing a passed validation marker");
  });

  it("uses env/config ledger paths before cwd fallback for Stop", async () => {
    const cwdRoot = await makeTempDir();
    const configRoot = await makeTempDir();
    const envRoot = await makeTempDir();
    await writeLedger(cwdRoot, greenLedger({ completed: false }));
    const configLedger = await writeLedger(configRoot, greenLedger());
    const envLedger = await writeLedger(envRoot, greenLedger());

    const envDecision = decideStop({
      payload: stopPayload(cwdRoot, {
        config: { hyperresearchCodexLedgerPath: configLedger },
      }),
      options: {
        env: { HYPERRESEARCH_CODEX_LEDGER: envLedger },
      },
    });
    expect(envDecision).toEqual({ action: "allow" });

    const configDecision = decideStop({
      payload: stopPayload(cwdRoot, {
        config: { hyperresearchCodexLedgerPath: configLedger },
      }),
      options: {
        env: {},
      },
    });
    expect(configDecision).toEqual({ action: "allow" });
  });

  it("allows Stop when the ledger is green", async () => {
    const root = await makeTempDir();
    const ledgerPath = await writeLedger(root, greenLedger());
    const before = await fs.readFile(ledgerPath, "utf8");

    const decision = decideStop({ payload: stopPayload(root) });
    const after = await fs.readFile(ledgerPath, "utf8");
    expect(decision).toEqual({ action: "allow" });
    expect(stopHookOutput(decision)).toEqual({ stdout: "", stderr: "", exitCode: 0 });
    expect(after).toBe(before);
  });

  it("classifies hook timeout as diagnostic error", () => {
    expect(classifyHookTimeout({
      startedAtMs: 0,
      completedAtMs: 5_001,
      timeoutMs: 5_000,
    })).toEqual({
      action: "error",
      reason: "Hook exceeded timeout of 5000ms",
    });
  });
});
