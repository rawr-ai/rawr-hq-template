# Agent SP scratchpad — Security Posture Tool

## Ownership
- `apps/cli/src/commands/security/posture.ts` (new)
- any helper code needed

## Notes / decisions

- `rawr security posture` is a deterministic summarizer over `.rawr/security/latest.json`.
- Writes JSON+MD packets (`latest.json`, `latest.md`) to a configurable `--out` directory.
- No LLM judge in v0; posture output is meant to feed journal snippets + workflows and to be easy to diff.
