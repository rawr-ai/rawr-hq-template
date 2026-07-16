# DRA Runbook

This service uses a contained `Discover -> Review -> Act` loop for Hyperresearch Codex parity work.

## Loop Contract

- Discover: re-read the durable plan, service specs, local V8 references, current repo state, and Hyperresearch CLI behavior before changing code.
- Review: record blocking/warning findings in `REVIEW_LEDGER.md` before the next implementation pass.
- Act: make a bounded implementation change, run the relevant gate, and update evidence/specs if behavior changed.

## Agent Loop Shape

- Discovery agents map V8 step/role/source/test facts and do not edit files.
- Implementation agents get disjoint write scopes: service modules, shared service helpers/entities, CLI commands, spec/docs, versioned interface fixtures, or tests.
- Review agents inspect service topology, parity/security, artifact/interface boundaries, and testing evidence.
- The coordinator owns fan-in, final code integration, commits, and the decision about whether a finding blocks phase exit.

## Phase Exit

A phase exits only when:

- the relevant tests or dry-run gates pass,
- no blocking review finding remains open for that phase,
- the ledger/spec reflects any new limitation or deferral,
- the Template repository has explicit clean/dirty status recorded before handoff.

If a later proof consumes a separately released curated-content artifact, that
content repository runs its own process. This runbook records only the artifact
handle, digests, and interface version; it never coordinates source branches or
checkout state across repositories.
