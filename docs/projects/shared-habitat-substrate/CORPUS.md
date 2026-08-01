# Shared Habitat Substrate Corpus

**Status:** Controlled transfer evidence
**Date:** 2026-07-31

## Authority

- `RAWR_Canonical_Architecture_Spec.md`
- `RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md`
- `.habitat/AUTHORITY.md`
- `.habitat/README.md`

Magic Migration and Civ7 are implementation and consumer evidence. They may
prove an executable shape or expose a missing generic law; they retain
historical provenance, not Habitat source, package, or release authority.
They do not contribute product names or instance inventories to RAWR
HQ-Template's generic blueprints.

This corpus is evidence for
[[openspec/changes/complete-agent-plugin-lifecycle-public-interface/README|the active OpenSpec]].
It is not a second plan or normative design.

## Authority Boundary

This repository owns the Habitat product source, `@habitat/cli` release
identity, releases, consumer integration, and generic blueprint policy. The
planned `@habitat/blueprints` artifact will distribute accepted policy as
versioned data. The Habitat service owns exact resolution, protocol validation,
admission, evaluation, and classification. Qualified plugins own Oclif and Nx
projection. The Habitat app owns provider/profile selection, product
composition, and the executable entrypoint.

The target public policy export surface is:

```text
@habitat/blueprints/
  habitat-pack.json
  blueprints/**
```

Executable JavaScript, product instances, host baselines, RAWR HQ-Template
paths, and legacy v2 rules are outside the pack. Resolution has no fallback or
precedence layer. Multiple accepted versions of one blueprint identity may
coexist. A duplicate blueprint identity/version pair is fatal, and rule ids are
globally unique across the resolved authority catalog.

## Transfer Evidence

The current Civ7 source audit establishes these exact, read-only inputs:

| Input | Commit or tree | Disposition |
| --- | --- | --- |
| Portable CLI and Nx baseline | commit `ebf5bbcab1e754a17a63999747f80c5e60b28fb7`; Habitat tree `5c147f3dc9dde3191d00d79ecc30a734e55a84a3` | Landed evidence for scoped primitive extraction after deproductization |
| Habitat self-authority | tree `fb0c8ee633050af6caa559851c3df8e02a1308bb` | Stable evidence for scoped primitive extraction |
| Blueprint admission | commit `e78121508f4e411cfbcf4dd0f3d5ea07fdd70750` | Clean local implementation evidence; not a release |
| Resolved applications | commit `8b18c9f46d8bfe8471ced1b8acf573dea297a0fb` | Clean local implementation evidence; not a release |
| Application execution | commit `7b6da1c525acb6f37822d383d2240cccd5b3fa36` | Clean implementation evidence beneath moving work; not a wholesale transfer tree or release |
| Application classification | commit `b41cf544b1a3aa446320894ef2b5f01b5051b0eb`; tree `46e252dd8f2c75be30bae06c165a1ce111e58b4f` | Clean scoped implementation evidence; not Nx projection or a release |
| Habitat authority ontology | file at commit `ebf5bbcab1e754a17a63999747f80c5e60b28fb7`; blob `021bc1895f6e65cde6b2d1e8fc297720cb4a8b20`; introduced by `de8359e8ea7039359aa101c4b8f6614f8c1b49f7`, last substantive ontology activation `f6454f82e6788415a0315b7d61e0f75f2a756b46` | Conceptual consolidation only; product examples and transitional physical layout do not transfer, while capability and niche realization remain deferred |

No `@habitat/cli@0.2.0` release exists. Nx application projection and Fluree
lifecycle changes are not transfer inputs. The first staging intake proved
blueprint-aware loading and Nx application behavior but collapsed the complete
product graph beneath one `type:package` owner. Standing review rejected that
placement before landing. The source remains migration evidence until it is
recut through canonical resource, provider, service, plugin, and app projects.

The target transfer must remove the compatibility-only catalog as a separate
production authority. A present v2 registry will contribute current host rules
as compatibility data to the one resolved catalog; its absence must produce the
exact empty input. Civ7 host policy, product roots, generator/taxonomy/doc
paths, and manual consumer wiring remain historical evidence, not generic
source.

The source evidence targets Effect 3.21.3, oRPC 1.14.6, TypeBox 1.3.6, and Bun
1.3.14. The accepted product graph must be implemented directly on this
repository's Effect 4, oRPC 2, and current TypeBox substrate rather than landing
a second vendor realm and migrating it later. Consumer initialization,
policy-pack construction, and release remain separate reviewed boundaries. The
first Template release is the ordinary Oclif and Nx package set transported by
npm. A Bun-native artifact is neither a transfer input nor a release
prerequisite; it remains a later distribution evaluation that may not create a
second Habitat identity.

## Definition Checkpoint

