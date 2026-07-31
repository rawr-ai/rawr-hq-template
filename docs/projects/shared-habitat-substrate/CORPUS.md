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

RAWR HQ-Template owns `@habitat/cli` source, package identity, releases,
consumer integration, and generic blueprint policy.
`@rawr/habitat-blueprints` distributes that policy as versioned data.
`@habitat/cli` owns exact resolution, protocol validation, admission,
evaluation, classification, generation, and Nx integration mechanics.

The frozen public policy export surface is:

```text
@rawr/habitat-blueprints/
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

No `@habitat/cli@0.2.0` release exists. Nx application projection and Fluree
lifecycle changes are not transfer inputs. The audited source also does not yet
close blueprint-aware production loading, Nx projection, complete generators,
and one consumer initializer together.
Production still loads the legacy `.habitat/index.json` compatibility catalog;
the blueprint-aware catalog is test-only. The audited source also contains
Civ7 host policy, product roots, generator/taxonomy/doc paths, and manual
consumer wiring. Those paths are explicit exclusions, not generic source.

Its package still targets Effect 3.21.3, oRPC 1.14.6, TypeBox 1.3.6, and Bun
1.3.14. Combined source intake/deproductization, vendor modernization,
consumer initialization, policy-pack construction, and release are separate
reviewed boundaries. Effect 4, oRPC 2, and Template's TypeBox version are an
explicit later vendor migration, not a condition on current ownership or the
first owner-correct package release. The requested Bun 1.4 native asset remains
a separate release proof; Template itself still pins Bun 1.3.14 until that
distinct vendor boundary lands.

## Kind Rows

| Kind | Current state | Required disposition |
| --- | --- | --- |
| CLI pack/admission mechanics | Installed Civ7 release `@habitat/cli@0.1.0` has no first-class pack/admission protocol and remains transfer evidence only | Extract reviewed generic primitives into RAWR HQ-Template, remove Civ7 product policy and manual consumer wiring, then publish Template-owned `@habitat/cli@0.2.0` only after exact resolution, multi-version coexistence, duplicate identity/version refusal, globally unique rule ids, and one idempotent consumer initializer close |
| Blueprint policy pack | RAWR HQ-Template-local v2 packets only | Publish the data-only `@rawr/habitat-blueprints` seam; do not copy current host packets into it |
| `package@1` | No generic packet | Admit first, after CLI 0.2.0, with exact anchors and closed contract/semantics proof members |
| Resource | Draft boundary packet | Correct provider-family closure, proof, anchors, and generator |
| Provider | Draft boundary packet | Correct nested realization closure, proof, anchors, and generator |
| Service | Enforced partial law plus staged construction packets | Correct, burn down, and promote as one public construction model |
| Server API projection | Shallow current packet | Compose service-source law and close public faces and proof |
| App | No generic packet | Design and activate before any specialization |
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
- no executable first-class blueprint/instance manifest admission path exists
  in the installed Habitat release.
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
