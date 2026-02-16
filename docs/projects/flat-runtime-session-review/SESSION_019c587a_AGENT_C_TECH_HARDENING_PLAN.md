# SESSION_019c587a — Agent C Technical Hardening Plan

## Scope Lock
- Target doc only: `docs/projects/flat-runtime-session-review/SESSION_019c587a_PACKAGE_APPROACH_A_PURE_DOMAIN_E2E.md`
- Supporting artifacts only: this plan + Agent C scratchpad.
- No edits outside the above files.

## Validation Inputs
- Required skills:
  - `/Users/mateicanavra/.codex-rawr/skills/inngest/SKILL.md`
  - `/Users/mateicanavra/.codex-rawr/skills/orpc/SKILL.md`
  - `/Users/mateicanavra/.codex-rawr/skills/elysia/SKILL.md`
  - `/Users/mateicanavra/.codex-rawr/skills/typescript/SKILL.md`
  - `/Users/mateicanavra/.codex-rawr/skills/plugin-architecture/SKILL.md`
  - `/Users/mateicanavra/.codex-rawr/skills/rawr-hq-orientation/SKILL.md`
- Official docs reachable from those skills:
  - Inngest docs (`/learn/how-functions-are-executed`, `/learn/serving-inngest-functions`, `/reference/serve`, `/guides/handling-idempotency`, `/platform/signing-keys`)
  - oRPC docs (`/contract-first/*`, `/rpc-handler`, `/openapi/openapi-handler`, `/openapi/routing`, `/adapters/elysia`)
  - Elysia docs (`/essential/life-cycle`, `/essential/plugin`, `/patterns/openapi`, `/plugins/swagger`)

## Hardening Work Items
1. Replace hand-wavy runtime claims with explicit end-to-end plumbing.
2. Add an **Inngest correctness + lifecycle** section:
   - step durability/memoization model
   - stable step IDs and idempotency layers
   - serve endpoint requirements and signing-key hardening
3. Add an **oRPC contract/implementation/transport correctness** section:
   - contract-first flow (`oc` -> `implement` -> router)
   - dual transport split (`RPCHandler` + `OpenAPIHandler`)
   - `.route()` behavior and prefix alignment caveats
4. Add an **Elysia mounting + adapter caveats** section:
   - `parse: "none"` for forwarded handlers
   - hook ordering and scope implications for plugin composition
   - explicit mount points for `/rpc`, `/api/orpc`, `/api/inngest`
5. Add **concrete plumbing code** that shows ownership boundaries:
   - package internals
   - plugin adapters
   - root composition (`rawr.hq.ts`)
   - app host mount file
6. Add explicit **project/file structure** for non-obvious ownership.
7. Add **Validation Notes** section with Observed vs Inferred + key references.

## Acceptance Criteria
- Inngest/oRPC/Elysia examples are plausible and align with current official docs.
- No hidden machinery for critical runtime wiring paths.
- File ownership and import direction are unambiguous.
- Validation Notes clearly separate observed evidence from architectural inference.
