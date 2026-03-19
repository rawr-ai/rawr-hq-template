import type { Steward, Tension, SystemState } from "./types.js";

const MAX_FILE_LINES = 500;

function truncateContent(content: string): string {
  const lines = content.split("\n");
  if (lines.length <= MAX_FILE_LINES) return content;
  return lines.slice(0, MAX_FILE_LINES).join("\n") + "\n\n[... truncated ...]";
}

function formatTension(t: Tension): string {
  const assessments = Array.from(t.resonance.entries())
    .map(([sid, r]) => `    ${sid}: ${r.assessment} (weight ${r.weight}) — ${r.reason}`)
    .join("\n");

  return [
    `- [${t.id}] (${t.type}) ${t.description}`,
    `  Evidence: ${t.evidence.join("; ")}`,
    `  Polarity: ${t.polarity}, Magnitude: ${t.magnitude.toFixed(2)}`,
    `  Resolved: ${t.resolvedBy ?? "no"}`,
    assessments ? `  Resonance:\n${assessments}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function formatFileContents(
  paths: string[],
  files: Map<string, string>
): string {
  if (paths.length === 0) return "(no files yet)";
  return paths
    .map((p) => {
      const content = files.get(p);
      if (content == null) return `### ${p}\n(file not found)`;
      return `### ${p}\n\`\`\`\n${truncateContent(content)}\n\`\`\``;
    })
    .join("\n\n");
}

export function buildWorkPrompt(
  steward: Steward,
  state: SystemState
): { system: string; userMessage: string } {
  const otherStewards = Array.from(state.stewards.values())
    .filter((s) => s.id !== steward.id)
    .map(
      (s) =>
        `- ${s.name} (domain: ${s.domain}), owns: [${s.ownedPaths.join(", ")}]`
    )
    .join("\n");

  const unresolvedTensions = steward.ledger.filter((t) => !t.resolvedBy);
  const tensionSection =
    unresolvedTensions.length > 0
      ? unresolvedTensions.map(formatTension).join("\n\n")
      : "(no unresolved tensions)";

  const system = `You are a domain steward in an autonomous development system. You own a specific domain and are responsible for building, maintaining, and improving the code within your scope.

## Your Identity
- Name: ${steward.name}
- Domain: ${steward.domain}
- Owned files: [${steward.ownedPaths.join(", ")}]

## The Objective
${state.objective}

## Your Files
${formatFileContents(steward.ownedPaths, state.files)}

## Your Tension Ledger
${tensionSection}

## Other Stewards You're Aware Of
${otherStewards || "(you are the only steward)"}

## Your Session History
${steward.sessionHistory.length > 0 ? steward.sessionHistory.join("\n") : "(first round)"}

## Instructions

Do real work toward the objective. Write actual, working code.

CRITICAL: After doing work, examine what you built and LOG TENSIONS about anything that doesn't sit right:
- Code that handles two unrelated concerns in one file
- Coupling between things that should be independent
- Decisions you had to make that felt arbitrary
- Patterns that would be hard for another steward to understand
- Boundaries that feel wrong — too broad, too narrow, or misplaced
- Files growing beyond what one steward should own

You MUST log at least one tension per work cycle unless everything is genuinely clean. Tensions are how the system learns. Suppressing them is the worst thing you can do.

If tensions have accumulated enough that a boundary split would help, propose one. Be specific: name the new domain, which files it would own, and why the split is warranted.

If another steward's work is creating friction in your domain, log that as a tension too.

All file paths MUST be relative and start with "workspace/". You may only modify files you own. To create new files, use "write-file". To update existing files you own, use "modify-file".

Respond with a JSON object matching this schema:
{
  "reasoning": "string — think out loud about what to do",
  "actions": [
    { "type": "write-file", "path": "workspace/...", "content": "file content", "why": "reason" },
    { "type": "modify-file", "path": "workspace/...", "content": "new full file content", "why": "reason" },
    { "type": "log-tension", "tension": { "type": "friction|boundary-stress|coupling|contradiction|question", "description": "what doesn't sit right", "evidence": ["concrete observation 1", "..."] } },
    { "type": "propose-boundary", "newDomain": "scope description", "newName": "steward-name", "paths": ["workspace/..."], "reason": "why split" },
    { "type": "resolve-tension", "tensionId": "tension-id", "how": "what you did to resolve it" }
  ],
  "done": false
}

Respond with ONLY the JSON object. No markdown fences.`;

  const userMessage =
    state.round === 1
      ? "Begin working on the objective. Write the initial code and log any tensions you notice."
      : `Round ${state.round}. Continue working. Review your previous work, address any tensions, and make progress toward the objective.`;

  return { system, userMessage };
}

export function buildAssessmentPrompt(
  tension: Tension,
  assessor: Steward,
  files: Map<string, string>
): { system: string; userMessage: string } {
  const system = `You are steward "${assessor.name}" (domain: ${assessor.domain}).

Another steward logged this tension:
- From: steward "${tension.stewardId}" (domain: ${tension.domain})
- Type: ${tension.type}
- Description: ${tension.description}
- Evidence: ${tension.evidence.join("; ")}

Your files:
${formatFileContents(assessor.ownedPaths, files)}

Assess this tension FROM YOUR DOMAIN'S PERSPECTIVE:
- "agree" — you see the same structural problem from your side of the boundary
- "indifferent" — this doesn't affect your domain meaningfully
- "disagree" — resolving this tension the way it's framed would hurt your domain

Be honest. Indifference is a valid and important signal. Disagreement is the most valuable signal in the system.

Respond with ONLY a JSON object:
{
  "assessment": "agree" | "indifferent" | "disagree",
  "reason": "why you assessed this way",
  "logOwnTension": null | { "type": "friction|boundary-stress|coupling|contradiction|question", "description": "...", "evidence": ["..."] }
}`;

  const userMessage = "Assess the tension described above.";

  return { system, userMessage };
}
