import { nextPendingStep } from "./ledger";
import { expandV8ArtifactPath } from "./steps";
import type {
  HyperresearchAgentOutput,
  HyperresearchStepDefinition,
  HyperresearchStepRecord,
  HyperresearchV8RunLedger,
} from "../../../shared/entities";
import type { HyperresearchCodexIO } from "../../../shared/resources";

export function jsonContent(value: unknown) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export async function writeVaultText(input: {
  ledger: Pick<HyperresearchV8RunLedger, "vaultRoot">;
  relativePath: string;
  content: string;
  io: HyperresearchCodexIO;
}) {
  await input.io.writeTextFile(input.io.join(input.ledger.vaultRoot, input.relativePath), input.content);
}

export async function readVaultText(input: {
  ledger: Pick<HyperresearchV8RunLedger, "vaultRoot">;
  relativePath: string;
  io: HyperresearchCodexIO;
}) {
  return await input.io.readTextFile(input.io.join(input.ledger.vaultRoot, input.relativePath));
}

export function finalReportPath(ledger: Pick<HyperresearchV8RunLedger, "vaultTag">) {
  return `research/notes/final_report_${ledger.vaultTag}.md`;
}

function relativeArtifactsFor(
  definition: HyperresearchStepDefinition,
  ledger: Pick<HyperresearchV8RunLedger, "vaultTag">,
) {
  return definition.requiredArtifacts.map((artifact) => expandV8ArtifactPath(artifact, ledger.vaultTag));
}

function addArtifact(step: HyperresearchStepRecord, relativePath: string) {
  if (!step.artifacts.includes(relativePath)) step.artifacts.push(relativePath);
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
    ...atoms.map((atom, index) => `| query-${index + 1} | ${atom.replaceAll("|", "\\|")} | pending-source-evidence |`),
    ...terms.map((term, index) => `| term-${index + 1} | ${term.replaceAll("|", "\\|")} | pending-source-evidence |`),
    `| ${input.step.id} | ${input.step.title.replaceAll("|", "\\|")} | generated |`,
  ];
  return `${rows.join("\n")}\n`;
}

function isSafeRelativeArtifactPath(relativePath: string): boolean {
  if (relativePath.startsWith("/") || relativePath.trim() !== relativePath) return false;
  return !relativePath.split(/[\\/]+/).includes("..");
}

async function validateAgentArtifactWrites(input: {
  ledger: HyperresearchV8RunLedger;
  step: HyperresearchStepRecord;
  definition: HyperresearchStepDefinition;
  agentOutputs: HyperresearchAgentOutput[];
  io: HyperresearchCodexIO;
}) {
  const requiredArtifacts = relativeArtifactsFor(input.definition, input.ledger);
  const writes = input.agentOutputs.flatMap((output) => output.artifactWrites ?? []);
  const writtenPaths = new Set<string>();

  for (const write of writes) {
    if (!isSafeRelativeArtifactPath(write.path)) {
      throw new Error(`Agent artifact path is not a safe relative path: ${write.path}`);
    }
    const artifactText = await input.io.readTextFile(input.io.join(input.ledger.vaultRoot, write.path));
    if (artifactText === null) {
      throw new Error(`Agent artifact write is missing on disk: ${write.path}`);
    }
    const actualSha = input.io.sha256(artifactText);
    if (actualSha !== write.sha256) {
      throw new Error(`Agent artifact hash mismatch for ${write.path}`);
    }
    writtenPaths.add(write.path);
    addArtifact(input.step, write.path);
  }

  for (const artifact of requiredArtifacts) {
    if (!writtenPaths.has(artifact)) {
      throw new Error(`Agent outputs did not declare required artifact for ${input.step.id}: ${artifact}`);
    }
  }
}

async function snapshotFinalReport(input: {
  ledger: HyperresearchV8RunLedger;
  step: HyperresearchStepRecord;
  io: HyperresearchCodexIO;
}) {
  const reportPath = finalReportPath(input.ledger);
  const report = await readVaultText({ ledger: input.ledger, relativePath: reportPath, io: input.io });
  if (!report) return;

  const sha256 = input.io.sha256(report);
  const snapshotPath = `research/temp/report-snapshots/${input.step.id}-${sha256}.md`;
  await writeVaultText({
    ledger: input.ledger,
    relativePath: snapshotPath,
    io: input.io,
    content: report,
  });
  input.ledger.reportSnapshots ??= [];
  input.ledger.reportSnapshots.push({
    stepId: input.step.id,
    path: snapshotPath,
    sha256,
    createdAt: input.io.now(),
  });
  input.ledger.patchGuard = {
    snapshotPath: reportPath,
    snapshotSha256: sha256,
    violations: input.ledger.patchGuard?.violations ?? [],
  };
}

