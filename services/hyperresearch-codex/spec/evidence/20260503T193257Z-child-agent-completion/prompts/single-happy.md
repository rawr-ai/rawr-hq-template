You are running the Hyperresearch child-agent completion diagnostic scenario "single-happy".

Do not use MCP. Do not test hooks. Do not edit the repository.

Use the Codex child-agent lifecycle tools if they are available in this runtime:
- spawn one child agent,
- wait for that exact child,
- close that exact child.

If spawn_agent, wait_agent, or close_agent are unavailable, do not write the child output yourself. Instead write /tmp/codex-rawr-child-diagnostic-20260503T193257Z-child-agent-completion/manifest/single-happy.json with classification "unsupported_runtime_surface" and explain which lifecycle surface was missing.

Child task:
- Write exactly this JSON, with no trailing commentary, to /tmp/codex-rawr-child-diagnostic-20260503T193257Z-child-agent-completion/outputs/single-1.json:
{"schemaVersion":1,"scenarioId":"single-happy","logicalChildId":"single-1","attemptId":"single-1-a1","result":"DONE single-1","payload":"hyperresearch-child-completion-diagnostic"}
- Return the final answer exactly: DONE single-1

Parent task:
- Spawn the child with the child task above.
- Wait for the child.
- Close the child.
- Compute SHA-256 for /tmp/codex-rawr-child-diagnostic-20260503T193257Z-child-agent-completion/outputs/single-1.json using shasum -a 256.
- Write /tmp/codex-rawr-child-diagnostic-20260503T193257Z-child-agent-completion/manifest/single-happy.json as JSON with schemaVersion, runId "20260503T193257Z-child-agent-completion", scenarioId, kind "positive", passed, classification, parentSessionId if known, children array, blockingFindings, warningFindings. Include childSessionId/agent id if known, childFinalState, parentWaitResult, parentCloseResult, expectedOutputPath, expectedOutputSha256, diagnosticClassification, and eventChain.
- A clean pass requires childFinalState "Completed", parentWaitResult "wait_completed", parentCloseResult "close_ok" or "close_already_closed", and the output hash present. For a clean pass, use classification "clean_completed" and diagnosticClassification "clean_completed"; do not use "passed" as a classification label.
