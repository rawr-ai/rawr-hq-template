Use the installed hyperresearch-codex skill and execute the workflow, not just explain it. Do not edit repository files.

Goal: produce a fresh Codex-RAWR exec proof that Hyperresearch Codex packet mode can be driven by a real Codex session using the service CLI and real Hyperresearch backend.

Repository: /Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-hyperresearch-codex-parity
Steps directory: /Users/mateicanavra/Documents/.nosync/DEV/worktrees/wt-hyperresearch-codex-parity/services/hyperresearch-codex/references/v8-steps
Create a temporary vault under /tmp. Query: "What is Python and what organization maintains it? Use python.org/about as the source."
Use tier light and backend real.

Required procedure:
1. Start the run with `bun run --cwd apps/cli rawr hyperresearch codex start --backend real --tier light --vault "$VAULT" --steps "$STEPS" --query "$QUERY" --json`.
2. Advance with `--agent-mode packets --backend real` until awaiting agents.
3. For every pending packet, read its JSON and write the declared `expectedOutputPath`. You are the Codex agent for this proof. Write every assigned `requiredArtifacts` on disk, compute each SHA-256 from exact file content, and include `artifactWrites` for every assigned artifact. For source-backed packets, include `sourceUrls: ["https://www.python.org/about/"]`.
4. Continue advancing until complete. For the final-report and claim-trace steps, make the final report contain at least these three exact material claims so claim trace validation can match them:
   - Python is a programming language that lets you work quickly and integrate systems effectively.
   - The Python Software Foundation is the organization behind Python.
   - Python runs on Windows, Linux/Unix, macOS, and has been ported to Java and .NET virtual machines.
   The claim trace must cite `https://www.python.org/about/` for those claims.
5. Run `bun run --cwd apps/cli rawr hyperresearch codex validate --backend real --ledger "$LEDGER" --json`.
6. Finish only after validation passes. In your final answer, report: vault path, ledger path, final status, validation passed value, completed step IDs, agent job count, source capture URLs, and CLI operations recorded.

Keep the run small and deterministic. Do not use `hyperresearch research`.
