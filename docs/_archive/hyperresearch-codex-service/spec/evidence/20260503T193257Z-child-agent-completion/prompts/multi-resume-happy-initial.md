You are running the initial half of Hyperresearch child-agent completion diagnostic scenario "multi-resume-happy".

Do not use MCP. Do not test hooks. Do not edit the repository.

Use the Codex child-agent lifecycle tools if they are available. If spawn_agent is unavailable, write /tmp/codex-rawr-child-diagnostic-20260503T193257Z-child-agent-completion/manifest/multi-resume-happy-initial.json with classification "unsupported_runtime_surface".

Spawn three child agents. Each child should wait 10 seconds, write its deterministic output file, and return its DONE marker:
- resume-1 writes {"schemaVersion":1,"scenarioId":"multi-resume-happy","logicalChildId":"resume-1","attemptId":"resume-1-a1","result":"DONE resume-1","payload":"hyperresearch-child-completion-diagnostic"} to /tmp/codex-rawr-child-diagnostic-20260503T193257Z-child-agent-completion/outputs/resume-1.json and returns DONE resume-1.
- resume-2 writes {"schemaVersion":1,"scenarioId":"multi-resume-happy","logicalChildId":"resume-2","attemptId":"resume-2-a1","result":"DONE resume-2","payload":"hyperresearch-child-completion-diagnostic"} to /tmp/codex-rawr-child-diagnostic-20260503T193257Z-child-agent-completion/outputs/resume-2.json and returns DONE resume-2.
- resume-3 writes {"schemaVersion":1,"scenarioId":"multi-resume-happy","logicalChildId":"resume-3","attemptId":"resume-3-a1","result":"DONE resume-3","payload":"hyperresearch-child-completion-diagnostic"} to /tmp/codex-rawr-child-diagnostic-20260503T193257Z-child-agent-completion/outputs/resume-3.json and returns DONE resume-3.

After spawn_agent returns for all three children, write /tmp/codex-rawr-child-diagnostic-20260503T193257Z-child-agent-completion/manifest/multi-resume-happy-initial.json with the child handles/agent ids you received and classification "resume_pending". Do not wait for or close the children in this initial run. End your final response with the exact marker READY_FOR_RESUME multi-resume-happy.
