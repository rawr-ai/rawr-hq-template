import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const forbiddenPaths = [
  "docs/process/UPSTREAM_SYNC_RUNBOOK.md",
  "docs/process/runbooks/TEMPLATE_TO_PERSONAL_INTEGRATION_LOOP.md",
  "docs/process/AGENT_LOOPS.md",
  "scripts/githooks/pre-commit",
  "scripts/githooks/check-template-managed.ts",
  "scripts/githooks/template-managed-guard-lib.ts",
  "scripts/githooks/template-managed-paths.txt",
  "apps/cli/test/template-managed-guard.test.ts",
  "tools/workstream-plugin-pack/notes/downstream-port-notes.md",
];

const canonicalClaims = [
  ["AGENTS.md", "The repositories are independent"],
  ["AGENTS_SPLIT.md", "No Template-to-personal merge"],
  ["UPDATING.md", "There is no Template-to-personal Git sync workflow"],
  ["docs/process/CROSS_REPO_WORKFLOWS.md", "Do not merge, rebase, cherry-pick, transplant"],
  ["docs/process/WORKSTREAMS.md", "RAWR HQ-Template owns the generic Workstream Plugin Pack"],
  [
    "plugins/cli/hyperresearch/README.md",
    "explicit versioned data or immutable-artifact interface",
  ],
  ["services/hyperresearch-codex/spec/INTEGRATION_SPEC.md", "immutable curated-content artifact"],
  ["services/hyperresearch-codex/references/README.md", "Template-owned test/reference inputs"],
  ["services/hyperresearch-codex/spec/FLOWS.md", "governed immutable curated-content artifact"],
  [
    "services/hyperresearch-codex/spec/REPLACEMENT_ATTEMPT_CLOSURE_PLAN.md",
    "artifact-backed installed material",
  ],
];

const forbiddenOperationalText = [
  ["Template upstream merge", /git\s+(?:merge|rebase|cherry-pick)[^\n]*upstream/u],
  ["Template upstream fetch", /git\s+fetch\s+upstream/u],
  ["tree-preservation guard", /template-managed-paths|check-template-managed/u],
  ["source controller target", /apps\/cli\/bin\/run\.js/u],
  ["checkout owner identity", /global-rawr-owner-path/u],
  ["mixed lifecycle convergence", /rawr\s+plugins\s+(?:sync\s+all|converge|doctor\s+links)/u],
];

const operationalDocs = [
  "docs/process/HQ_USAGE.md",
  "docs/process/RUNBOOKS.md",
  "docs/process/runbooks/HQ_RUNTIME_OPERATIONS.md",
  "docs/process/runbooks/QUARANTINE_FIRST_MIGRATION_DOCS_WORKFLOW.md",
];

const independentToolingDocs = [
  "docs/process/WORKSTREAMS.md",
  "tools/workstream-plugin-pack/README.md",
  "tools/workstream-plugin-pack/notes/next-work.md",
  "plugins/cli/hyperresearch/README.md",
  "services/hyperresearch-codex/spec/README.md",
  "services/hyperresearch-codex/spec/INTEGRATION_SPEC.md",
  "services/hyperresearch-codex/spec/REMAINDER_PLAN.md",
  "services/hyperresearch-codex/spec/DRA_RUNBOOK.md",
  "services/hyperresearch-codex/spec/FULL_PARITY_CLOSURE_PLAN.md",
  "services/hyperresearch-codex/spec/HIGHER_ORDER_RUNTIME_PROOF_PLAN.md",
  "services/hyperresearch-codex/spec/HOOKS_GUARDRAIL_PLAN.md",
  "services/hyperresearch-codex/spec/HOOKS_MCP_PARITY.md",
  "services/hyperresearch-codex/spec/PARITY_MATRIX.md",
  "services/hyperresearch-codex/spec/FLOWS.md",
  "services/hyperresearch-codex/spec/REPLACEMENT_ATTEMPT_CLOSURE_PLAN.md",
  "services/hyperresearch-codex/references/README.md",
  "services/hyperresearch-codex/spec/REVIEW_LEDGER.md",
  "services/hyperresearch-codex/spec/TESTING_PLAN.md",
];

