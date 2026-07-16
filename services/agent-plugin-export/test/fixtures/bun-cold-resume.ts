import { lstat, mkdir } from "node:fs/promises";
import { join } from "node:path";

import {
  EXPORT_LEDGER_FILENAME,
  canonicalSerializeExportAppliedObservation,
  canonicalSerializeExportInverseAction,
  createExportAgentPluginsApplication,
  executeExportInverseAction,
} from "../../src/index";
import { exportArtifactFixture } from "../artifact-fixture";
import { FakeArtifactReader, FakeKnownNativeHomesReader, FakeUndoWriter, knownHomes } from "../fakes";
import { createOwnedFixtureRoot } from "../owned-fixture-root";

if (process.versions.bun !== "1.3.14") {
  throw new Error(`cold-resume proof requires Bun 1.3.14, got ${process.versions.bun ?? "non-Bun"}`);
}

const root = await createOwnedFixtureRoot();
try {
  const fixture = exportArtifactFixture();
  const artifacts = new FakeArtifactReader();
  artifacts.add(fixture.alpha);
  const undo = new FakeUndoWriter();
  const destination = join(root.path, "cold-resume-destination");
  await mkdir(destination);
  const result = await createExportAgentPluginsApplication({
    artifactReader: artifacts,
    knownNativeHomesReader: new FakeKnownNativeHomesReader(knownHomes()),
    undoWriter: undo,
  }).execute({
    protocolVersion: 1,
    artifactRef: fixture.alpha.ref,
    mode: "targeted-release",
    layout: "codex-v1",
    destinations: [destination],
  });
  if (result.kind !== "MutatedSettled") throw new Error(`forward export did not settle: ${result.kind}`);

  for (const [index, entry] of [...undo.committed].reverse().entries()) {
    const replay = await executeExportInverseAction(
      canonicalSerializeExportInverseAction(entry.action),
      canonicalSerializeExportAppliedObservation(entry.observation),
      { operationId: () => `coldresume-${index.toString().padStart(8, "0")}` },
    );
    if (replay.kind !== "RevertedVerified") {
      throw new Error(`cold inverse replay did not verify: ${replay.kind}`);
    }
  }

  try {
    await lstat(join(destination, EXPORT_LEDGER_FILENAME));
    throw new Error("cold inverse replay left the export ledger behind");
  } catch (error) {
    if (!(typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT")) throw error;
  }
  console.log("bun-1.3.14 cold inverse replay: verified");
} finally {
  await root.cleanup();
}
