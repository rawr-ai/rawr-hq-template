import { runHyperresearchCli } from "../../../common/adapters/hyperresearch-cli";
import type {
  HyperresearchAgentOutput,
  HyperresearchSourceCapture,
  HyperresearchStepDefinition,
  HyperresearchV8RunLedger,
} from "../../../common/entities";
import type {
  HyperresearchCliBackend,
  HyperresearchCodexIO,
} from "../../../common/resources";

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Collects the parent-owned source capture set from agent outputs.
 *
 * Agent packets may suggest sources, but the service remains responsible for
 * rejecting malformed URLs and turning every distinct source into CLI-audited
 * vault capture.
 */
type SourceSuggestion = {
  url: string;
  suggestedByAgentJobIds: string[];
  evidence: string[];
};

function addUnique(target: string[], values: string[]) {
  for (const value of values) {
    if (!target.includes(value)) target.push(value);
  }
}

function addUniqueNumber(target: number[], values: number[]) {
  for (const value of values) {
    if (!target.includes(value)) target.push(value);
  }
}

function sourceSuggestionsFromAgentOutputs(agentOutputs: HyperresearchAgentOutput[]): SourceSuggestion[] {
  const suggestions = new Map<string, SourceSuggestion>();
  const ensure = (url: string) => {
    const existing = suggestions.get(url);
    if (existing) return existing;
    const next = {
      url,
      suggestedByAgentJobIds: [],
      evidence: [],
    };
    suggestions.set(url, next);
    return next;
  };

  for (const output of agentOutputs) {
    for (const url of output.sourceUrls ?? []) {
      if (!isHttpUrl(url)) {
        throw new Error(`Agent output contains an invalid source URL for ${output.jobId}: ${url}`);
      }
      const suggestion = ensure(url);
      addUnique(suggestion.suggestedByAgentJobIds, [output.jobId]);
      addUnique(suggestion.evidence, [url, ...output.evidence.filter(isHttpUrl)]);
    }
    for (const evidence of output.evidence) {
      if (!isHttpUrl(evidence)) continue;
      const suggestion = ensure(evidence);
      addUnique(suggestion.suggestedByAgentJobIds, [output.jobId]);
      addUnique(suggestion.evidence, [evidence]);
    }
  }
  return [...suggestions.values()];
}

function valuesFromJsonFields(input: { text?: string; fields: string[] }): string[] {
  if (!input.text) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(input.text);
  } catch {
    return [];
  }

  const values = new Set<string>();
  const visit = (value: unknown) => {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (!value || typeof value !== "object") return;
    const record = value as Record<string, unknown>;
    for (const field of input.fields) {
      const fieldValue = record[field];
      if (typeof fieldValue === "string" && fieldValue.length > 0) values.add(fieldValue);
      if (Array.isArray(fieldValue)) {
        for (const item of fieldValue) {
          if (typeof item === "string" && item.length > 0) values.add(item);
        }
      }
    }
    Object.values(record).forEach(visit);
  };
  visit(parsed);
  return [...values];
}

function ensureSourceCapture(input: {
  ledger: HyperresearchV8RunLedger;
  stepId: string;
  suggestion: SourceSuggestion;
  io: HyperresearchCodexIO;
}): HyperresearchSourceCapture {
  let capture = input.ledger.sourceCaptures.find((item) => item.url === input.suggestion.url);
  if (!capture) {
    capture = {
      url: input.suggestion.url,
      stepIds: [],
      suggestedByAgentJobIds: [],
      evidence: [],
      cliCallIndexes: [],
      capturedAt: input.io.now(),
    };
    input.ledger.sourceCaptures.push(capture);
  }
  addUnique(capture.stepIds, [input.stepId]);
  addUnique(capture.suggestedByAgentJobIds, input.suggestion.suggestedByAgentJobIds);
  addUnique(capture.evidence, input.suggestion.evidence);
  return capture;
}