export async function writeCanonicalBootstrap(input: {
  ledger: HyperresearchV8RunLedger;
  wrapperRequirements: string[];
  io: HyperresearchCodexIO;
}) {
  const queryRelativePath = `research/query-${input.ledger.vaultTag}.md`;
  input.ledger.queryFilePath = input.io.join(input.ledger.vaultRoot, queryRelativePath);
  await writeVaultText({
    ledger: input.ledger,
    relativePath: queryRelativePath,
    io: input.io,
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
  });
  await writeVaultText({
    ledger: input.ledger,
    relativePath: "research/scaffold.md",
    io: input.io,
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
  });
}

/**
 * Writes deterministic fixture artifacts and snapshots the first final report.
 *
 * The fixture backend is allowed to synthesize artifacts for control-plane
 * proof, but report snapshots are real integrity inputs used by validation.
 */
export async function writeStepArtifacts(input: {
  ledger: HyperresearchV8RunLedger;
  step: HyperresearchStepRecord;
  definition: HyperresearchStepDefinition;
  io: HyperresearchCodexIO;
}) {
  const artifacts = relativeArtifactsFor(input.definition, input.ledger);
  for (const artifact of artifacts) {
    if (artifact === finalReportPath(input.ledger) && await input.io.pathExists(input.io.join(input.ledger.vaultRoot, artifact))) {
      addArtifact(input.step, artifact);
      continue;
    }
    const firstSource = input.ledger.sourceCaptures[0]?.url;
    const fixtureClaim = input.ledger.tier === "full"
      ? "This fixture report proves the full-tier V8 control plane with critic, patch, polish, and readability gates."
      : "This fixture report proves the light-tier V8 control plane with source provenance placeholders and patch-only gates.";
    const content = artifact === "research/prompt-decomposition.json"
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
              uncertainty: firstSource ? undefined : "Fixture backend did not capture a real source URL.",
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
        ].join("\n");
    await writeVaultText({ ledger: input.ledger, relativePath: artifact, content, io: input.io });
    addArtifact(input.step, artifact);
  }

  if (input.definition.id === "10-triple-draft" && input.ledger.tier === "light") {
    const reportPath = finalReportPath(input.ledger);
    await writeVaultText({
      ledger: input.ledger,
      relativePath: reportPath,
      io: input.io,
      content: [
        "# Hyperresearch Codex Light Fixture Report",
        "",
        `Query: ${input.ledger.canonicalQuery}`,
        "",
        "This fixture report proves the light-tier V8 control plane with source provenance placeholders and patch-only gates.",
        "",
      ].join("\n"),
    });
    addArtifact(input.step, reportPath);
  }

  if (input.definition.id === "11-synthesize") {
    const reportPath = finalReportPath(input.ledger);
    await writeVaultText({
      ledger: input.ledger,
      relativePath: reportPath,
      io: input.io,
      content: [
        "# Hyperresearch Codex Full Fixture Report",
        "",
        `Query: ${input.ledger.canonicalQuery}`,
        "",
        "This fixture report proves the full-tier V8 control plane with critic, patch, polish, and readability gates.",
        "",
      ].join("\n"),
    });
    addArtifact(input.step, reportPath);
  }

  if (input.definition.snapshotFinalReport) {
    await snapshotFinalReport({ ledger: input.ledger, step: input.step, io: input.io });
  }
}

export async function finishStep(input: {
  ledger: HyperresearchV8RunLedger;
  step: HyperresearchStepRecord;
  definition: HyperresearchStepDefinition;
  agentOutputs?: HyperresearchAgentOutput[];
  io: HyperresearchCodexIO;
}) {
  if (input.agentOutputs) {
    await validateAgentArtifactWrites({
      ledger: input.ledger,
      step: input.step,
      definition: input.definition,
      agentOutputs: input.agentOutputs,
      io: input.io,
    });
    if (input.definition.snapshotFinalReport) {
      await snapshotFinalReport({ ledger: input.ledger, step: input.step, io: input.io });
    }
  } else {
    await writeStepArtifacts(input);
  }
  input.step.status = "complete";
  input.step.completedAt = input.io.now();
  input.ledger.currentStepId = nextPendingStep(input.ledger)?.id;
  input.ledger.completed = input.ledger.steps.every((step) => step.status === "complete");
}
