import type {
  HyperresearchAgentArtifactWrite,
  HyperresearchStepDefinition,
  HyperresearchStepRecord,
  HyperresearchV8RunLedger,
} from "../../../../model/entities";
import { nextPendingStep } from "./ledger";
import { expandV8ArtifactPath } from "./steps";

export type VaultTextWrite = {
  relativePath: string;
  content: string;
  preserveExisting?: boolean;
};

export function jsonContent(value: unknown) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function finalReportPath(ledger: Pick<HyperresearchV8RunLedger, "vaultTag">) {
  return `research/notes/final_report_${ledger.vaultTag}.md`;
}

export function relativeArtifactsFor(
  definition: HyperresearchStepDefinition,
  ledger: Pick<HyperresearchV8RunLedger, "vaultTag">
) {
  return definition.requiredArtifacts.map((artifact) =>
    expandV8ArtifactPath(artifact, ledger.vaultTag)
  );
}

export function recordStepArtifact(input: {
  step: HyperresearchStepRecord;
  relativePath: string;
}): void {
  if (!input.step.artifacts.includes(input.relativePath)) {
    input.step.artifacts.push(input.relativePath);
  }
}

function queryTerms(query: string): string[] {
  const candidates = [
    "serve()",
    "createFunction",
    "step.run",
    "step.waitForEvent",
    "step.sendEvent",
    "retries",
    "errors",
    "batching",
    "flow control",
    "local development",
    "signing keys",
    "/api/inngest",
    "Hooks",
    "MCP",
    "Codex",
    "Hyperresearch",
    "RAWR",
    "Inngest",
  ];
  const lowerQuery = query.toLowerCase();
  return candidates.filter((candidate) => lowerQuery.includes(candidate.toLowerCase()));
}

