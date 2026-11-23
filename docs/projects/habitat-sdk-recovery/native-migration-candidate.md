# Native SDK and CLI migration

**Candidate for landing:** `0.7.0-rc.2` replaces RC1. In the
[hosted Windows check for RC1](https://github.com/rawr-ai/rawr-hq-template/actions/runs/45082705546/job/137394220836),
the installed CLI missed project-local blueprints. Habitat had joined the
workspace path to its glob patterns; Effect treated Windows separators as
escapes. The CLI now passes a literal workspace root and relative patterns.
A portable catalog test reproduces the failure with brackets in the workspace
name and passes with the fix. The fix does not change the authority patterns
or exclusions. A separate legacy migration hit its subprocess deadline in
that run; its timing is not evidence for or against the catalog fix.

The [first hosted RC2 Windows run](https://github.com/rawr-ai/rawr-hq-template/actions/runs/45085721307/job/137403756700)
found the local blueprints and generated the service. It also exposed an
LF-only test against valid CRLF TOML. The qualification now reads the numeric
policy selection rather than treating a line ending as policy. Repository
creation and legacy migration report their stages separately; the preset's
compound Windows test no longer has the same ceiling as its first command.
Individual command deadlines remain enforced.

The migration fixture preserves the published 0.5.3 compatibility recipe:
Nx 23.1.1 drives its plan and apply. For the ordinary later starting points
(0.5.6 and 0.5.15) it pins the native migration CLI to 23.3.0 for repeatable
qualification. Ordinary Nx otherwise resolves a current migration CLI; this
is not a change to the consumer workspace's installed Nx. The older planner
could misread npm 12 registry metadata and install whole packages to inspect
them. See [Nx's metadata fix](https://github.com/nrwl/nx/pull/36901) and
[loopback registry fix](https://github.com/nrwl/nx/pull/35954). Passing with
this pinned tool does not certify every newer planner.

In three fresh Darwin fixtures using the same RC2 packages, Nx 23.1.1
fell back to installing both packages whether the registry hostname was
`127.0.0.1` or `localhost`; Nx 23.3.0 made neither fallback. All
three plans selected the right package pair and the same migration.
This isolates the registry behavior; it does not attribute every second
of the Windows timeout to it.

**RC1 result (November 19, 2026):** The SDK and CLI at `0.7.0-rc.1` qualified
together on a local Darwin ARM64 host. Both product archives from an
independent rebuild matched byte for byte. The qualification did not publish
a package, merge a branch, change downstream policy, or enable external export.

**Decision:** On November 18, 2026 the platform owner admitted the scoped
migration, including the stream-cancellation and HTTP-error behavior recorded
in the [runtime specification](../../../openspec/specs/runtime-harness-boundary/spec.md).
That decision covered local assembly, packing and qualification. On November
22 the owner also authorized opening and merging the migration PRs into
`main` through the required checks. A release tag, package publication,
deployment and external telemetry export are not authorized by that decision.
Released 0.6.0, the earlier experimental packs and this candidate are three
different things. A pass on one is not a pass on another.

## What changes for a consumer

- **Local catalog discovery:** The existing directory exclusions now apply
  beneath `.habitat` as well. For example, `.habitat/blueprints/vendor/blueprint.toml`
  used to register on the old cohort; move it to a blueprint ID that is not
  an [excluded directory name](../../../services/catalog/src/service/modules/catalog/model/policy/repository-paths.ts)
  and update its instances. The same rule applies to local compatibility rules.
- **Cancellation:** returning an in-flight native iterator can close the
  caller's pending result without delivering the old trailing value. Stop
  still waits for the real pull to settle; cleanup runs once and a retained
  expired continuation cannot start new work.
- **HTTP and errors:** the stock host keeps native status mapping. A declared
  `CONFLICT` remains 409; an unmapped custom code now defaults to 400, not 500.
  Its code and message survive, but the old `inferable` field is not a contract.
  Successful authored spans may have UNSET status; native error spans may
  carry exception messages that Habitat's bounded diagnostics do not include.
  The provider's external-export sanitization gate remains closed.
- **Resource and tracing ownership:** oRPC owns the handler terminal and
  propagation; Effect runs the body with the app-selected context. Habitat
  keeps the guarantees the vendor does not supply: select one provider,
  release only the instrumentation it installed, and hold the caller's
  resources until admitted work has actually finished. A middleware pass is
  not another Habitat operation. Defect classification covers handler Effects
  only. In the pre-`next()` Effect-middleware test a defect was reported as
  an ordinary rejection at warning severity with no Habitat operation span;
  the vendor middleware span still recorded the exception. This changed with
  the handler-only guard. Authored Effect middleware is not a supported
  Habitat surface; non-Effect native middleware was not tested.
- **Package boundary:** the two products must share one physical SDK and
  native oRPC realm at the actual consumer. Matching version strings alone
  do not prove this. The qualification harness detects split installations;
  Habitat does not prevent them at install time. A downstream app, not Habitat,
  owns its root Oclif selection. No new schema, MCP host or public tracing API
  is part of this change.

## What was selected

RC1 and RC2 both select Effect 4.1.4, the exact oRPC
2.0.0-beta.51 family and the renamed `@orpc/effect` bridge. The public
TypeBox boundary and generated OpenAPI 3.1.2 remain. The repository still
bootstraps its own governance with the previously released CLI.

The first pack, `0.7.0-rc.0`, passed the runtime checks but exposed an
authoring trap in independent review. The service kind's unversioned README
and skill belong to its immutable version 1. A service upgrading the package
but keeping policy 3 or 4 can also get a green result on a direct import of
the new vendor bridge. Neither is a current-cohort authority.

The successor pair routes authors through their selected service and the
[SDK guide](../../../packages/core/sdk/README.md#service-authoring-on-the-beta51-orpc-cohort).
Owners upgrading this cohort choose 3 to 5 or 4 to 6 explicitly, then use
the installed `habitat resolve` and `habitat check` commands. Package install
does not rewrite a downstream manifest. Old definitions remain replayable;
they do not certify the new bridge. The version-1 skill was not edited.

On November 19, 2026, the registry's oRPC beta tag had advanced
to beta.52 while `latest` still selected 1.x. Comparing the published beta.51
and beta.52 packages found identical Effect bridge code and identical oRPC
instrumentation enable/disable implementation: disabling still clears the
current tracer without checking who installed it. The new backend changes
how exceptions are serialized instead. It is not an ownership simplification
and is not qualified by this candidate. See [oRPC OpenTelemetry integration](https://orpc.dev/docs/integrations/opentelemetry).

The exact runtime contract is in the [canonical realization](../../system/HABITAT_RUNTIME_REALIZATION.md)
and its [acceptance scenarios](../../../openspec/specs/runtime-harness-boundary/spec.md).
The [deferred-capability register](../habitat-runtime-realignment/deferred-capabilities.md)
retains external export. This decision does not claim every app should use
Habitat, nor that historical examples independently validate a recovery method.

## RC1 private qualification

The following results refer to the private qualification builds on November 19.
Between the first clean producer build and the full installed test, one test
fixture changed to fix a duplicate local name. Both builds produced the
byte-identical archives below. The product sources in the migration stack
match the measured versions; a fresh build from the stack reproduced both
hashes. Compare the packages by content, not by a branch name or version alone.

| Private package | SHA-256 |
| --- | --- |
| `@habitat-ai/sdk@0.7.0-rc.1` | `29fba0d42af31b9dbcb76a451fe5cd398b4955dd292713231d70347d6331de62` |
| `@habitat-ai/cli@0.7.0-rc.1` | `896f7a0c39a373af2e8c3422237f910c3704af986c3c5ce28bcf735c9589534c` |

On the frozen source, the uncached workspace check passed all 147 tasks
(39 targets and 108 dependencies). The installed CLI suite independently
repacked both products and passed 47 of 47 runnable cases in three files;
only the two Windows `.cmd` cases were skipped. The service generator,
source restrictions and both policy successors separately passed 42 tests
with 91 assertions. The updated runtime specification passed strict validation.

An independent reviewer qualified all eleven controls on these archive
hashes. The review recomputed installed-file identity and HTTP trace ancestry
rather than accepting producer summaries. It also replayed 108 focused Bun tests,
80 SDK tests and 28 dev-service tests. Removing the handler guard and
reversing the cleanup fix each turned its intended test red.

| Question | Result and counterexample |
| --- | --- |
| Can the packages be installed without a private workaround? | Empty npm and Bun consumers using default install flags and scripts, plus strict-peer npm and explicitly isolated Bun, obtained the two named products from a read-only loopback registry. No copied lock, override, patch or workspace dependency. All 275 SDK and 58 CLI files matched the archives. |
| Does the public contract distinguish the official bridge? | Strict TypeScript with library checking accepted the valid application and rejected wrong owner, input and declared-error payload. Both overlapping requests carried their own Effect tag. A plain handler produced the same 200/200/403 responses but failed the tag check. A real abort ran the request finalizer; an expired resource/client could not be reused. |
| Who owns telemetry? | Native oRPC and Effect spans share one trace. An independent replacement provider still emitted after Habitat stopped; in the converse arm Habitat disposed of its own binding and could reacquire it. Four installed CLI runs each delivered eight connected spans; dropping oRPC instrumentation kept command output correct but removed the required procedure span. An independent 36-case replay on Node and Bun also distinguished a healthy 11-span HTTP request from a broken setup returning 200 with no spans exported. No public tracing registry or second runner is needed. |
| Does policy reach a real author? | The installed generator and resolver routed authors to the versioned SDK asset. In 16 installed-CLI cases, valid native and facade code passed under all four selectors. Correctly typed raw handler and middleware imports slipped past @3/@4 but failed only the selected bridge rule under @5/@6. All 42 predecessor files still match published 0.6.0. |
| Can Habitat administer its own checkout? | The normal root gate uses the released CLI. Separately, the installed RC1 CLI resolved its own RC1 SDK policy pack and evaluated all 93 policy applications across 38 owners in the frozen producer checkout: 93 passed, zero findings. |
| Does a real consumer benefit? | Rawr's isolated six-task build, SQLite cleanup on success and failure, and CLI restart/search passed with its existing Oclif choice explicitly pinned at the root. Without that pin, two physical SDKs appeared and service binding failed to type-check. Rawr was tested in disposable copies, not modified. Native SQLite cleanup alone is not an argument for Habitat. |

**Limits:** local Darwin ARM64, synthetic data and loopback OTLP. The main
toolchain was Node 24.18.1, Bun 1.3.14 and npm 12.0.2; the independent Node
HTTP arm uses 24.22.3. The two Windows command-shim cases cannot run on this
host. Linux, hosted storage/export and OTLP log records are not qualified.
The one-realm evidence covers the SDK, native Effect/oRPC, and OpenTelemetry
trace/metrics API, not every auxiliary package: the two log API versions
remain distinct. The earlier experimental requirement to leave every test
and law untouched is not claimed; this assembly used the owner's admitted
successor laws and explicit behavioral expectations. No release was attempted.

**Carry into release review:** A consumer who upgrades the packages and
leaves service policy at 3 or 4 gets a green check that does not cover the
new bridge. The README says this; the command output does not. Upgrade the
selector to 5 or 6 for enforcement. Before release, decide whether
`resolve` or `check` should also report a superseded selector in its
machine-readable output. Such a change would require a new archive and new
qualification; it does not block this private candidate.

**Old-cohort comparison (November 22):** In a fresh install without
dependency overrides, the policy-only change and untouched `main` before the
migration failed the same 13 named installed tests and passed the same 34.
Both selected a newer native platform dependency that imports modules absent
from the old Effect build. On the parent's pinned dependencies, all 40
installed source-policy cases behaved as expected. The complete RC1 pair
passed all 47 runnable installed tests without those overrides. The experiment
isolates what policy selection changes; it does not qualify a separate 0.6
release or justify landing a known-failing intermediate product.

## Recheck the evidence

To check your own checkout, start with `bun install --frozen-lockfile`
and `bun run check --skip-nx-cache`. The installed-product suite is a
separate target: `bunx nx run @habitat-ai/cli:acceptance:oclif-installed-package --skip-nx-cache`.
By default it skips the two opt-in native integrations. To exercise those
on POSIX, enable `HABITAT_NATIVE_AGENT_ACCEPTANCE` and
`HABITAT_NATIVE_DEV_ACCEPTANCE` (both `1`) and supply the explicit Codex,
Claude, Git and Graphite executables as specified in the
[installed suite](../../../apps/habitat/test/installed-package.test.ts).
This produces evidence for your checkout, not the historical archives.

The following historical receipts and tarballs are for RC1, not RC2. They
must not be used as proof of the replacement archives. From the private evidence
root, run
`shasum -a 256 -c assembled-rc1.LCWZTP/QUALIFICATION.sha256`. This
checks 28 entries, including both builds' archives and the independent
teams' evidence indexes. The index itself hashes to
`7f7f968a30532c9cc5d13deedf666efedf0d01f123787892369038553688a0cf`.

| Receipt directory (relative to that root) | First thing to read |
| --- | --- |
| `assembled-rc1.LCWZTP` | `check.IOa1bv/check.log`, `installed.D6u3v6/installed.log`, the two default-install receipts and `self-host-check.json`. `gate.sh` records how each isolated workspace was installed, packed or tested. |
| `packed-rc1.YVmVyp` | `RESULTS.md`: installed consumers, tracing, ownership, author contract, and the real Rawr counterexample. |
| `service-selector-rc1.XSUsfp` | `matrix-controlled.json` for the 16 policy choices; `resolve-installed-assets.jsonl` for what the generated instructions actually lead authors to. |
| `c7-rc1.0dJNZy` | `SHASUMS256.txt` indexes the independent Node and Bun trace comparison, including the broken setup. |
| `director-focused-rc1.MzWAOt` | `status.txt` records the independent focused replay and two deliberate regressions that the checks caught. |
