import type {
  HyperresearchStepDefinition,
  LoadedHyperresearchStep,
} from "../../../shared/entities";
import type { HyperresearchCodexIO } from "../../../shared/resources";

export const v8HyperresearchSteps: HyperresearchStepDefinition[] = [
  {
    id: "01-decompose",
    title: "Decompose query and classify tier",
    fileName: "hyperresearch-1-decompose.md",
    tierGate: "all",
    requiredArtifacts: [
      "research/scaffold.md",
      "research/prompt-decomposition.json",
      "research/temp/coverage-matrix.md",
    ],
  },
  {
    id: "02-width-sweep",
    title: "Width sweep and source capture",
    fileName: "hyperresearch-2-width-sweep.md",
    tierGate: "all",
    agentRoles: ["hyperresearch-fetcher", "hyperresearch-source-analyst"],
    requiredCliOperations: ["search", "fetch", "note"],
    requiredArtifacts: [
      "research/temp/search-plan.md",
      "research/temp/scored-urls.md",
      "research/temp/source-capture-log.md",
      "research/temp/claims-width.json",
    ],
  },
  {
    id: "03-contradiction-graph",
    title: "Contradiction graph",
    fileName: "hyperresearch-3-contradiction-graph.md",
    tierGate: "full",
    requiredArtifacts: [
      "research/temp/contradiction-graph.json",
      "research/temp/consensus-claims.json",
    ],
  },
  {
    id: "04-loci-analysis",
    title: "Loci analysis",
    fileName: "hyperresearch-4-loci-analysis.md",
    tierGate: "full",
    agentRoles: ["hyperresearch-loci-analyst", "hyperresearch-loci-analyst"],
    requiredArtifacts: ["research/loci.json"],
  },
  {
    id: "05-depth-investigation",
    title: "Depth investigation",
    fileName: "hyperresearch-5-depth-investigation.md",
    tierGate: "full",
    agentRoles: ["hyperresearch-depth-investigator", "hyperresearch-depth-investigator"],
    requiredArtifacts: ["research/temp/depth-investigation-log.md"],
  },
  {
    id: "06-cross-locus-reconcile",
    title: "Cross-locus reconciliation",
    fileName: "hyperresearch-6-cross-locus-reconcile.md",
    tierGate: "full",
    requiredArtifacts: ["research/comparisons.md"],
  },
  {
    id: "07-source-tensions",
    title: "Source tensions",
    fileName: "hyperresearch-7-source-tensions.md",
    tierGate: "full",
    requiredArtifacts: ["research/temp/source-tensions.json"],
  },
  {
    id: "08-corpus-critic",
    title: "Corpus critic",
    fileName: "hyperresearch-8-corpus-critic.md",
    tierGate: "full",
    agentRoles: ["hyperresearch-corpus-critic", "hyperresearch-fetcher"],
    requiredArtifacts: [
      "research/corpus-critic-gaps.json",
      "research/temp/corpus-critic-results.md",
    ],
  },
  {
    id: "09-evidence-digest",
    title: "Evidence digest",
    fileName: "hyperresearch-9-evidence-digest.md",
    tierGate: "full",
    requiredArtifacts: ["research/temp/evidence-digest.md"],
  },
  {
    id: "10-triple-draft",
    title: "Triple draft or light final draft",
    fileName: "hyperresearch-10-triple-draft.md",
    tierGate: "all",
    agentRoles: ["hyperresearch-draft-orchestrator"],
    requiredArtifacts: [
      "research/temp/draft-angles.md",
      "research/temp/draft-a.md",
      "research/temp/draft-b.md",
      "research/temp/draft-c.md",
    ],
  },
  {
    id: "11-synthesize",
    title: "Synthesize final report",
    fileName: "hyperresearch-11-synthesize.md",
    tierGate: "full",
    agentRoles: ["hyperresearch-synthesizer"],
    snapshotFinalReport: true,
    requiredArtifacts: [
      "research/temp/synthesis-conflicts.md",
      "research/temp/synthesis-plan.md",
      "research/temp/synthesis-outline.md",
      "research/temp/synthesis-pass1.md",
      "research/notes/final_report_${vaultTag}.md",
    ],
  },
  {
    id: "12-critics",
    title: "Adversarial critics",
    fileName: "hyperresearch-12-critics.md",
    tierGate: "full",
    agentRoles: [
      "hyperresearch-dialectic-critic",
      "hyperresearch-depth-critic",
      "hyperresearch-width-critic",
      "hyperresearch-instruction-critic",
    ],
    requiredArtifacts: [
      "research/critic-findings-dialectic.json",
      "research/critic-findings-depth.json",
      "research/critic-findings-width.json",
      "research/critic-findings-instruction.json",
    ],
  },
  {
    id: "13-gap-fetch",
    title: "Post-critic gap fetch",
    fileName: "hyperresearch-13-gap-fetch.md",
    tierGate: "full",
    agentRoles: ["hyperresearch-fetcher"],
    requiredCliOperations: ["fetch", "fetch-batch"],
    requiredArtifacts: ["research/temp/post-critic-fetch-log.md"],
  },
  {
    id: "14-patcher",
    title: "Patch accepted findings",
    fileName: "hyperresearch-14-patcher.md",
    tierGate: "full",
    agentRoles: ["hyperresearch-patcher"],
    requiredArtifacts: [
      "research/patch-log.json",
      "research/notes/final_report_${vaultTag}.md",
    ],
  },
  {
    id: "15-polish",
    title: "Polish and lint",
    fileName: "hyperresearch-15-polish.md",
    tierGate: "all",
    agentRoles: ["hyperresearch-polish-auditor"],
    requiredCliOperations: ["lint"],
    requiredArtifacts: [
      "research/polish-log.json",
      "research/notes/final_report_${vaultTag}.md",
    ],
  },
  {
    id: "16-readability-audit",
    title: "Readability audit",
    fileName: "hyperresearch-16-readability-audit.md",
    tierGate: "all",
    agentRoles: ["hyperresearch-readability-recommender"],
    requiredCliOperations: ["sync", "lint", "export"],
    requiredArtifacts: [
      "research/claim-trace.json",
      "research/readability-recommendations.json",
      "research/readability-decisions.json",
      "research/notes/final_report_${vaultTag}.md",
    ],
  },
];

export function v8StepsForTier(tier: "light" | "full"): HyperresearchStepDefinition[] {
  return v8HyperresearchSteps
    .filter((step) => tier === "full" || step.tierGate !== "full")
    .map((step) => {
      if (tier === "light" && step.id === "10-triple-draft") {
        return {
          ...step,
          agentRoles: ["hyperresearch-draft-orchestrator"],
          snapshotFinalReport: true,
          requiredArtifacts: [
            "research/temp/draft-angles.md",
            "research/notes/final_report_${vaultTag}.md",
          ],
        };
      }
      return step;
    });
}

export function expandV8ArtifactPath(artifact: string, vaultTag: string): string {
  return artifact.replaceAll("${vaultTag}", vaultTag);
}

export async function loadHyperresearchStep(input: {
  stepsRoot: string;
  definition: HyperresearchStepDefinition;
  io: HyperresearchCodexIO;
}): Promise<LoadedHyperresearchStep> {
  const stepPath = input.io.join(input.stepsRoot, input.definition.fileName);
  const body = await input.io.readTextFile(stepPath);
  if (body === null) {
    throw new Error(`Hyperresearch step file not found: ${stepPath}`);
  }

  return {
    stepId: input.definition.id,
    title: input.definition.title,
    path: stepPath,
    sha256: input.io.sha256(body),
    loadedAt: input.io.now(),
    body,
  };
}
