import type { WorkspaceTemplate } from "../../../../orpc/ports/workspace-store";
import {
  ARTIFACT_OUTPUT_DIRECTORIES,
  REQUIRED_WORKSPACE_DIRECTORIES,
  SOURCE_MATERIAL_DIRECTORIES,
  STATIC_ARTIFACT_FILE_REFS,
  WORKSPACE_MANAGED_FILE_REFS,
} from "../../../../shared/layout";

const WORKSPACE_README = `# ChatGPT Corpus Workspace

This workspace holds a small, disposable corpus derived from exported ChatGPT
conversation JSON files.

Inputs:
- \`${SOURCE_MATERIAL_DIRECTORIES.conversations}/*.json\`
- \`${SOURCE_MATERIAL_DIRECTORIES.documents}/*.md\` (optional hand-curated source docs)

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
${SOURCE_MATERIAL_DIRECTORIES.conversations}/*
!${SOURCE_MATERIAL_DIRECTORIES.conversations}/.gitkeep
${SOURCE_MATERIAL_DIRECTORIES.documents}/*
!${SOURCE_MATERIAL_DIRECTORIES.documents}/.gitkeep
work/generated/
work/README.md
`;

export function createWorkspaceTemplate(): WorkspaceTemplate {
  return {
    requiredDirectories: [...REQUIRED_WORKSPACE_DIRECTORIES],
    managedFiles: [
      {
        ...WORKSPACE_MANAGED_FILE_REFS[0],
        contents: `${WORKSPACE_README.trimEnd()}\n`,
      },
      {
        ...WORKSPACE_MANAGED_FILE_REFS[1],
        contents: `${WORKSPACE_GITIGNORE.trimEnd()}\n`,
      },
    ],
    outputDirectories: [...ARTIFACT_OUTPUT_DIRECTORIES],
    outputFiles: [...STATIC_ARTIFACT_FILE_REFS],
  };
}
