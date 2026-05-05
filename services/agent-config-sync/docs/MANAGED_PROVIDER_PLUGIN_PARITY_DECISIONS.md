# Decisions - Managed Provider Plugin Parity Workstream

Status: `active`.

Canonical decisions register for the managed provider plugin parity workstream.
This records workstream-level execution choices and meta-design decisions.

---

## D-1 - Reset After Provider Boundary Drift

**Question:** How should the workstream recover from the accidental Codex fork
implementation attempt?

**Options:**

- **A - Continue provider fork work:** Treat Codex hook support as a provider
  implementation gap and continue patching the fork.
- **B - Reset and prove provider truth first:** Remove the accidental provider
  worktree, re-investigate native Codex/Claude capability, and implement only
  template-side work justified by evidence.

**Chosen:** **Option B.**

**Rationale:** User instruction and workstream discipline require provider truth
before implementation. The accidental Codex branch was outside the template
workstream boundary.

**Downstream effect:** Provider changes are out of scope unless a later explicit
decision creates a separate provider workstream. Template dirty changes remain
provisional until evidence lanes classify them.

---

## D-2 - Workstream Team Shape

**Question:** What agent structure should run the re-investigation?

**Options:**

- **A - Host-only investigation:** DRA reads all sources locally.
- **B - Paired read-only lanes:** Use paired agents for Codex provider truth,
  Claude provider truth, and RAWR service/CLI truth, followed by architecture
  review lanes.

**Chosen:** **Option B.**

**Rationale:** The workstream failed when implementation raced ahead of
controlled evidence. Paired lanes create independent evidence packets while the
DRA retains synthesis authority.

**Downstream effect:** No implementation decision is accepted until the DRA
synthesizes the read-only evidence packets and records the decision gate.

---

## D-3 - Perspective Geometry

**Question:** What perspective movement governs the reset?

**Options:**

- **A - Implementation-only:** Focus on the files already changed.
- **B - Altitude cycling:** Evaluate from implementation, service, product, and
  architecture altitudes before coding.

**Chosen:** **Option B.**

**Rationale:** The core risk is mistaking file-copy parity for installable
provider capability. Altitude cycling separates runtime mechanics, service
ownership, user-facing installation, and target architecture.

**Downstream effect:** The decision gate must name what is visible at each
altitude and what remains excluded or unproven.

---

## D-4 - Domain Boundary

**Question:** How should direct sync be classified?

**Options:**

- **A - Legacy fallback for Codex/Claude:** Keep direct sync as a sanctioned
  provider deployment escape hatch until parity is complete.
- **B - Generic destination projection:** Retain direct sync only as an
  auxiliary from-to projection/export capability, with Codex/Claude deployment
  owned by native provider plugin paths.

**Chosen:** **Option B.**

**Rationale:** User instruction explicitly rejects hybrid legacy deployment.
Direct sync may still be useful as a generic RAWR-owned projection engine for
ad-hoc destinations and non-CLI systems.

**Downstream effect:** CLI and docs must distinguish native provider deployment
from generic projection. Native provider gaps are blockers, not reasons to
silently fall back to direct writes.

---

## D-5 - Information Authority

**Question:** Which evidence wins if docs, local source, and installed runtime
disagree?

**Options:**

- **A - Prefer local docs:** Treat plugin authoring docs as provider truth.
- **B - Prefer installed/native runtime proof:** Use official/current provider
  docs when available, then installed app-server/CLI protocol and source, then
  repo docs as intent.

**Chosen:** **Option B.**

**Rationale:** The user specifically asked whether Codex docs prove native
support or whether the fork/runtime is stale. Runtime capability must be proven
before parity can be claimed.

**Downstream effect:** If Codex docs advertise hooks but installed/runtime
surfaces do not activate plugin hooks, the report records provider-version skew
or a provider blocker instead of hiding the gap in template sync code.

---

## D-6 - Codex Plugin Hook Provider Truth

**Question:** Should the template adapter target Codex plugin hooks now?

**Options:**

- **A - Wait for `codex-rawr`:** Treat the current RAWR fork as the only
  acceptable provider and stop until it rebases.
- **B - Target the current native Codex provider:** Implement against official
  docs and latest native Codex runtime, while recording the current
  `codex-rawr` version gap.
- **C - Patch the provider fork inside this workstream:** Continue the
  accidental provider branch and make the fork match upstream.

**Chosen:** **Option B.**

**Rationale:** Latest native `@openai/codex@0.128.0` proves plugin-local hooks
through app-server `hooks/list` when started with `--enable plugin_hooks`.
Current `codex-rawr` is `0.126.0-alpha.3` and rejects that feature flag. The
template can implement the blessed adapter now, while provider rebase remains a
separate runtime dependency.

**Downstream effect:** Codex hook-containing packages are verified through
`hooks/list`. The adapter starts app-server with `--enable plugin_hooks` only
when hooks are present and fails honestly when a selected Codex binary lacks
that provider surface. No direct-sync fallback is introduced.

---

## D-7 - Published Codex Types

**Question:** Should RAWR depend on a published Codex TypeScript/API package
for plugin and app-server schemas?

**Options:**

- **A - Depend on an npm types package:** Add a durable package dependency if
  one exists.
- **B - Generate/query from the installed provider:** Treat generated
  app-server TypeScript/JSON Schema as version-specific provider evidence.

**Chosen:** **Option B.**

**Rationale:** `@openai/codex@0.128.0` does not publish `types`/`typings`, and
the npm tarball contains only the CLI wrapper, ripgrep binary, README, and
package metadata. Official app-server docs make generated schema output
version-specific to the selected Codex binary.

**Downstream effect:** Tests and docs may use generated provider types as
evidence, but RAWR should not claim a stable published type dependency until
Codex publishes one.

---

## D-8 - Generic Projection Command Surface

**Question:** How should the retained direct-sync capability be exposed?

**Options:**

- **A - Keep it hidden behind Codex/Claude sync defaults:** Preserve old
  provider flags and let direct writes fill parity gaps.
- **B - Give projection an explicit command surface:** Expose
  `rawr plugins export` / `rawr plugins export all` and make
  `--destination-projection` an advanced auxiliary sync flag.

**Chosen:** **Option B.**

**Rationale:** The user wants one sanctioned native provider path for Codex and
Claude, while retaining RAWR's generic from-to mapping capability for arbitrary
destinations. A distinct export surface keeps the domain useful without
blurring deployment authority.

**Downstream effect:** `rawr plugins sync` defaults to native provider
deployment. `rawr plugins export` is explicitly non-deployment projection and
returns `deployment: false` in JSON output.
