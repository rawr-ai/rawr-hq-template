# Proposal: Reshape The Shell For Legibility Without Softening It

## Purpose

This proposal tells the future editor how to reshape `RAWR Future Architecture.md` so the document becomes understandable and illustrative again without turning back into a snapshot, design memo, or implementation guide.

The shell already has the right hard content. The problem is mostly document shape.

## What is structurally wrong now

The current shell is too linear and too compressed for the kind of abstraction it carries.

The main shape failures are:

- It front-loads abstract categories before giving the reader a stable picture of how those categories relate.
- It explains the ontology well, but gives almost no concrete anchor for how the ontology appears in repo shape or runtime shape.
- It postpones much of the rationale until late in the document, even though the rationale is what makes the earlier distinctions intelligible.
- It mixes different kinds of material inside the same stretch of document:
  - semantic law
  - runtime model
  - topology defaults
  - specialized case interpretation
- It buries companion-doc routing and “what is not locked here” near the end, so the shell carries more cognitive pressure than it should.
- It lost the explanatory scenes that made prior reasoning legible:
  - same model at `n = 1` and after split-out
  - `server` and `async` as peers rather than app + sidecar
  - workflow exposure vs execution authority
  - stewardship as an overlay, not a new ontology kind

The result is a doc that is canonically precise but harder to enter than it needs to be.

## Revised section flow

The shell should be reshaped into this flow:

| Section | Job |
|---|---|
| `What This Shell Is` | State the shell contract, what it locks, what it intentionally does not lock, and where sequencing/detail live elsewhere. |
| `Architecture At A Glance` | Give one compact diagram showing the full stack: semantic truth -> runtime projection -> runtime roles -> host bundle -> deployment shape. This is the reader’s mental map. |
| `Core Ontology` | Define `packages`, `services`, `plugins`, and `apps/hosts` in concise normative form. |
| `Runtime Assembly Model` | Explain host bundles, runtime roles, and the sidecar distinction. This is where the host memo’s durable language should live. |
| `Boundary Laws` | Gather the invariant rules in one place: service boundary first, transport second; plugins project capability; hosts assemble runtime; shared infrastructure does not imply shared ownership. |
| `Default Topology And Scale` | Explain default `server + async`, the anti-default of a dedicated internal services host, and the `n = 1` to `n > 1` continuity story. |
| `Specialized Interpretations` | Cover workflows and agent/stewardship as applications of the main model, not as new foundations. |
| `Why This Shape Exists` | Keep the rationale section, but make it shorter and more directly tied to the shell’s distinctions and what they unlock. |
| `What Remains Outside The Shell` | Keep explicit deferrals and companion-doc routing together so the shell stays hard and bounded. |

This ordering matters. It moves from orientation -> nouns -> assembly -> laws -> deployment behavior -> special cases -> rationale -> boundaries.

## Where concrete structure and illustrations belong

The shell needs concrete anchors, but only where they stabilize the abstraction.

### 1. Add one minimal repo-shape example after `Core Ontology`

Use a tiny file-tree slice immediately after the ontology definitions. Its job is not to define folder law. Its job is to show how the four root kinds differ in practice.

It should look like a labeled illustration, not a normative scaffold:

```text
services/todo
plugins/api/todo-api
plugins/async/todo-sync
apps/hq-server
packages/shared-types
```

Rules for this tree:

- Keep it tiny.
- Use stable illustrative names.
- Label it as an example of category shape, not canonical folder law.
- Do not descend into service-internal structure.

### 2. Put runtime scenes inside `Runtime Assembly Model`

This is where the shell most needs pictures.

Use two or three short ASCII scenes:

- single-process or shared-host mode
- split-process same composition authority
- multi-host promotion later

These scenes should show that the semantic model stays fixed while placement changes.

They belong here because they explain host bundle language better than prose alone.

### 3. Put the topology anti-example inside `Default Topology And Scale`

The current contrast between:

- `server + async`
- `public API + internal services host + async`

is valuable, but it belongs with topology stance and scaling, not mixed into general boundary rules.

Keep it as a short contrast block. Its job is to clarify the default, not to enumerate all possible deployments.

### 4. Put workflow and stewardship scenes only in `Specialized Interpretations`

Each specialized case should get one small interpretation frame:

- workflows: exposure authority vs execution authority
- stewardship: service/plugin/host ownership overlaid by the `agent` runtime role

These should be one-step application diagrams, not subsystem tours.

## What should remain mostly as-is

These parts of the current shell are already doing the right job and should mostly survive with only local tightening:

- The core separation of semantic truth, runtime projection, and host/composition authority.
- The four-part top-level ontology and the definitions of each root kind.
- The host bundle and runtime role language from the host memo.
- The sidecar distinction.
- The rule that service boundary comes before placement and transport.
- The rule that shared infrastructure does not imply shared semantic ownership.
- The scale-out thesis that the same architecture holds from `n = 1` to larger deployment shapes.
- The workflow responsibility split and agent-runtime placement as shell-level interpretations.
- The explicit “not locked here” boundary.

The editor should preserve these as the hard shell and spend effort on order, transitions, and illustration.

## What should be compressed

- Repeated leverage/rationale phrasing. The shell currently reasserts the same motivation in several places.
- Repeated restatements that services are not packages, plugins are not semantic truth, and apps are hosts. Keep each distinction once in its strongest location, then reference it implicitly.
- Repeated reminders that the shell is not a sequencing plan. State this clearly up front and once again in the closing boundary section if needed.

Compression goal: less essay repetition, more structural clarity.

## What should be expanded

- The opening orientation. The reader needs a fast mental map before entering ontology.
- The transition between ontology and runtime model. Right now the jump is abrupt.
- The explanation of why topology defaults follow from the earlier laws.
- The final deferral/routing section, so readers can clearly see what belongs in supporting docs versus the shell.

Expansion goal: bridge the concepts, not add more content volume everywhere.

## What should be split

Split the current middle/end into cleaner layers:

- `Boundary Laws` should contain semantic and architectural invariants.
- `Default Topology And Scale` should contain deployment stance and growth shape.
- `Why This Shape Exists` should contain rationale, not more model definition.
- `What Remains Outside The Shell` should combine non-goals with companion-doc routing.

This split prevents the shell from oscillating between ontology, deployment, and rationale in the same section run.

## Editorial guardrails

Use these rules when reshaping the shell:

- Do not rewrite the shell into a tutorial. Keep it normative.
- Do not replace definitions with diagrams; use diagrams to stabilize definitions.
- Prefer three durable illustrations over many local examples.
- Every illustration must express a stable architectural relation, not an implementation accident.
- Keep concrete examples shallow enough that future internal restructuring will not invalidate them.
- Preserve the shell/snapshot distinction: the snapshot carries sequencing and active pressure-testing; the shell carries settled destination structure.

## Recommended editing pass sequence

1. Add the new opening orientation and “at a glance” section.
2. Move ontology, runtime assembly, and boundary laws into the new order.
3. Insert one minimal repo-shape illustration and the runtime scenes.
4. Move topology stance into its own section next to scale.
5. Keep workflows and stewardship as specialized interpretations.
6. Compress rationale into one tighter section tied directly to what the shell unlocks.
7. Merge non-goals and companion-doc routing into the closing boundary section.

If this is done well, the shell will read as a hard architectural destination with just enough picture-making to keep the abstractions legible.
