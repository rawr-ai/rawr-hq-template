# Developer CLI Topic

## Scope
This private topic projects exactly repo sync-upstream, stack doctor, stack drain, and worktree cleanup.

## Boundaries
- Native Oclif owns one parse, scalar admission, and paired flags.
- The public dev client owns repository resolution, scratch evidence, Git policy, and mutation sequencing.
- `services.ts` declares one shared service use. The app selects the process, profiles, and providers.
- Never construct a runtime or provider, import service internals, discover a product workspace, or retain a live client here.
- Only explicit mutation flags permit apply; dry-run suppresses apply. Scratch files are invocation data, not discovered documents.
- Preserve planned, refused, attempted, and confirmed outcomes. Stack drain requests one native asynchronous merge job; it never claims completion or performs a cleanup sweep.

## Validation
Run this project's TypeScript and Bun tests, including native parser refusals and cold command membership, then the app-owned installed native matrix.
