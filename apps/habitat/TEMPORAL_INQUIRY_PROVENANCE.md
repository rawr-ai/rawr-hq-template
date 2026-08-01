# Temporal Inquiry Provenance

The generic Fluree Frame Lineage Inquiry kernel was accepted from:

- producer commit: `d68aad29cfc91dfe775391ca838186adfc71fc81`
- producer tree: `f4130c89db0ccee050c20737d0f25054230aba3c`
- portable artifact: `tools/habitat/artifacts/habitat-cli-0.1.0.tgz`
- artifact SHA-256: `52c0557f7784a8b4480004df3c458e779ecb8ba3236b52a6aa631ebd03afe8d0`
- frame parser: `frame-parser-v3`

Template owns the accepted generic resource, Node provider, Nx projection, and
distribution. Consumers retain their ontology, reviewed facts and authority,
projections, SHACL, rules, configuration, and optional query files.

The Nx projection discovers the conventional `habitat-inquiry.json`
automatically. The definition keeps `frame.path` explicit because frame identity
is consumer authority and may be ambiguous; the generator installs only the
projection and never invents product configuration. The inferred `plan`,
`query`, and `refresh` targets match the proven consumer surface and are always
foreground-only and non-cacheable.