const forbiddenIndependentToolingText = [
  ["personal checkout target", /\/Users\/[^\n]*\/rawr-hq(?:\/|\b)/u],
  ["downstream projection option", /--target\s+(?:downstream|all)|--downstream-root/u],
  [
    "downstream projection implementation",
    /projectDownstream|defaultDownstreamRoot|downstreamRoot/u,
  ],
  ["checkout projection command", /rawr\s+plugins\s+sync\s+hyperresearch/u],
  [
    "personal checkout as sync source",
    /(?:active|current)\s+sync\s+source|synced\s+from\s+downstream/u,
  ],
  ["repository bridge copy", /bridge\/recovery\s+copy|bridge\s+copy/u],
  ["downstream-first authoring", /migrate[^\n]*downstream\s+first|copy[^\n]*into\s+downstream/u],
  [
    "downstream runtime authority",
    /downstream\s+(?:durable\s+plan|installed\s+material|plugin\s+content)/u,
  ],
  ["checkout-to-provider sync", /from\s+RAWR HQ[^\n]*sync|sync[^\n]*from\s+RAWR HQ/u],
  ["legacy agent-sync authority", /until\s+agent-sync\s+has\s+managed/u],
];

const findings = [];

for (const relativePath of forbiddenPaths) {
  if (fs.existsSync(path.join(root, relativePath))) {
    findings.push(`forbidden repository-coupling path remains: ${relativePath}`);
  }
}

for (const [relativePath, claim] of canonicalClaims) {
  const absolutePath = path.join(root, relativePath);
  const source = fs.existsSync(absolutePath) ? fs.readFileSync(absolutePath, "utf8") : "";
  if (!source.includes(claim))
    findings.push(`canonical separation claim missing from ${relativePath}: ${claim}`);
}

for (const relativeRoot of ["scripts/dev", "scripts/githooks"]) {
  for (const absolutePath of walk(path.join(root, relativeRoot))) {
    const source = fs.readFileSync(absolutePath, "utf8");
    for (const [label, pattern] of forbiddenOperationalText) {
      if (pattern.test(source))
        findings.push(`${label} remains in ${path.relative(root, absolutePath)}`);
    }
  }
}

for (const relativePath of operationalDocs) {
  const source = fs.readFileSync(path.join(root, relativePath), "utf8");
  for (const [label, pattern] of forbiddenOperationalText) {
    if (pattern.test(source)) findings.push(`${label} remains in ${relativePath}`);
  }
  if (/bun\s+run\s+rawr(?:\s|$)/u.test(source)) {
    findings.push(`source CLI operational guidance remains in ${relativePath}`);
  }
}

for (const relativePath of independentToolingDocs) {
  const source = fs.readFileSync(path.join(root, relativePath), "utf8");
  for (const [label, pattern] of forbiddenIndependentToolingText) {
    if (pattern.test(source)) findings.push(`${label} remains in ${relativePath}`);
  }
}

const workstreamInstallerPath = "tools/workstream-plugin-pack/scripts/install-local-codex-pack.ts";
const workstreamInstaller = fs.readFileSync(path.join(root, workstreamInstallerPath), "utf8");
for (const [label, pattern] of forbiddenIndependentToolingText) {
  if (pattern.test(workstreamInstaller))
    findings.push(`${label} remains in ${workstreamInstallerPath}`);
}

const recursiveRemovals = [...workstreamInstaller.matchAll(/rmSync\([^\n]*recursive:\s*true/gu)];
if (recursiveRemovals.length !== 1) {
  findings.push(
    `workstream installer must have exactly one guarded recursive removal; found ${recursiveRemovals.length}`
  );
}
if (
  !/assertOwnedProjectionTarget\(root, target, allowedTargets\);[\s\S]{0,200}rmSync\(target, \{ recursive: true, force: true \}\);/u.test(
    workstreamInstaller
  )
) {
  findings.push(
    "workstream installer recursive removal is not preceded by its closed target/alias guard"
  );
}

if (findings.length > 0) {
  throw new Error(`REPOSITORY_SEPARATION_VIOLATION\n${findings.join("\n")}`);
}

console.log("repository separation: structural boundary verified");

function walk(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(entryPath);
    return /\.(?:js|mjs|sh|ts)$/u.test(entry.name) ? [entryPath] : [];
  });
}
