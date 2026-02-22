#!/usr/bin/env bun
import {
  assertCondition,
  assertScriptEquals,
  mustExist,
  readFile,
  readPackageScripts,
} from "./_verify-utils.mjs";

await Promise.all([
  mustExist("packages/state/src/repo-state.ts"),
  mustExist("apps/server/src/rawr.ts"),
  mustExist("packages/state/test/repo-state.concurrent.test.ts"),
  mustExist("apps/server/test/rawr.test.ts"),
]);

const [repoStateSource, rawrSource, repoStateTestSource, rawrTestSource, scripts] = await Promise.all([
  readFile("packages/state/src/repo-state.ts"),
  readFile("apps/server/src/rawr.ts"),
  readFile("packages/state/test/repo-state.concurrent.test.ts"),
  readFile("apps/server/test/rawr.test.ts"),
  readPackageScripts(),
]);

assertScriptEquals(scripts, "phase-f:gate:drift-core", "bun run phase-e:gate:drift-core");
assertScriptEquals(
  scripts,
  "phase-f:gate:f1-runtime-lifecycle-contract",
  "bun scripts/phase-f/verify-f1-runtime-lifecycle-contract.mjs",
);
assertScriptEquals(
  scripts,
  "phase-f:gate:f1-runtime-lifecycle-runtime",
  "bunx vitest run --project state packages/state/test/repo-state.concurrent.test.ts && bunx vitest run --project server apps/server/test/rawr.test.ts --testNamePattern='host-composition-guard: keeps runtime authority stable when initialized from alias repo roots' && bunx vitest run --project server apps/server/test/route-boundary-matrix.test.ts && bun run phase-c:gate:c1-storage-lock-runtime",
);
assertScriptEquals(
  scripts,
  "phase-f:f1:quick",
  "bun run phase-f:gate:drift-core && bun run phase-f:gate:f1-runtime-lifecycle-contract && bun run phase-f:gate:f1-runtime-lifecycle-runtime",
);
assertScriptEquals(
  scripts,
  "phase-f:f1:full",
  "bun run phase-f:f1:quick && bun run phase-a:gate:host-composition-guard",
);

const checks = [
  {
    id: "repo-state-authority-root-helper",
    message: "repo-state must canonicalize authority root with realpath fallback",
    pass: /async function resolveRepoStateAuthorityRoot\(repoRoot: string\): Promise<string>[\s\S]*await fs\.realpath\(resolvedRoot\)[\s\S]*return resolvedRoot;/u.test(
      repoStateSource,
    ),
  },
  {
    id: "repo-state-read-authority-root",
    message: "getRepoState must read from canonical authority root",
    pass:
      /const authorityRoot = await resolveRepoStateAuthorityRoot\(repoRoot\);/u.test(repoStateSource) &&
      /return readStateFile\(authorityRoot\);/u.test(repoStateSource),
  },
  {
    id: "repo-state-mutate-authority-root",
    message: "mutateRepoStateAtomically must lock/write through canonical authority root",
    pass:
      /const lockPath = stateLockPath\(authorityRoot\);/u.test(repoStateSource) &&
      /const resolvedStatePath = statePath\(authorityRoot\);/u.test(repoStateSource) &&
      /return withLocalMutationQueue\(authorityRoot, async \(\) =>/u.test(repoStateSource),
  },
  {
    id: "rawr-fs-import",
    message: "rawr route registration must import node:fs sync API for canonicalization",
    pass: /import fsSync from "node:fs";/u.test(rawrSource),
  },
  {
    id: "rawr-authority-root-helper",
    message: "rawr route registration must canonicalize repo root with realpath fallback",
    pass: /function resolveAuthorityRepoRoot\(repoRoot: string\): string[\s\S]*fsSync\.realpathSync\(resolvedRoot\)[\s\S]*return resolvedRoot;/u.test(
      rawrSource,
    ),
  },
  {
    id: "rawr-authority-root-plumbing",
    message: "rawr route registration must pass canonical authority root to runtime/context",
    pass:
      /const authorityRepoRoot = resolveAuthorityRepoRoot\(opts\.repoRoot\);/u.test(rawrSource) &&
      /createCoordinationRuntimeAdapter\(\{[\s\S]*repoRoot: authorityRepoRoot,/u.test(rawrSource) &&
      /const boundaryContextDeps: RawrBoundaryContextDeps = \{[\s\S]*repoRoot: authorityRepoRoot,/u.test(rawrSource),
  },
  {
    id: "route-family-lock",
    message: "rawr route mount families must remain explicit and unchanged",
    pass:
      /app\.all\(\s*"\/api\/inngest"/u.test(rawrSource) &&
      /app\.all\(\s*"\/api\/workflows\/\*"/u.test(rawrSource) &&
      /registerOrpcRoutes\(app, \{/u.test(rawrSource),
  },
  {
    id: "f1-runtime-test-coverage",
    message: "F1 runtime tests must cover canonical/alias authority seam behavior",
    pass:
      /uses one authority root across canonical and alias repo paths/u.test(repoStateTestSource) &&
      /keeps runtime authority stable when initialized from alias repo roots/u.test(rawrTestSource),
  },
];

const failedChecks = checks.filter((check) => !check.pass);
assertCondition(
  failedChecks.length === 0,
  `phase-f f1 contract drift detected: ${failedChecks.map((check) => `${check.id}: ${check.message}`).join("; ")}`,
);

console.log("phase-f f1 runtime lifecycle contract verified");
