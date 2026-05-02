#!/usr/bin/env bun
import { context, explicitWorkstreamContext, isWorkstreamPackRepo, loadPayload, repoRoot, silent } from "./workstream_common.ts";

const payload = loadPayload();
const root = repoRoot(payload);

if (!isWorkstreamPackRepo(root) || !explicitWorkstreamContext(root, payload)) {
  silent();
} else {
  context(
    "Workstream startup: generic workstream guidance lives in tools/workstream-plugin-pack/. Use its assets for records/packets; runtime-lab docs are overlays only.",
  );
}
