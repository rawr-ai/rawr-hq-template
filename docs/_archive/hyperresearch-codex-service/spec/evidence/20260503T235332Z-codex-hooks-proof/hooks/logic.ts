import fs from "node:fs";
import path from "node:path";

export type HookDecision =
  | {
      action: "allow";
      reason?: string;
    }
  | {
      action: "block";
      reason: string;
    }
  | {
      action: "error";
      reason: string;
    };

export type HookRuntimeOptions = {
  ledgerPath?: string;
  allowedSourceUrls?: readonly string[];
  env?: Record<string, string | undefined>;
  timeoutMs?: number;
  now?: () => number;
};

type HookPayload = Record<string, unknown>;

const URL_PATTERN = /https?:\/\/[^\s'")]+/gi;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function stringField(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function recordField(record: Record<string, unknown>, key: string): Record<string, unknown> | null {
  return asRecord(record[key]);
}

export function parseHookPayload(input: string): HookPayload {
  const parsed = JSON.parse(input) as unknown;
  const record = asRecord(parsed);
  if (!record) throw new Error("Hook payload must be a JSON object");
  return record;
}

export function preToolUseHookOutput(decision: HookDecision): { stdout: string; stderr: string; exitCode: number } {
  if (decision.action === "allow") {
    return { stdout: "", stderr: "", exitCode: 0 };
  }
  if (decision.action === "block") {
    return {
      stdout: JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "deny",
          permissionDecisionReason: decision.reason,
        },
      }),
      stderr: "",
      exitCode: 0,
    };
  }
  return { stdout: "", stderr: decision.reason, exitCode: 1 };
}

export function stopHookOutput(decision: HookDecision): { stdout: string; stderr: string; exitCode: number } {
  if (decision.action === "allow") {
    return { stdout: "", stderr: "", exitCode: 0 };
  }
  if (decision.action === "block") {
    return {
      stdout: JSON.stringify({ decision: "block", reason: decision.reason }),
      stderr: "",
      exitCode: 0,
    };
  }
  return { stdout: "", stderr: decision.reason, exitCode: 1 };
}

export function extractUrls(text: string): string[] {
  return [...text.matchAll(URL_PATTERN)].map((match) => match[0]);
}

function isLikelySourceBypass(command: string): boolean {
  const normalized = command.trim();
  return /\b(curl|wget)\b/i.test(normalized)
    || /\bpython(?:3)?\s+-c\b/i.test(normalized) && /https?:\/\//i.test(normalized)
    || /https?:\/\//i.test(normalized);
}

function isHyperresearchServiceCommand(command: string): boolean {
  return /\b(?:rawr|bun\s+run\s+(?:--cwd\s+\S+\s+)?rawr)\s+hyperresearch\s+codex\b/.test(command)
    || /\b(?:rawr|bun\s+run\s+(?:--cwd\s+\S+\s+)?rawr)\s+plugins\s+sync\s+hyperresearch\b/.test(command);
}

function isExplicitHyperresearchCaptureCommand(command: string): boolean {
  return /(?:^|\s)(?:HYPERRESEARCH_CODEX_CAPTURE|RAWR_HYPERRESEARCH_CAPTURE)=1(?:\s|$)/.test(command)
    || /\s--hyperresearch-capture(?:\s|$)/.test(command);
}

function missingRequiredEnvelope(payload: HookPayload): string | null {
  if (!stringField(payload, "session_id") && !stringField(payload, "session")) {
    return "Hook payload missing required field: session_id";
  }
  if (!stringField(payload, "turn_id") && !stringField(payload, "turn")) {
    return "Hook payload missing required field: turn_id";
  }
  for (const key of ["cwd", "model", "permission_mode"]) {
    if (!stringField(payload, key)) return `Hook payload missing required field: ${key}`;
  }
  const eventName = stringField(payload, "hook_event_name") ?? stringField(payload, "event");
  if (!eventName) return "Hook payload missing required field: hook_event_name";
  return null;
}

export function decidePreToolUse(input: {
  payload: HookPayload;
  options?: HookRuntimeOptions;
}): HookDecision {
  const envelopeError = missingRequiredEnvelope(input.payload);
  if (envelopeError) return { action: "error", reason: envelopeError };

  const eventName = stringField(input.payload, "hook_event_name") ?? stringField(input.payload, "event");
  if (eventName && eventName !== "PreToolUse") {
    return { action: "error", reason: `Unsupported hook event: ${eventName}` };
  }

  const toolName = stringField(input.payload, "tool_name");
  if (toolName !== "Bash") {
    return { action: "allow" };
  }

  const toolInput = asRecord(input.payload.tool_input);
  const command = toolInput ? stringField(toolInput, "command") : null;
  if (!command) return { action: "error", reason: "PreToolUse Bash payload missing tool_input.command" };

  if (isHyperresearchServiceCommand(command)) return { action: "allow" };
  if (isExplicitHyperresearchCaptureCommand(command)) {
    return { action: "allow", reason: "Command is explicitly marked as routed through Hyperresearch capture" };
  }
  if (!isLikelySourceBypass(command)) return { action: "allow" };

  const commandUrls = extractUrls(command);
  const allowed = new Set(input.options?.allowedSourceUrls ?? []);
  if (commandUrls.length > 0 && commandUrls.every((url) => allowed.has(url))) {
    return { action: "allow", reason: "Source URL is explicitly routed through Hyperresearch packet capture" };
  }

  return {
    action: "block",
    reason: "Hyperresearch source access must route through packet sourceUrls and service source capture before generic shell fetch/search commands run.",
  };
}

