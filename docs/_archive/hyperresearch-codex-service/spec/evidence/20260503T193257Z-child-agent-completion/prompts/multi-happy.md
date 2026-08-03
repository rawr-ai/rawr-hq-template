You are running the Hyperresearch child-agent completion diagnostic scenario "multi-happy".

Do not use MCP. Do not test hooks. Do not edit the repository.

Use the Codex child-agent lifecycle tools if they are available. Spawn three child agents before waiting. If spawn_agent, wait_agent, or close_agent are unavailable, do not write child outputs yourself; write /tmp/codex-rawr-child-diagnostic-20260503T193257Z-child-agent-completion/manifest/multi-happy.json with classification "unsupported_runtime_surface".

Child tasks:
1. Child single-1 writes exactly {"schemaVersion":1,"scenarioId":"multi-happy","logicalChildId":"multi-1","attemptId":"multi-1-a1","result":"DONE multi-1","payload":"hyperresearch-child-completion-diagnostic"} to /tmp/codex-rawr-child-diagnostic-20260503T193257Z-child-agent-completion/outputs/multi-1.json and returns DONE multi-1.
2. Child multi-2 writes exactly {"schemaVersion":1,"scenarioId":"multi-happy","logicalChildId":"multi-2","attemptId":"multi-2-a1","result":"DONE multi-2","payload":"hyperresearch-child-completion-diagnostic"} to /tmp/codex-rawr-child-diagnostic-20260503T193257Z-child-agent-completion/outputs/multi-2.json and returns DONE multi-2.
3. Child multi-3 writes exactly {"schemaVersion":1,"scenarioId":"multi-happy","logicalChildId":"multi-3","attemptId":"multi-3-a1","result":"DONE multi-3","payload":"hyperresearch-child-completion-diagnostic"} to /tmp/codex-rawr-child-diagnostic-20260503T193257Z-child-agent-completion/outputs/multi-3.json and returns DONE multi-3.

Parent task:
- Spawn all three children.
- Wait for each exact child.
- Close each exact child.
- Compute SHA-256 for each output using shasum -a 256.
- Write /tmp/codex-rawr-child-diagnostic-20260503T193257Z-child-agent-completion/manifest/multi-happy.json as JSON with schemaVersion, runId "20260503T193257Z-child-agent-completion", scenarioId, kind "positive", passed, classification, parentSessionId if known, children array, blockingFindings, warningFindings. Include childSessionId/agent id if known, childFinalState, parentWaitResult, parentCloseResult, expectedOutputPath, expectedOutputSha256, diagnosticClassification, and eventChain for each child.
- A clean pass requires every child to reach Completed, every wait to complete, every close to complete or already be closed with evidence, and every hash to be present. For a clean pass, use classification "clean_completed" and diagnosticClassification "clean_completed"; do not use "passed" as a classification label.
