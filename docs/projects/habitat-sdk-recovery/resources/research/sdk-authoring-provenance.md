> **Preserved evidence, not current authority.** September 15 authoring and provenance findings.
> Imported on 2026-09-15. Narrative retained; local links normalized where available.
> Unbundled local references are provenance text, not repository dependencies.
> See the [source register](../../SOURCES.md#authoring-evidence) and [current assessment](../../assessment.md).

# SDK Authoring Provenance

Read-only evidence pack, 2026-09-15. No source or runtime probes executed by this
pass. Historical probe results below are not fresh reproductions.

## Sources

- `B`: [boundary assessment](habitat-boundary-assessment.md).
- `R`: [runtime release](habitat-runtime-release.md).
- `O`: [original SDK proposal](rawr-sdk-ergonomics-proposal.md).
- `P`: platform `/Users/mateicanavra/Documents/.nosync/DEV/habitat/rawr-hq-template`.

## Conclusion And Chronology

The release genuinely delivered a native runtime, but did not complete the
previously requested authoring-design investigation. These statements coexist.
The recovery assessment's missing runtime is a September 4 observation, not the
current state. Realignment subsequently changed authority/acceptance without
shipping source; runtime release then delivered native Effect, managed resources,
and native host integrations (`R:5-21`). The September 6 boundary assessment
explicitly reopened correctness and authoring contracts and says its repairs were
**not implemented** (`B:15-37,328-329`).

Original intent was a *proposed*, architecture-preserving ergonomics pass, not
authority to resurrect its superseded implementation model (`O:3-11,115`). It
included real inference and capability-access obligations, not just removing
`.factory()` (`O:2425-2437,2486-2521,2823-2889`).

## Twelve Dispositions

These are the later assessment's decisions, **not shipment receipts**
(`B:219-237`).

| Proposal | Disposition |
| --- | --- |
| A: public tiers | Hide private machinery from ordinary authors; teach actual exports, no automatic new lint rule. |
| B: direct builders | Adopt; preserve options, cold construction and named instances. Cross-lane proof pending. |
| C: common grammar | Adopt ordinary consistency, not one universal native-host shape. |
| D: direct maps | Normalize only information-free wrappers; preserve identity and meaningful modifiers. |
| E: projected resources | Adopt typed access from declarations, preserving optional absence, ownership and lifetime. |
| F: dependency maps | Simplify declarations into existing dependency semantics, not a new cache/container. |
| G: Effect imports | Keep curated *native* Effect; restore narrowed native capabilities, reject custom interpreter restoration. |
| H: invocation/client | Keep service-owned invocation mapping; repair continuation and qualify native callers. Reject event-ID-derived authority. |
| I: service topology | Preserve domain/module ownership; correct examples without blanket internal reorganization. |
| J: diagnostics | Defer optional renderer until a concrete repair journey needs it. |
| K: host ownership | Keep native dispatch/lifecycle and selected local execution; reject universal descriptor ownership over oRPC. |
| L: declaration/context | Required contract; selected service/resource/event types need cross-lane positive and negative proof. |

## Current Source Confirmation

The inspected source paths are unchanged from release-source `f52474a7` to HEAD
(`git diff --stat f52474a7..HEAD -- <inspected paths>` returned empty). This
confirms source continuity, not independent verification of published tarballs.

- Direct server builders remain absent: `P/packages/core/runtime/definition/src/plugin.ts:288-355`
  exposes `.factory()` only. Bare service maps remain unsupported by
  `ServiceUses` at `P/packages/core/runtime/definition/src/service.ts:210-225`;
  `useService` still carries real instance/binding semantics at `:385-419`.
- Service dependencies still use mixed `deps`, not proposed split maps:
  `service.ts:49-86`. Server resources remain a broad `RuntimeResourceMap`, not
  declaration-key projection: `plugin.ts:72-80`. Thus simplification cannot be
  pronounced shipped merely because related runtime infrastructure exists.
- Client exposure is substantive: `service.ts:118-145` returns native
  Effect-facing bound clients, with no direct Promise facet. Historical
  `createProcedureClient` delegation proves native composition is possible, not
  full error/cancellation/stream parity (`B:155-167,319-322`).
- Public/internal classification hardcodes protocol: `P/packages/core/runtime/process-runtime/src/adapters/elysia.ts:54-59`
  selects OpenAPI versus RPC, and `:72-95` also changes documentation behavior.
  Exposure/publication inputs are forbidden (`plugin.ts:82-110`). Both SDK
  implementation names alias the same native implementer
  (`P/packages/core/sdk/src/plugins/server/index.ts:1-4`). Internal is explicitly
  **not** authentication/network isolation in `P/docs/system/HABITAT_RUNTIME_REALIZATION.md:7773`.
  This is an unnecessary contract coupling, not evidence of an authorization flaw.
- Host-side web service selection is explicitly rejected (`plugin.ts:395-410`).
  This is a product capability decision, not automatically a prerequisite for
  browser-to-server consumers (`B:186-191`).

## Durable-Handoff Gap

`P/docs/projects/habitat-runtime-realignment/IMPLEMENTATION.md:3` says complete;
`:1945-1998` contains only the earlier investigation request and **initial**
disposition, followed by runtime closure. Its request explicitly demanded
adopted/superseded dispositions (`:1979-1983`). The live deferred handoff's D-1
through D-5 do not include the subsequent authoring/lifetime repairs
(`deferred-capabilities.md:25-33`).

Tracked-HEAD searches found no `habitat-boundary-assessment`,
`habitat-async-function-design`, `function-first`, `prebound client`,
`declaration-to-context`, or twelve-proposal disposition. No active successor
was located; nonarchived OpenSpec only contains repository-preset work. The
later contract inventory remains in task outputs rather than the repository's
live routing. Preserve historical completion, but admit a successor explicitly.

## Human Decisions And Next Boundary

Human review should select the canonical direct-builder/dependency grammar and
migration compatibility; the ordinary native Promise/Effect caller experience;
separate protocol, publication and caller-policy semantics; and the actual
supported host-side web service boundary. Native function-first async is a
bounded integration redesign already recommended, not shipped, and should join
that contract review rather than be disguised as spelling cleanup.

Then Habitat owns implementation, type-negative journeys, executable examples,
policy successors and released-package acceptance together. Marketplace owns
vendor teaching refresh; consumers own product workflows. Qualify the smallest
real persistent consumer, including actual provider readback, rather than all
future capabilities (`B:269-295`). Niche admission, D-1 through D-5 and optional
diagnostic rendering must retain explicit separate dispositions (`B:239-261`);
they neither invalidate the runtime nor become done through its release.
