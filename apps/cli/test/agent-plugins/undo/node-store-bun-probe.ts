import path from "node:path";

import type { CapsuleRoot } from "../../../src/lib/agent-plugins/layout";
import { openNodeCapsuleStateStoreV1 } from "../../../src/lib/agent-plugins/undo/node-store";
import { CapsuleControllerWriterV1 } from "../../../src/lib/agent-plugins/undo/writer";
import {
  FIXTURE_OWNER,
  FIXTURE_TARGETS,
  FIXTURE_VERSION,
  createFixtureRegistry,
  fixtureAction,
  fixtureObserved,
  type FixtureWorldV1,
} from "./fixture-protocol";
import { createOwnedFixtureRoot } from "./owned-fixture-root";

const fixture = await createOwnedFixtureRoot();
try {
  const world: FixtureWorldV1 = { states: new Map(), replayOrder: [] };
  const registry = createFixtureRegistry(world);
  const root = path.join(fixture.path, "last-operation-v1") as CapsuleRoot;
  const opened = await openNodeCapsuleStateStoreV1({ root, registry });
  if (opened.kind !== "Opened") throw new Error(`${opened.failure.code}: ${opened.failure.message}`);
  const writer = new CapsuleControllerWriterV1({ store: opened.store, registry });
  const action = fixtureAction("plugins/a/bun-probe");
  const admitted = await writer.begin({
    owner: FIXTURE_OWNER,
    ownerProtocolVersion: FIXTURE_VERSION,
    contentAuthority: "fixture-content-authority",
    targets: FIXTURE_TARGETS,
    actions: [{ action }],
  });
  if (admitted.kind !== "Accepted") throw new Error(admitted.failure.message);
  const actionHandle = admitted.admittedActions[0]!.actionHandle;
  const staged = await admitted.session.stage({ actionHandle });
  if (staged.kind !== "Accepted") throw new Error(staged.failure.message);
  const marked = await admitted.session.markApplied({
    actionHandle,
    observedPost: fixtureObserved(action),
  });
  if (marked.kind !== "Accepted") throw new Error(marked.failure.message);
  const settled = await admitted.session.settle();
  if (settled.kind !== "Accepted") throw new Error(settled.failure.message);
  const reopened = await openNodeCapsuleStateStoreV1({ root, registry });
  if (reopened.kind !== "Opened") throw new Error(reopened.failure.message);
  const read = await reopened.store.read();
  if (read.kind !== "Observed") throw new Error(read.failure.message);
  process.stdout.write(`${JSON.stringify({
    state: read.observation.state.body.state.kind,
    committed: read.observation.state.body.state.kind === "idle"
      && read.observation.state.body.state.committed !== null,
  })}\n`);
} finally {
  await fixture.cleanup();
}
