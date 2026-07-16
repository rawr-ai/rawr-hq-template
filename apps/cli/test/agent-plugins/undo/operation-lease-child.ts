import type { CapsuleRoot } from "../../../src/lib/agent-plugins/layout";
import { openNodeCapsuleStateStoreV1 } from "../../../src/lib/agent-plugins/undo/node-store";
import { CapsuleControllerWriterV1 } from "../../../src/lib/agent-plugins/undo/writer";
import {
  FIXTURE_OWNER,
  FIXTURE_TARGETS,
  FIXTURE_VERSION,
  createFixtureRegistry,
  fixtureAction,
  type FixtureWorldV1,
} from "./fixture-protocol";

const root = process.argv[2];
if (root === undefined) throw new Error("capsule root argument is required");

const world: FixtureWorldV1 = { states: new Map(), replayOrder: [] };
const registry = createFixtureRegistry(world);
const opened = await openNodeCapsuleStateStoreV1({ root: root as CapsuleRoot, registry });
if (opened.kind !== "Opened") throw new Error(`${opened.failure.code}: ${opened.failure.message}`);
const writer = new CapsuleControllerWriterV1({ store: opened.store, registry });
const action = fixtureAction("plugins/a/interprocess-live-operation");
const admitted = await writer.begin({
  owner: FIXTURE_OWNER,
  ownerProtocolVersion: FIXTURE_VERSION,
  contentAuthority: "fixture-content-authority",
  targets: FIXTURE_TARGETS,
  actions: [{ action }],
});
if (admitted.kind !== "Accepted") throw new Error(admitted.failure.message);
const staged = await admitted.session.stage({
  actionHandle: admitted.admittedActions[0]!.actionHandle,
});
if (staged.kind !== "Accepted") throw new Error(staged.failure.message);

process.stdout.write("STAGED\n");
await new Promise<never>(() => undefined);
