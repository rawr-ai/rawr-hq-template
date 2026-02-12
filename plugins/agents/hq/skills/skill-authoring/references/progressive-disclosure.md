# Progressive Disclosure for Skills

Goal: keep always-loaded context small while keeping depth available on demand.

## The buckets

1. `SKILL.md`
   - what the skill is for
   - when it should trigger
   - the default workflow
   - links to references/assets

2. `references/`
   - variants and deeper patterns
   - checklists and troubleshooting
   - failure modes and "what to do when it breaks"

3. `assets/`
   - templates and skeleton outputs
   - copy-forward checklists
   - minimal embedded guidance (short comments are OK)

## Decision rules

- If it must be read every time the skill triggers: keep it in `SKILL.md`.
- If it is only needed in some branches/variants: put it in `references/`.
- If it is meant to be copied into output: put it in `assets/`.

## Avoiding context bloat

- Keep `SKILL.md` primarily navigational.
- Split big topics into multiple small reference files.
- If a reference file is large, add suggested search terms at the top.

## Progressive disclosure test

- Read only `SKILL.md`: can you follow the default workflow without guessing?
- Open each linked reference: does it earn its existence?
- If a reference is not linked from `SKILL.md`, either link it or delete it.

