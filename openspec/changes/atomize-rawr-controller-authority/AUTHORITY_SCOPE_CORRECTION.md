# C1 Authority Scope Correction

**Status:** ACCEPTED_SUPERSEDING

This correction narrows C1 back to authority normalization. It supersedes this change record wherever earlier text treats local replacement of an installed controller and its expected hashes as an in-scope attacker.

## In Scope

- stale or deleted worktrees;
- mutable aliases, links, compatibility paths, and source fallbacks;
- ambient cwd, Bun config, env files, and preload injection during ordinary launch;
- broken, missing, or colliding Oclif entries;
- partial activation and concurrent controller selection;
- repeated converged operations that must inspect without writing;
- accidental incomplete, mixed-revision, or escaping controller artifacts.

## Out Of Scope

- an adversary who can rewrite the complete installed controller, selector, and expected hashes;
- PKI, signatures, supply-chain attestation, and recursive verifier-of-verifier machinery;
- making the launcher a separate security product.

## Corrected Mechanism Boundary

The installed controller remains one immutable, digest-qualified release containing the complete official command closure and its runtime dependencies. A stable, bounded launcher reads one atomic selected-digest value, neutralizes ambient Bun startup inputs, and starts that release with its bundled Bun. The launcher does not authenticate the release, implement commands, choose fallbacks, or recursively verify its own verifier. Ordinary release verification detects incomplete/mixed artifacts and activation mistakes; it is not an attacker-resistant trust chain.

The product-bearing work remains controller closure, external-extension guarding and recovery, deletion of official link/relink authority, truthful lifecycle state owners, and idempotent convergence.
