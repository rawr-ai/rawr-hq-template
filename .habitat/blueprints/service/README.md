# Service

`service` is the reusable contract-first oRPC kind shared by standalone
services and API-plugin service interiors.

Five source packets own generic boundary exports, a small set of first-hop
native composition facts, context boundaries, the canonical module import
surface, and declarative input/output schemas. Public error declarations stay
in module contracts while TypeScript and behavior tests own their schema and
runtime mapping. Root contract/router completeness is left to TypeScript rather
than a finite Grit object-shape catalog. Each packet states its own syntax
ceiling; none simulates inferred types or runtime behavior.

Empty baselines keep current product disagreements visible. Habitat structure
owns topology, Grit owns the declared source relations, and behavior tests
remain with the behavior they prove.
