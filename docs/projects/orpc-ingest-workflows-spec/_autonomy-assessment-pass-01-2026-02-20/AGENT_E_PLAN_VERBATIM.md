# Agent E Research Plan (Verbatim)

1. Confirm output constraints and file boundaries, then operate only inside the three assigned Agent E artifacts.
2. Read and extract resilience/failure-analysis heuristics from required skills:
   - solution-design
   - system-design
   - domain-design
   - inngest
3. Collect architectural and implementation evidence from required scope anchors:
   - architecture packet docs (`ARCHITECTURE.md`, axis docs, implementation-adjacent updates spec)
   - runtime adapter/server files (`packages/coordination-inngest/src/adapter.ts`, `apps/server/src/rawr.ts`, `apps/server/src/orpc.ts`)
4. Maintain timestamped working notes in `AGENT_E_SCRATCHPAD.md` while reviewing evidence and synthesizing risks.
5. Build an evidence map with absolute file paths and line anchors tying each critical claim to primary source text/code.
6. Identify and prioritize first-failure system dynamics (what breaks first), including trigger signals, blast radius, and likely propagation paths.
7. Produce mitigation directions emphasizing containment, operability, and fast detection over speculative redesign.
8. Capture explicit assumptions and unresolved questions that materially affect risk posture.
9. Deliver final assessment in `AGENT_E_FINAL_SYSTEM_RISK_ANALYSIS.md` with required sections and prioritized failure mode table.
