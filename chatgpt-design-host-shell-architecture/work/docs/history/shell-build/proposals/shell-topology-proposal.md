# Proposal: Restore Stable Topology Bones To The Shell

## Purpose

This proposal tells the future editor what topology and file-structure material should be restored or added to `RAWR Future Architecture.md` so the shell has durable structural anchors again.

The shell already has the right laws. What it lacks is a small set of concrete topology anchors that make those laws legible:

- what the ontology looks like in the repo at one glance
- what a host bundle looks like at shell level
- how the same model appears in shared-host, split-role, and promoted-bundle topologies

The goal is not to re-import implementation detail. The goal is to restore bones.

## What is shell-level and stable enough to include

The shell should only include topology that is stable across implementation changes and survives branch churn.

That stable topology is:

- the four canonical repo roots: `packages/`, `services/`, `plugins/`, `apps/`
- the fact that plugins are runtime projections of capability, not capability truth
- the fact that apps are hosts and contain composition authority such as `rawr.hq.ts`
- the canonical runtime roles: `server`, `async`, `cli`, `web`, `agent`
- the fact that one composition authority can back one process, multiple processes, or later multiple deploy units
- the workflow split between exposure authority and execution authority
- the stewardship overlay on the `agent` runtime role

The shell should show these as shallow trees and topology scenes, not as implementation scaffolds.

## Concrete filesystem trees to reintroduce

### 1. Add one shallow repo-shape tree under the ontology section

The shell needs one tree that shows the ontology as repo shape, not just as abstract nouns.

Use a tree at this level of depth:

```text
packages/
  shared-types/
services/
  support/
plugins/
  server/support-api/
  async/support-triage/
  web/support-panel/
apps/
  hq/
    rawr.hq.ts
```

This is the right level because it shows:

- `packages` as support matter
- `services` as semantic capability homes
- `plugins` as runtime projections keyed by runtime surface
- `apps` as host homes with composition authority inside them

Important constraint:

- keep this tree shallow
- keep it illustrative
- do not descend into `src/`
- do not show service-internal or workflow-internal folders here

### 2. Add one host-bundle example inside the host/runtime section

The host bundle definition is currently correct but too abstract. Add one minimal host-bundle example immediately after the `Host bundle` definition.

Use a shape like this:

```text
apps/hq/
  rawr.hq.ts
  <server role entrypoint>
  <async role entrypoint>
  <web role entrypoint optional>
```

This example matters because it restores three facts the shell needs to keep visible:

- `rawr.hq.ts` is app-internal composition authority, not a fifth ontology kind
- one host app may mount several runtime roles
- app internals should be shown only at the composition level, not as a frozen file law

The placeholder-style entrypoint labels are deliberate. They preserve the architecture without locking volatile filenames.

### 3. Keep specialized filesystem trees out of the shell

Do not reintroduce any tree deeper than the examples above.

Specifically keep these out:

- `services/foo/src/service/...`
- `service/shared/*`
- `modules/*`
- `plugins/workflows/*/operations/*`
- `plugins/workflows/*/functions/*`
- `plugins/workflows/*/runtime/*`
- detailed `apps/*` layouts beyond the composition-authority example
- Nx project files, tags, or generator outputs

Those are subordinate-doc trees, not shell trees.

## Runtime topology scenes to reintroduce

The shell needs topology scenes that show the same architecture in different placements. These should be short ASCII scenes, not deployment catalogs.

### 1. Shared-host / `n = 1` scene

Place this where the host/runtime model transitions into scale.

```text
1 host bundle
  -> 1 composition authority
  -> server role
  -> async role
  -> web role optional
  -> services called in-process where colocated
  -> sidecars optional, but not peer runtime roles
```

This scene restores the idea that a shared host is a real architectural state, not a fake temporary monolith.

### 2. Split peer-role scene

Add the next scene to show that `server` and `async` remain peers when split.

```text
1 host bundle
  -> process A = server
  -> process B = async
  -> same services, plugins, and packages model
  -> same composition authority
```

This scene should sit near the current `server` / `async` and sidecar language, because it makes the “peer runtime role” claim concrete.

### 3. Promoted peer-bundle scene

Add one scale-out scene under the scaling model.