function sentenceAtoms(query: string): string[] {
  return query
    .split(/[.?!]\s+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function promptDecompositionContent(input: {
  ledger: HyperresearchV8RunLedger;
  step: HyperresearchStepRecord;
}) {
  const terms = queryTerms(input.ledger.canonicalQuery);
  const atoms = sentenceAtoms(input.ledger.canonicalQuery);
  return jsonContent({
    ok: true,
    generatedBy: "hyperresearch-codex-service",
    stepId: input.step.id,
    title: input.step.title,
    canonicalQuery: input.ledger.canonicalQuery,
    vaultTag: input.ledger.vaultTag,
    tier: input.ledger.tier,
    atomicItems: [
      ...atoms.map((atom, index) => ({
        id: `query-${index + 1}`,
        text: atom,
        source: "canonical-query",
      })),
      ...terms.map((term, index) => ({
        id: `term-${index + 1}`,
        text: `Address named topic: ${term}`,
        source: "named-query-term",
      })),
    ],
    namedTopics: terms,
    requiredEvidence: [
      "preserve source URL provenance for externally sourced claims",
      "preserve report claim trace for final material claims",
      "record uncertainty for scope boundaries that are not source-backed",
    ],
    proofBoundaries: [
      "do not claim Hooks/MCP runtime parity unless explicitly proven",
      "do not claim production runtime readiness from local or fixture-only proof",
    ],
  });
}

function coverageMatrixContent(input: {
  ledger: HyperresearchV8RunLedger;
  step: HyperresearchStepRecord;
}) {
  const atoms = sentenceAtoms(input.ledger.canonicalQuery);
  const terms = queryTerms(input.ledger.canonicalQuery);
  const rows = [
    "| Item | Coverage Target | Status |",
    "| --- | --- | --- |",
    ...atoms.map(
      (atom, index) =>
        `| query-${index + 1} | ${atom.replaceAll("|", "\\|")} | pending-source-evidence |`
    ),
    ...terms.map(
      (term, index) =>
        `| term-${index + 1} | ${term.replaceAll("|", "\\|")} | pending-source-evidence |`
    ),
    `| ${input.step.id} | ${input.step.title.replaceAll("|", "\\|")} | generated |`,
  ];
  return `${rows.join("\n")}\n`;
}

export function canonicalBootstrapWrites(input: {
  ledger: HyperresearchV8RunLedger;
  wrapperRequirements: string[];
}): VaultTextWrite[] {
  const queryRelativePath = `research/query-${input.ledger.vaultTag}.md`;
  return [
    {
      relativePath: queryRelativePath,
      content: [
        "---",
        `vault_tag: ${input.ledger.vaultTag}`,
        `created: ${input.ledger.createdAt}`,
        "source: codex-start-run",
        "---",
        "",
        input.ledger.canonicalQuery,
        "",
      ].join("\n"),
    },
    {
      relativePath: "research/scaffold.md",
      content: [
        "# Hyperresearch Codex Scaffold",
        "",
        "## User Prompt (VERBATIM)",
        "",
        input.ledger.canonicalQuery,
        "",
        "## Run Config",
        "",
        `- vault_tag: ${input.ledger.vaultTag}`,
        `- tier: ${input.ledger.tier}`,
        `- tier_source: ${input.ledger.tierSource ?? "unknown"}`,
        `- query_file_path: ${input.ledger.queryFilePath}`,
        "",
        "## Wrapper Requirements",
        "",
        ...(input.wrapperRequirements.length > 0
          ? input.wrapperRequirements.map((item) => `- ${item}`)
          : ["- none"]),
        "",
      ].join("\n"),
    },
  ];
}

/** Plans the deterministic fixture artifacts; the owning router performs the writes. */
export function fixtureStepArtifactWrites(input: {
  ledger: HyperresearchV8RunLedger;
  step: HyperresearchStepRecord;
  definition: HyperresearchStepDefinition;
}): VaultTextWrite[] {
  const firstSource = input.ledger.sourceCaptures[0]?.url;
  const fixtureClaim =
    input.ledger.tier === "full"
      ? "This fixture report proves the full-tier V8 control plane with critic, patch, polish, and readability gates."
      : "This fixture report proves the light-tier V8 control plane with source provenance placeholders and patch-only gates.";
  const writes: VaultTextWrite[] = relativeArtifactsFor(input.definition, input.ledger).map(
    (artifact) => ({
      relativePath: artifact,
      preserveExisting: artifact === finalReportPath(input.ledger),
      content:
        artifact === "research/prompt-decomposition.json"
          ? promptDecompositionContent({ ledger: input.ledger, step: input.step })
          : artifact === "research/temp/coverage-matrix.md"
            ? coverageMatrixContent({ ledger: input.ledger, step: input.step })
            : artifact === "research/claim-trace.json"
              ? jsonContent({
                  claims: [
                    {
                      claim: fixtureClaim,
                      reportLocation: finalReportPath(input.ledger),
                      sources: firstSource ? [{ url: firstSource }] : [],
                      confidence: firstSource ? "high" : "low",
                      reviewerDisposition: "fixture-control-plane-proof",
                      uncertainty: firstSource
                        ? undefined
                        : "Fixture backend did not capture a real source URL.",
                    },
                  ],
                })
              : artifact.endsWith(".json")
                ? jsonContent({
                    ok: true,
                    fixture: true,
                    stepId: input.step.id,
                    title: input.step.title,
                    canonicalQuery: input.ledger.canonicalQuery,
                    vaultTag: input.ledger.vaultTag,
                  })
                : [
                    `# ${input.step.title}`,
                    "",
                    `Step: ${input.step.id}`,
                    `Query: ${input.ledger.canonicalQuery}`,
                    `Vault tag: ${input.ledger.vaultTag}`,
                    "",
                  ].join("\n"),
    })
  );

  if (input.definition.id === "10-triple-draft" && input.ledger.tier === "light") {
    writes.push({
      relativePath: finalReportPath(input.ledger),
      content: [
        "# Hyperresearch Codex Light Fixture Report",
        "",
        `Query: ${input.ledger.canonicalQuery}`,
        "",
        "This fixture report proves the light-tier V8 control plane with source provenance placeholders and patch-only gates.",
        "",
      ].join("\n"),
    });
  }

  if (input.definition.id === "11-synthesize") {
    writes.push({
      relativePath: finalReportPath(input.ledger),
      content: [
        "# Hyperresearch Codex Full Fixture Report",
        "",
        `Query: ${input.ledger.canonicalQuery}`,
        "",
        "This fixture report proves the full-tier V8 control plane with critic, patch, polish, and readability gates.",
        "",
      ].join("\n"),
    });
  }

  return writes;
}

export function assertSafeAgentArtifactPath(relativePath: string): void {
  if (
    relativePath.startsWith("/") ||
    relativePath.trim() !== relativePath ||
    relativePath.split(/[\\/]+/).includes("..")
  ) {
    throw new Error(`Agent artifact path is not a safe relative path: ${relativePath}`);
  }
}

export function recordValidatedAgentArtifactWrite(input: {
  step: HyperresearchStepRecord;
  write: HyperresearchAgentArtifactWrite;
  artifactText: string | null;
  actualSha256?: string;
}): void {
  if (input.artifactText === null) {
    throw new Error(`Agent artifact write is missing on disk: ${input.write.path}`);
  }
  if (input.actualSha256 !== input.write.sha256) {
    throw new Error(`Agent artifact hash mismatch for ${input.write.path}`);
  }
  recordStepArtifact({ step: input.step, relativePath: input.write.path });
}

export function assertRequiredAgentArtifactsDeclared(input: {
  ledger: HyperresearchV8RunLedger;
  step: HyperresearchStepRecord;
  definition: HyperresearchStepDefinition;
  writtenPaths: ReadonlySet<string>;
}): void {
  for (const artifact of relativeArtifactsFor(input.definition, input.ledger)) {
    if (!input.writtenPaths.has(artifact)) {
      throw new Error(
        `Agent outputs did not declare required artifact for ${input.step.id}: ${artifact}`
      );
    }
  }
}

export function recordFinalReportSnapshot(input: {
  ledger: HyperresearchV8RunLedger;
  step: HyperresearchStepRecord;
  reportPath: string;
  snapshotPath: string;
  sha256: string;
  createdAt: string;
}): void {
  input.ledger.reportSnapshots ??= [];
  input.ledger.reportSnapshots.push({
    stepId: input.step.id,
    path: input.snapshotPath,
    sha256: input.sha256,
    createdAt: input.createdAt,
  });
  input.ledger.patchGuard = {
    snapshotPath: input.reportPath,
    snapshotSha256: input.sha256,
    violations: input.ledger.patchGuard?.violations ?? [],
  };
}

export function completeV8Step(input: {
  ledger: HyperresearchV8RunLedger;
  step: HyperresearchStepRecord;
  completedAt: string;
}): void {
  input.step.status = "complete";
  input.step.completedAt = input.completedAt;
  input.ledger.currentStepId = nextPendingStep(input.ledger)?.id;
  input.ledger.completed = input.ledger.steps.every((step) => step.status === "complete");
}
