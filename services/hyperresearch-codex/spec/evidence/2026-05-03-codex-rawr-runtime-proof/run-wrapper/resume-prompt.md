Resume the higher-order Hyperresearch Codex runtime proof. Do not edit repository files. Use the installed hyperresearch-codex skill/workflow and the service plan at services/hyperresearch-codex/spec/HIGHER_ORDER_RUNTIME_PROOF_PLAN.md.

Existing proof state:
- previous thread id: 019debf6-73ab-7622-8d58-3afc26212616
- proof dir: /tmp/hr-codex-runtime-proof-Zsld23
- vault root: /tmp/hyperresearch-codex-runtime-vault-rSLoGr
- ledger: /tmp/hyperresearch-codex-runtime-vault-rSLoGr/research/temp/hyperresearch-codex-run.json
- current expected state: awaiting_agents at 02-width-sweep

This turn is the actual runtime proof. Requirements:
1. Continue the existing ledger, do not start a new run.
2. For every awaiting_agents gate, read each packet JSON and invoke native Codex role agents with the exact role named in the packet. Use spawn_agent / wait / close_agent. The parent coordinator must not write the packet expectedOutputPath JSON files itself.
3. In each role-agent prompt, pass the packet contents and explicitly require the agent to write its assigned required artifacts plus the packet expectedOutputPath with artifactWrites and matching sha256 hashes.
4. Save every command JSON under /tmp/hr-codex-runtime-proof-Zsld23/commands using distinct names: advance-resume-02.json, advance-03.json, advance-04.json, advance-05.json, validate.json, etc.
5. On the first advance in this resumed turn, include --resume-reason "codex-rawr exec resume higher-order runtime proof" so the ledger records the resume event.
6. Use backend real and agent-mode packets for every advance.
7. Use only official Python Packaging Authority / Python docs source URLs. Use at least two, preferably these:
   - https://packaging.python.org/en/latest/specifications/pyproject-toml/
   - https://packaging.python.org/en/latest/specifications/core-metadata/
   - https://packaging.python.org/en/latest/specifications/dependency-groups/
   - https://packaging.python.org/en/latest/tutorials/packaging-projects/
8. Complete the light route and run validate --backend real.
9. Do not use hyperresearch research.

Important artifact guidance for the spawned agents:
- 02-width-sweep fetcher packet: write research/temp/search-plan.md and research/temp/scored-urls.md. Include sourceUrls for at least two official docs URLs.
- 02-width-sweep source-analyst packet: write research/temp/source-capture-log.md and research/temp/claims-width.json. Include sourceUrls for the same official docs URLs.
- 10-triple-draft packet: write research/temp/draft-angles.md and research/notes/final_report_<vaultTag>.md. The final report must contain at least three exact material claims that can later be copied into claim-trace.json verbatim.
- 15-polish packet: write research/polish-log.json and carry forward the final report unchanged with a matching artifactWrites hash.
- 16-readability-audit packet: write research/claim-trace.json, research/readability-recommendations.json, research/readability-decisions.json, and carry forward the final report unchanged. claim-trace.json must include at least three claims whose text appears exactly in the final report and whose source URLs are captured source URLs.

Final response must include:
- completed/passed status
- ledger path
- source capture URLs
- count of spawn_agent calls you made and which hyperresearch roles were used
- resume evidence location
- command JSON paths
- any caveats