function resolveLedgerPath(payload: HookPayload, options?: HookRuntimeOptions): string | null {
  if (options?.ledgerPath) return options.ledgerPath;
  const env = options?.env ?? process.env;
  const envPath = env.HYPERRESEARCH_CODEX_LEDGER ?? env.RAWR_HYPERRESEARCH_CODEX_LEDGER;
  if (envPath) return envPath;
  const config = recordField(payload, "config");
  const hyperresearch = recordField(payload, "hyperresearch");
  const configuredPath = stringField(payload, "ledger_path")
    ?? stringField(payload, "ledgerPath")
    ?? (config ? stringField(config, "hyperresearchCodexLedgerPath") ?? stringField(config, "ledgerPath") : null)
    ?? (hyperresearch ? stringField(hyperresearch, "ledger_path") ?? stringField(hyperresearch, "ledgerPath") : null);
  if (configuredPath) return configuredPath;
  const cwd = stringField(payload, "cwd");
  return cwd ? path.join(cwd, "research", "temp", "hyperresearch-codex-run.json") : null;
}

function ledgerValidationMessage(ledger: Record<string, unknown>): string | null {
  if (ledger.completed !== true) return "Hyperresearch ledger is not complete";

  const steps = Array.isArray(ledger.steps) ? ledger.steps : [];
  const incompleteStep = steps.find((step) => {
    const record = asRecord(step);
    return !record || record.status !== "complete";
  });
  if (incompleteStep) return "Hyperresearch ledger has incomplete or failed steps";

  const failures = Array.isArray(ledger.failures) ? ledger.failures : [];
  if (failures.length > 0) return "Hyperresearch ledger records failures";

  const reviewDispositions = Array.isArray(ledger.reviewDispositions) ? ledger.reviewDispositions : [];
  const openReview = reviewDispositions.find((item) => {
    const record = asRecord(item);
    return record && record.severity === "blocking" && record.status !== "closed";
  });
  if (openReview) return "Hyperresearch ledger has open blocking review findings";

  const patchGuard = asRecord(ledger.patchGuard);
  const violations = patchGuard && Array.isArray(patchGuard.violations) ? patchGuard.violations : [];
  if (violations.length > 0) return "Hyperresearch patch guard has violations";

  const validation = asRecord(ledger.validation);
  const lastValidation = asRecord(ledger.lastValidation);
  const finalValidation = asRecord(ledger.finalValidation);
  const validationPassed = ledger.validationPassed === true
    || validation?.passed === true
    || lastValidation?.passed === true
    || finalValidation?.passed === true;
  if (!validationPassed) return "Hyperresearch ledger is complete but missing a passed validation marker";

  return null;
}

export function decideStop(input: {
  payload: HookPayload;
  options?: HookRuntimeOptions;
}): HookDecision {
  const envelopeError = missingRequiredEnvelope(input.payload);
  if (envelopeError) return { action: "error", reason: envelopeError };

  const eventName = stringField(input.payload, "hook_event_name") ?? stringField(input.payload, "event");
  if (eventName && eventName !== "Stop") {
    return { action: "error", reason: `Unsupported hook event: ${eventName}` };
  }

  const ledgerPath = resolveLedgerPath(input.payload, input.options);
  if (!ledgerPath) {
    return { action: "block", reason: "Hyperresearch Stop guard could not resolve a ledger path" };
  }
  if (!fs.existsSync(ledgerPath)) {
    return { action: "block", reason: `Hyperresearch Stop guard could not find ledger: ${ledgerPath}` };
  }

  let ledger: unknown;
  try {
    ledger = JSON.parse(fs.readFileSync(ledgerPath, "utf8")) as unknown;
  } catch {
    return { action: "block", reason: `Hyperresearch Stop guard could not parse ledger: ${ledgerPath}` };
  }

  const record = asRecord(ledger);
  if (!record) return { action: "block", reason: `Hyperresearch ledger is not a JSON object: ${ledgerPath}` };

  const validationMessage = ledgerValidationMessage(record);
  if (validationMessage) {
    return { action: "block", reason: `${validationMessage}: ${ledgerPath}` };
  }

  return { action: "allow" };
}

export function classifyHookTimeout(input: {
  startedAtMs: number;
  completedAtMs: number;
  timeoutMs: number;
}): HookDecision {
  if (input.completedAtMs - input.startedAtMs > input.timeoutMs) {
    return { action: "error", reason: `Hook exceeded timeout of ${input.timeoutMs}ms` };
  }
  return { action: "allow" };
}
