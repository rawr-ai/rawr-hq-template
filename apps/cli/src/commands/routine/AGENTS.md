# `rawr routine …`

- Developer hygiene loops (multi-step commands).
- `routine check` runs `doctor`, `security check`, then `bun run test` (optional skip).
- `routine snapshot` writes a snapshot packet under `.rawr/routines/<timestamp>/`.

## Next
- `check.ts` — doctor + security + tests
- `snapshot.ts` — capture tools/plugins/security into `.rawr/`
- `start.ts` — alias for `bun run dev` (same intent as `dev up`)
- `../../lib/subprocess.ts` — step runner + CLI entrypoint resolution

