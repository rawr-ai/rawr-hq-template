Resume the Hyperresearch child-agent completion diagnostic scenario "multi-resume-happy".

Do not use MCP. Do not test hooks. Do not edit the repository.

Use the child handles/agent ids spawned earlier in this same session for resume-1, resume-2, and resume-3. Wait for each exact child, close each exact child, compute SHA-256 for each output file in /tmp/codex-rawr-child-diagnostic-20260503T193257Z-child-agent-completion/outputs/, and write /tmp/codex-rawr-child-diagnostic-20260503T193257Z-child-agent-completion/manifest/multi-resume-happy.json.

If the resumed runtime cannot access the prior child handles, classify the scenario as non-clean. Use parentWaitResult "wait_not_found" or "wait_not_attempted" as appropriate, parentCloseResult "close_not_found" or "close_not_attempted", and diagnosticClassification "stuck_final_no_wait" or "unsupported_runtime_surface". Do not replace the children for this positive scenario.

The manifest must include schemaVersion, runId "20260503T193257Z-child-agent-completion", scenarioId "multi-resume-happy", kind "positive", passed, classification, parentSessionId if known, children array, blockingFindings, warningFindings, and per-child childFinalState, parentWaitResult, parentCloseResult, expectedOutputPath, expectedOutputSha256, diagnosticClassification, and eventChain.

For a clean pass, use classification "clean_completed" and diagnosticClassification "clean_completed"; do not use "passed" as a classification label.