The repository now carries seven root v3 definition records: `package`,
`resource`, `provider`, `service`, `plugin`, `plugin-nx`, and `app`. The source
catalog schema-admits them, but no v3 instance or resolved application exists
and none is accepted into a released policy pack. The byte-stable 33-rule v2
registry remains the sole execution authority.
This is the definition-only checkpoint recorded in
[[openspec/changes/complete-agent-plugin-lifecycle-public-interface/README#Habitat Blueprint Definition Checkpoint|the active execution record]] and
[[.habitat/AUTHORITY-ONTOLOGY#Current Realization|the authority ontology]].

## Kind Rows

| Kind | Current state | Required disposition |
| --- | --- | --- |
| Habitat product graph | Seven schema-admitted v3 definitions with no instances or applications; Civ7 `@habitat/cli@0.1.0` remains transfer evidence | Realize support, resources/providers, service, Oclif/Nx projections, and app as distinct Nx projects; then publish one assembled `@habitat/cli@0.2.0` release identity |
| Blueprint policy pack | 33 live v2 rules plus seven inert root v3 definitions; no admitted pack | Construct the data-only `@habitat/blueprints` seam only from definitions that pass their acceptance gates; do not copy current host packets into it |
| `package@1` | Schema-admitted definition; only `contract` and `semantics` proof axes are frozen | Keep outside release-pack acceptance until exact selected-member equality is proven; do not promise it in the first pack |
| Resource | Schema-admitted, execution-inert root definition plus draft boundary packet; proof axes remain candidates | Correct provider-family closure, proof, anchors, and generator before release-pack acceptance |
| Provider | Schema-admitted, execution-inert root definition plus draft boundary packet; proof axes remain candidates | Correct nested realization closure, proof, anchors, and generator before release-pack acceptance |
| Service | Schema-admitted, execution-inert root definition, enforced v2 partial law, and six staged candidate construction laws | Complete source migration and corpus burn-down before release-pack acceptance; keep public-consumer sealing staged until workspace-wide acquisition exists |
| Plugin | Schema-admitted, execution-inert root definition; no frozen proof axes | Close a finite projection proof grammar before release-pack acceptance |
| Nx plugin | Schema-admitted, execution-inert `plugin-nx` definition; no frozen proof axes | Treat it as a complete independent leaf kind until Habitat admits a monotonic specialization relation; close a finite Nx-projection proof grammar before release-pack acceptance |
| Server API projection | Shallow current packet | Compose service-source law and close public faces and proof |
| App | Schema-admitted, execution-inert root definition; proof axes remain candidates | Port and validate the accepted Magic app evidence before release-pack acceptance and instance admission |
| CLI app | Legacy Oclif app law owns commands | Define a complete commandless app kind; do not depend on a specialization relation Habitat does not yet provide |
| CLI topic | Legacy command-plugin root | Rename and rebuild at `plugins/cli/topics/*` |

## Current Structural Red

- `.habitat/blueprints/oclif-command-plugin` positively encodes
  `plugins/cli/commands/*`.
- `.habitat/blueprints/oclif-app` admits app-owned `src/commands`.
- `apps/cli` owns command implementations.
- existing first-party command plugins live below `plugins/cli/commands/*`.
- the seven root v3 definitions have no admitted instances or applications and
  therefore execute nothing;
- `package@1` cannot yet prove exact equality between its selected
  contract/semantics ids and the proof members present on disk;
- manifests can declare `project` and `source` independently even where the
  service, app, and plugin definitions require exactly
  `source = project/src`; the relation is not yet derived or bounded;
- resource and provider packets do not yet close all member, proof, anchor, and
  generator relationships, including direct resource-package public faces.
- service construction packets remain staged while current source burns down.
- public-consumer sealing remains outside service-local v3 application until
  the resolver can acquire foreign consumers across the workspace;
- current local rule packets carry host baselines and RAWR HQ-Template paths
  and therefore cannot be republished as the generic policy pack.

Exact file, instance, and proof-member rows are added to this corpus before
each owning container enters implementation. Grouping may reduce execution
cost; it must not hide a row or allow an unclassified file to cross kinds.

## Proof Rows

Only the `package@1` proof-axis grammar is frozen. This freezes the
`contract`/`semantics` mapping, not `package@1` admission. The remaining rows
are candidate axes that each owning kind must make disjoint and version before
admission.

| Kind/version | Status | Proof axes |
| --- | --- | --- |
| `package@1` | Frozen grammar; not release-pack accepted | `contract`; `semantics` |
| Resource | Candidate | Contract |
| Provider | Candidate | Semantics; execution; optional collaboration |
| Service | Candidate | Contract; operation-mirrored semantics; root execution |
| Plugin | Candidate; no finite set selected | Unselected |
| Nx plugin | Candidate; no finite set selected | Unselected |
| Server API projection | Candidate | Contract; projection; optional API-owned execution |
| App | Candidate | Assembly; optional delivery |
| CLI topic | Candidate | Command projection |
| CLI app | Candidate | Assembly |

For `package@1`, the manifest selects contract and semantics component ids.
Each contract id maps to exactly
`test/contract/<id>.typecheck.ts`; each semantics id maps to exactly
`test/semantics/<id>.test.ts`. An absent axis has no directory. When both
selected lists are empty, the package has no `test/` root. Admission
additionally requires exact equality in both directions: every selected id has
its one mapped file, and every present proof member is selected. Until the
evaluator proves that equality, the root definition remains inert and
`package@1` is not an admitted first-pack promise.

Every later kind version must freeze an equally finite mapping before
admission. Every proof file belongs to exactly one selected axis. Optional
means blueprint-defined and manifest-selected, never an instance-invented
directory. No open, `support`, `helpers`, `runtime`, `fixtures`, `other`, or
case-by-case cabinet is admitted.

Proof stops at its owner. Resource tests do not repeat provider behavior.
Provider tests do not repeat resource-contract, SDK, compiler, or framework
guarantees. Projection and app tests do not duplicate runtime, adapter, or
harness proof.

The first policy pack therefore has no precommitted admitted set. It may include
`package@1` only after exact selected-member closure. No definition may activate
until every blueprint-declared root relation it assumes is derived or
positively bounded, including `source = project/src` for service, app, and
plugin. The pack may include the six service-construction laws only after
source migration and a green complete corpus. Public-consumer sealing
additionally waits for the workspace-wide foreign-consumer acquisition
recorded in
[[openspec/changes/complete-agent-plugin-lifecycle-public-interface/HABITAT_BLUEPRINT_VARIANT_CAPABILITY_HANDOFF|the Habitat capability handoff]].
