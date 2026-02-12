# Agent QA Fix Plan (Final Gate)

## Mission
Block merge unless visual parity, accessibility behavior, runtime correctness, and legacy purge are fully satisfied.

## Skills
- `web-design-guidelines`
- `vercel-react-best-practices`

## Scope
- `apps/web/test/coordination.visual.test.ts`
- `apps/web/test/*`
- legacy grep/purge verification paths

## Planned Work
1. Run visual parity checks on desktop/mobile.
2. Run accessibility checks (focus, labels, live regions, reduced motion).
3. Validate no legacy route/file/style references remain.
