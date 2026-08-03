You are running the Hyperresearch child-agent completion diagnostic negative scenario "bad-output".

Do not use MCP. Do not test hooks. Do not edit the repository.

Use the Codex child-agent lifecycle tools if they are available. If unavailable, write /tmp/codex-rawr-child-diagnostic-20260503T193257Z-child-agent-completion/manifest/bad-output.json with classification "unsupported_runtime_surface".

Child task:
- Write this malformed JSON to /tmp/codex-rawr-child-diagnostic-20260503T193257Z-child-agent-completion/outputs/bad-output.json: {"schemaVersion":1,"scenarioId":"bad-output",
- Return DONE bad-output.

Parent task:
- Spawn the child, wait for it, close it, then write /tmp/codex-rawr-child-diagnostic-20260503T193257Z-child-agent-completion/manifest/bad-output.json.
- This scenario should not pass cleanly. Expected classification is "artifact_only_succeeded" or another non-clean hash/schema failure. Include explicit blockingFindings for malformed JSON even if the child reached Completed and close returned.
