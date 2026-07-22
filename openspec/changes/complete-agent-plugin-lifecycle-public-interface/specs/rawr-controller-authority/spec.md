## REMOVED Requirements

### Requirement: Atomic official controller closure (B01, I01)
**Reason**: Oclif core-plugin composition and the released CLI package own the
official command set. A private controller manifest is not required.
**Migration**: Declare first-party plugins in the Oclif configuration and build
the released package through Nx.

### Requirement: Stable materialized controller authority (B02, B32, I02, I17)
**Reason**: The selected release store, bundled runtime, and stable selector are
a custom CLI package/version manager outside the product need.
**Migration**: Install one conventional versioned Oclif CLI package through its
ordinary installer or package manager.

### Requirement: Atomic activation and idempotent selection (B32, I01)
**Reason**: A private digest selector is no longer an installed-state owner.
**Migration**: Package-manager installation and executable resolution select the
installed CLI version.

### Requirement: Non-circular complete payload identity (B01, B32)
**Reason**: Per-file hostile-local-tamper attestation exceeds the accidental
checkout-confusion boundary.
**Migration**: Use artifact-level checksums, repository release provenance, and
ordinary package metadata.

### Requirement: Mutation-free universal bootstrap (B01-B03, B32)
**Reason**: Oclif startup must not be replaced by a second bootstrap and plugin
registry reconstruction.
**Migration**: Run the packaged Oclif entrypoint directly.

### Requirement: Complete read-only controller provenance (B01, B32)
**Reason**: Controller provenance exists only for the rejected distribution
format.
**Migration**: Report ordinary CLI package version, executable path, release
provenance, and Oclif directories when diagnostics need them.

### Requirement: Explicit complete command-package classification (B01)
**Reason**: Oclif's core-plugin manifest already classifies official command
packages.
**Migration**: Keep first-party command plugins in the Oclif core-plugin list and
external extensions in native Oclif user state.
