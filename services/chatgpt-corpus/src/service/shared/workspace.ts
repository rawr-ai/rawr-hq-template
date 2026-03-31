import path from "node:path";

export const WORKSPACE_README = `# ChatGPT Corpus Workspace

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

export const WORKSPACE_GITIGNORE = `__pycache__/
source-material/conversations/raw-json/*
!source-material/conversations/raw-json/.gitkeep
work/docs/source/*
!work/docs/source/.gitkeep
work/generated/
work/README.md
`;

export type CorpusWorkspacePaths = {
  workspaceRoot: string;
  sourceJsonDir: string;
  workDir: string;
  sourceDocsDir: string;
  generatedDir: string;
  corpusDir: string;
  reportsDir: string;
  normalizedDir: string;
  readmePath: string;
  gitignorePath: string;
};

export function getWorkspacePaths(workspaceRoot: string): CorpusWorkspacePaths {
  const root = path.resolve(workspaceRoot);
  const workDir = path.join(root, "work");
  const generatedDir = path.join(workDir, "generated");
  const corpusDir = path.join(generatedDir, "corpus");
  return {
    workspaceRoot: root,
    sourceJsonDir: path.join(root, "source-material", "conversations", "raw-json"),
    workDir,
    sourceDocsDir: path.join(workDir, "docs", "source"),
    generatedDir,
    corpusDir,
    reportsDir: path.join(generatedDir, "reports"),
    normalizedDir: path.join(corpusDir, "normalized-threads"),
    readmePath: path.join(workDir, "README.md"),
    gitignorePath: path.join(root, ".gitignore"),
  };
}
