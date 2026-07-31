# Shared Habitat Substrate Corpus

**Status:** Controlled transfer evidence
**Date:** 2026-07-30

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
identity, releases, consumer integration, and generic blueprint policy.
`@habitat/blueprints` distributes that policy as versioned data. The Habitat
service owns exact resolution, protocol validation, admission, evaluation, and
classification. Qualified plugins own Oclif and Nx projection. The Habitat app
owns provider/profile selection, product composition, and the executable
entrypoint.

The frozen public policy export surface is:

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

The transferred source removes the compatibility-only catalog as a separate
production authority. A present v2 registry contributes current host rules as
compatibility data to the one resolved catalog; its absence produces the exact
empty input. Civ7 host policy, product roots, generator/taxonomy/doc paths, and
manual consumer wiring remain historical evidence, not generic source.

The source evidence targets Effect 3.21.3, oRPC 1.14.6, TypeBox 1.3.6, and Bun
1.3.14. The accepted product graph is implemented directly on this
repository's Effect 4, oRPC 2, and current TypeBox substrate rather than
landing a second vendor realm and migrating it later. Consumer initialization,
policy-pack construction, and release remain separate reviewed boundaries.
The requested Bun 1.4 native asset remains a separate release proof.

## Kind Rows

| Kind | Current state | Required disposition |
| --- | --- | --- |
| Habitat product graph | Composite `packages/habitat-cli` staging source is behavior evidence only; Civ7 `@habitat/cli@0.1.0` remains transfer evidence | Realize support, resources/providers, service, Oclif/Nx projections, and app as distinct Nx projects; then publish one assembled `@habitat/cli@0.2.0` release identity |
| Blueprint policy pack | Repository-local v2 packets only | Publish the data-only `@habitat/blueprints` seam; do not copy current host packets into it |
| `package@1` | No generic packet | Admit first, after CLI 0.2.0, with exact anchors and closed contract/semantics proof members |
| Resource | Draft boundary packet | Correct provider-family closure, proof, anchors, and generator |
| Provider | Draft boundary packet | Correct nested realization closure, proof, anchors, and generator |
| Service | Enforced partial law plus staged construction packets | Correct, burn down, and promote as one public construction model |
| Server API projection | Shallow current packet | Compose service-source law and close public faces and proof |
| App | No generic packet | Port and activate the accepted Magic app law before Habitat app admission |
| CLI app | Legacy Oclif app law owns commands | Rebuild as a commandless specialization of app |
| CLI topic | Legacy command-plugin root | Rename and rebuild at `plugins/cli/topics/*` |

## Current Structural Red

- `.habitat/blueprints/oclif-command-plugin` positively encodes
  `plugins/cli/commands/*`.
- `.habitat/blueprints/oclif-app` admits app-owned `src/commands`.
- `apps/cli` owns command implementations.
- existing first-party command plugins live below `plugins/cli/commands/*`.
- generic `package` and `app` blueprints do not exist.
- resource and provider packets do not yet close all member, proof, anchor, and
  generator relationships, including direct resource-package public faces.
- service construction packets remain staged while current source burns down.
- the composite Habitat staging source is not an admitted project kind and
  must be decomposed before executable first-class blueprint/instance
  admission can land;
- current local rule packets carry host baselines and RAWR HQ-Template paths
  and therefore cannot be republished as the generic policy pack.

Exact file, instance, and proof-member rows are added to this corpus before
each owning container enters implementation. Grouping may reduce execution
cost; it must not hide a row or allow an unclassified file to cross kinds.

## Proof Rows

`package@1` is the only frozen proof grammar. The remaining rows are candidate
axes that each owning kind must make disjoint and version before admission.

| Kind/version | Frozen or candidate axes |
| --- | --- |
| `package@1` | `contract`; `semantics` |
| Resource | Contract |
| Provider | Semantics; execution; optional collaboration |
| Service | Contract; operation-mirrored semantics; root execution |
| Server API projection | Contract; projection; optional API-owned execution |
| App | Assembly; optional delivery |
| CLI topic | Command projection |
| CLI app | Assembly |

For `package@1`, the manifest selects contract and semantics component ids.
Each contract id maps to exactly
`test/contract/<id>.typecheck.ts`; each semantics id maps to exactly
`test/semantics/<id>.test.ts`. An absent axis has no directory. When both
selected lists are empty, the package has no `test/` root.

Every later kind version must freeze an equally finite mapping before
admission. Every proof file belongs to exactly one selected axis. Optional
means blueprint-defined and manifest-selected, never an instance-invented
directory. No open, `support`, `helpers`, `runtime`, `fixtures`, `other`, or
case-by-case cabinet is admitted.

Proof stops at its owner. Resource tests do not repeat provider behavior.
Provider tests do not repeat resource-contract, SDK, compiler, or framework
guarantees. Projection and app tests do not duplicate runtime, adapter, or
harness proof.