function recordFetchCall(input: {
  capture: HyperresearchSourceCapture;
  callIndex: number;
  stdout?: string;
}) {
  addUniqueNumber(input.capture.cliCallIndexes, [input.callIndex]);
  const noteIds = valuesFromJsonFields({
    text: input.stdout,
    fields: ["noteId", "note_id", "noteIds", "note_ids"],
  });
  const sourceIds = valuesFromJsonFields({
    text: input.stdout,
    fields: ["sourceId", "source_id", "sourceIds", "source_ids"],
  });
  if (noteIds.length > 0) {
    input.capture.noteIds = input.capture.noteIds ?? [];
    addUnique(input.capture.noteIds, noteIds);
  }
  if (sourceIds.length > 0) {
    input.capture.sourceIds = input.capture.sourceIds ?? [];
    addUnique(input.capture.sourceIds, sourceIds);
  }
}

function alreadyCaptured(capture: HyperresearchSourceCapture): boolean {
  return capture.cliCallIndexes.length > 0;
}

/**
 * Executes the backend operations that make a step auditable in the vault.
 *
 * Source fetches are intentionally expanded into one ledgered CLI call per URL
 * so packet-mode fan-in cannot silently drop a source suggested by an agent.
 */
export async function runRequiredCliForStep(input: {
  definition: HyperresearchStepDefinition;
  ledger: HyperresearchV8RunLedger;
  io: HyperresearchCodexIO;
  cli: HyperresearchCliBackend;
  agentOutputs?: HyperresearchAgentOutput[];
}) {
  const sourceSuggestions = sourceSuggestionsFromAgentOutputs(input.agentOutputs ?? []);
  const sourceUrls = sourceSuggestions.map((suggestion) => suggestion.url);
  for (const operation of input.definition.requiredCliOperations ?? []) {
    const args = (() => {
      if (operation === "search") return [input.ledger.canonicalQuery, "--json"];
      if (operation === "fetch") {
        if (!sourceUrls[0]) throw new Error(`Step ${input.definition.id} requires a source URL for Hyperresearch fetch`);
        return undefined;
      }
      if (operation === "fetch-batch") {
        if (sourceUrls.length === 0) throw new Error(`Step ${input.definition.id} requires source URLs for Hyperresearch fetch-batch`);
        return [...sourceUrls, "--json"];
      }
      if (operation === "note") return ["new", "--json", "Hyperresearch Codex V8 fixture source"];
      if (operation === "lint") return ["--json"];
      if (operation === "sync") return ["--json"];
      if (operation === "export") return ["json", "--json"];
      return ["--json"];
    })();
    if (operation === "fetch") {
      for (const suggestion of sourceSuggestions) {
        const capture = ensureSourceCapture({
          ledger: input.ledger,
          stepId: input.definition.id,
          suggestion,
          io: input.io,
        });
        if (alreadyCaptured(capture)) continue;
        const callIndex = input.ledger.cliCalls.length;
        const call = await runHyperresearchCli({
          operation,
          args: [suggestion.url, "--json"],
          cwd: input.ledger.vaultRoot,
          io: input.io,
          cli: input.cli,
          ledger: input.ledger,
          throwOnFailure: true,
        });
        recordFetchCall({
          capture,
          callIndex,
          stdout: call.stdout,
        });
      }
      continue;
    }

    if (operation === "fetch-batch") {
      const uncaptured = sourceSuggestions
        .map((suggestion) => ({
          suggestion,
          capture: ensureSourceCapture({
            ledger: input.ledger,
            stepId: input.definition.id,
            suggestion,
            io: input.io,
          }),
        }))
        .filter(({ capture }) => !alreadyCaptured(capture));
      if (uncaptured.length === 0) continue;
      const callIndex = input.ledger.cliCalls.length;
      const call = await runHyperresearchCli({
        operation,
        args: [...uncaptured.map(({ suggestion }) => suggestion.url), "--json"],
        cwd: input.ledger.vaultRoot,
        io: input.io,
        cli: input.cli,
        ledger: input.ledger,
        throwOnFailure: true,
      });
      for (const { capture } of uncaptured) {
        recordFetchCall({
          capture,
          callIndex,
          stdout: call.stdout,
        });
      }
      continue;
    }

    await runHyperresearchCli({
      operation,
      args: args ?? ["--json"],
      cwd: input.ledger.vaultRoot,
      io: input.io,
      cli: input.cli,
      ledger: input.ledger,
      throwOnFailure: true,
    });
  }
}
