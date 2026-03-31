import type { WorkspaceTemplate } from "../../../../orpc/ports/workspace-store";

const WORKSPACE_README = `# ChatGPT Corpus Workspace

This workspace holds a small, disposable corpus derived from exported ChatGPT
conversation JSON files.

Inputs:
- \`source-material/conversations/raw-json/*.json\`
- \`work/docs/source/*.md\` (optional hand-curated source docs)

Generated outputs:
- \`work/generated/corpus/inventory.json\`
- \`work/generated/corpus/family-graphs.json\`
- \`work/generated/corpus/intermediate-graph.json\`
- \`work/generated/corpus/corpus-manifest.json\`
- \`work/generated/corpus/normalized-threads/*.json\`
- \`work/generated/reports/anomalies.json\`
- \`work/generated/reports/ambiguity-flags.json\`
- \`work/generated/reports/canonicality-summary.md\`
- \`work/generated/reports/decision-log.md\`
- \`work/generated/reports/mental-map.md\`
- \`work/generated/reports/validation-report.json\`

Working rule:
- keep raw exports and generated outputs in this workspace
- use \`rawr corpus init\` and \`rawr corpus consolidate\` as the canonical tooling
`;

const WORKSPACE_GITIGNORE = `__pycache__/
source-material/conversations/raw-json/*
!source-material/conversations/raw-json/.gitkeep
work/docs/source/*
!work/docs/source/.gitkeep
work/generated/
work/README.md
`;

export const REQUIRED_DIRECTORIES = [
  "source-material/conversations/raw-json",
  "work/docs/source",
] as const;

export const OUTPUT_DIRECTORIES = [
  "work/generated/corpus",
  "work/generated/corpus/normalized-threads",
  "work/generated/reports",
] as const;

export const OUTPUT_FILES = [
  "work/generated/corpus/inventory.json",
  "work/generated/corpus/family-graphs.json",
  "work/generated/corpus/intermediate-graph.json",
  "work/generated/corpus/corpus-manifest.json",
  "work/generated/reports/anomalies.json",
  "work/generated/reports/ambiguity-flags.json",
  "work/generated/reports/canonicality-summary.md",
  "work/generated/reports/decision-log.md",
  "work/generated/reports/mental-map.md",
  "work/generated/reports/validation-report.json",
] as const;

export function createWorkspaceTemplate(): WorkspaceTemplate {
  return {
    requiredDirectories: [...REQUIRED_DIRECTORIES],
    managedFiles: [
      {
        fileId: "workspace-readme",
        relativePath: "work/README.md",
        contents: `${WORKSPACE_README.trimEnd()}\n`,
      },
      {
        fileId: "workspace-gitignore",
        relativePath: ".gitignore",
        contents: `${WORKSPACE_GITIGNORE.trimEnd()}\n`,
      },
    ],
    outputDirectories: [...OUTPUT_DIRECTORIES],
    outputFiles: [...OUTPUT_FILES],
  };
}