```text
HQ host bundle
  -> server
  -> async

Promoted domain bundle
  -> server and/or async

Semantic service boundaries stay the same.
Only runtime placement and assembly split outward.
```

This is the stable promotion story the shell should carry. It is more important than any current deploy layout.

## Host-bundle examples to reintroduce

The shell should show exactly two host-bundle examples and stop there.

### Example A: primary HQ bundle

Use the `apps/hq/` example above as the canonical “one composition authority, multiple roles” illustration.

### Example B: promoted peer bundle later

Add one tiny example in the scaling section:

```text
apps/hq/...
apps/support/...
```

The point is not the domain name. The point is that later promotion produces another host bundle peer, not a redefinition of what `service`, `plugin`, or `app` mean.

Do not add more than these two host-bundle examples. More examples will drift into implementation speculation.

## What should stay out because it is too volatile

These specifics should remain outside the shell even if they are currently good ideas:

- service-internal kernel structure such as `base.ts`, `impl.ts`, `router.ts`
- module-local service law
- `db` vs `repository` mechanics
- workflow control verbs like `start`, `status`, `cancel`, `retry`, `timeline`
- Inngest function grouping and internal runtime helpers
- exact coordination/control-plane package names
- concrete Nx tag matrices, conformance rules, or graph law details
- exact host entrypoint filenames other than `rawr.hq.ts`
- substrate-specific deployment examples such as Railway service layouts, collectors, or backing services

Why these stay out:

- they are real, but they are not shell-defining
- they change faster than the ontology and topology
- they already have or deserve subordinate docs

## Shell-level topology vs subordinate-doc topology

The editor should preserve this distinction explicitly.

### Shell-level topology

Shell-level topology answers:

- what the top-level kinds are
- how repo roots differ in meaning
- what a host bundle is
- what runtime roles exist
- how runtime placement changes without changing semantic truth

Shell-level topology should be shallow, labeled, and invariant-bearing.

### Subordinate-doc topology

Subordinate-doc topology answers:

- how a service is structured internally
- how a workflow plugin is structured internally
- how control surfaces are generated
- how graph enforcement works
- how observability or runtime infrastructure is wired

Subordinate-doc topology can be deeper because it is scoped and replaceable.

## Direct editing guidance for the shell

### 1. Under `Top-level ontology`

After the `apps / hosts` subsection, add a short subsection such as `Minimal Repo Topology` containing the shallow root tree.

That is the right location because it turns the ontology into filesystem shape immediately, before the document moves into runtime roles.

### 2. Inside `Host bundles and runtime roles`

Right after the `Host bundle` definition, add the `apps/hq/` host-bundle example.

Then, after the runtime-role list and sidecar distinction, add one compact topology scene showing:

- shared host with multiple peer roles
- optional infra sidecar as a non-peer companion

This is where the shell needs visual reinforcement most.

### 3. Move topology contrast next to scaling

The current `Default topology stance` material belongs conceptually with the scaling model, not buried inside general boundary rules.

Keep the existing contrast:

```text
server host + async host
```

not:

```text
public API host + dedicated internal services host + async host
```

But place it with the runtime scenes and the `n = 1` to `n > 1` story, where it reads as topology guidance instead of a stray invariant.

### 4. Inside `Specialized runtime cases`

Add one tiny workflow scene and keep it at responsibility level only:

```text
boundary/server side  -> exposure authority
async side            -> execution authority
services              -> business capability truth
```

Add one tiny stewardship overlay scene and keep it equally shallow:

```text
service / plugin / host area
  -> steward-owned
  -> steward executes on agent runtime
```

Do not place any deeper plugin trees here.

## Editorial guardrails

- Every added tree must stop before internal implementation folders.
- Every added scene must express a durable architectural relation.
- Use placeholders where filenames are likely to churn.
- Keep `rawr.hq.ts` as the only concrete app-internal filename called out at shell level.
- Do not let shell examples silently import older runtime nouns like `worker` as peers to `async`.
- If a tree starts answering “how is this service/plugin implemented?”, it belongs in a subordinate doc instead.

## Bottom line

The shell needs exactly three kinds of topology anchors restored:

- one shallow repo-root tree
- three short runtime topology scenes
- two host-bundle examples

That is enough to give the document real bones again.

Anything deeper belongs to the service-internal doc, the workflow plugin doc, or future enforcement/spec work, not to the shell itself.
