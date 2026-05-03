You are running the Hyperresearch child-agent completion diagnostic scenario "hyperresearch-shaped-packet-loop".

Do not use MCP. Do not test hooks. Do not edit the repository.

The service packet job has been prepared at /tmp/codex-rawr-child-diagnostic-20260503T193257Z-child-agent-completion/hyperresearch-shaped/selected-packet.json. Read it and use its expectedOutputPath plus artifact contract. Use the Codex child-agent lifecycle tools if they are available:
- spawn one role-like child for this packet job,
- wait for that exact child,
- close that exact child.

If spawn_agent, wait_agent, or close_agent are unavailable, do not write packet output yourself. Instead write /tmp/codex-rawr-child-diagnostic-20260503T193257Z-child-agent-completion/manifest/hyperresearch-shaped-packet-loop.json with classification "unsupported_runtime_surface".

Child task:
- Read /tmp/codex-rawr-child-diagnostic-20260503T193257Z-child-agent-completion/hyperresearch-shaped/selected-packet.json.
- Write a deterministic assigned artifact at the packet's assigned artifact path under /tmp/codex-rawr-child-diagnostic-20260503T193257Z-child-agent-completion/hyperresearch-shaped/vault.
- Compute that artifact SHA-256.
- Write the packet result JSON at the service-declared expectedOutputPath under /tmp/codex-rawr-child-diagnostic-20260503T193257Z-child-agent-completion/hyperresearch-shaped/vault. The result must include status "complete", artifactWrites with the assigned artifact path, sha256, and summary "Deterministic child diagnostic artifact.", sourceUrls [], and summary "DONE hyperresearch-shaped-1".
- Return DONE hyperresearch-shaped-1.

Parent task:
- Spawn the child with the child task above.
- Wait for the child.
- Close the child.
- Compute SHA-256 for the packet result.
- Write /tmp/codex-rawr-child-diagnostic-20260503T193257Z-child-agent-completion/manifest/hyperresearch-shaped-packet-loop.json with schemaVersion, runId "20260503T193257Z-child-agent-completion", scenarioId, kind "positive", passed, classification, parentSessionId if known, children array, blockingFindings, warningFindings, selectedPacketPath, expectedOutputPath, and child lifecycle fields.
- For a clean pass, use classification "clean_completed" and diagnosticClassification "clean_completed"; do not use "passed" as a classification label.
