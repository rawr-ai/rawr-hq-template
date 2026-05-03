## Coverage Matrix — query phrase → atomic item mapping

| Query phrase (verbatim) | Mapped atomic item(s) | Scope check | Gap? |
|---|---|---|---|
| "the runtime realization specification" | Entity: RAWR Effect Runtime Realization System Canonical Spec | OK — full file scope | No |
| "this is the primary doc for this task" | scope_condition #1 (runtime realization spec is authoritative on runtime concerns) | OK | No |
| "the overall system architecture canonical specification" | Entity: RAWR Canonical Architecture Spec | OK — full file scope | No |
| "a sibling doc meant to work with it" | Sub-Q3 (boundaries between docs) + Sub-Q4 (integration surface) | OK | No |
| "We've progressed further on the runtime realization system than on the overall canonical architecture" | Run-time context (drives the 'pull-up' direction in Sub-Q5/Sub-Q6 — runtime → architecture, not vice versa) | OK | No |
| "For all runtime concerns, assume the runtime realization specification is authoritative" | scope_condition #1 | OK — explicitly captured | No |
| "should NOT repeat the runtime realization spec's internal details" | scope_condition #1 (no-duplication clause) | OK | No |
| "core integration document that explains how the entire platform works at a system level" | scope_condition #2 (architecture spec role) | OK | No |
| "Identify what changes (if any) we need to make to the canonical overall system architecture specification" | Sub-Q1 (primary objective) → terminal section 4 (Recommended changes) | OK | No |
| "system integration, layers/levels, flows" | Sub-Q4 (integration points) → required_sections 2, 3 | OK | No |
| "how the platform integrates with other subsystems and/or external systems" | Sub-Q4 + Sub-Q8 (companion subsystem documents) | OK | No |
| "integration points: interfaces, boundaries, conditions, rules" | Sub-Q4 explicitly enumerates these as required_format for terminal section 2 | OK — fully captured | No |
| "companion subsystem documents plug in cleanly" | Entity: companion subsystem documents → terminal section 6 (Division-of-responsibility guidance) | OK | No |
| "Do deep, careful research across both docs" | pipeline_tier=full + Sub-Qs 2, 3, 5 | OK — captured by tier choice | No |
| "what needs to be brought over from the runtime realization spec into the canonical architecture spec (without duplicating internal runtime details)" | Sub-Q5 + Sub-Q6 → terminal section 3 (Runtime-driven additions the canonical architecture spec is missing) | OK | No |
| "how the documents are structured" | Sub-Q2 → terminal section 1 (Document scope and structural diff) | OK | No |
| "what each document does vs. does not contain" | Sub-Q2 | OK | No |
| "design contradictions between the two docs that cannot be resolved by the heuristic 'runtime realization spec is authoritative on runtime concerns'" | Sub-Q7 + scope_condition (escalation) → terminal section 5 (Flagged contradictions requiring user resolution) | OK | No |
| "RAWR_Effect_Runtime_Realization_System_Canonical_Spec.md" | Entity (path captured) | OK | No |
| "RAWR_Canonical_Architecture_Spec.md" | Entity (path captured) | OK | No |
| "those source paths point at the main worktree intentionally" | scope_condition (canonical location) | OK | No |
| "width corpus is primarily the two source spec files" | scope_condition + required_format (two gospel-rank source-analysis notes) | OK | No |
| "Produce one source-analysis note per spec by reading each end-to-end (full ToC with line numbers, scope/exclusions/authority claims, integration boundaries, per-section judgements about whether the section duplicates or complements its sibling spec)" | required_format #1 + entities' required_fields | OK — verbatim mirror | No |
| "These two notes are gospel-rank evidence for the rest of the pipeline" | required_format #1 (gospel-rank flagged) | OK | No |
| "Vendor-integration carve-out" | scope_condition + Sub-Q9 (vendor verification, surgical use) | OK | No |
| "Effect, Inngest, oRPC, OCLIF, Elysia, Bun, plus the harness/native-host technologies" | Vendor entities (each enumerated separately) | OK | No |
| "Use the docs MCP server (mcp__docs__resolve-library-id then mcp__docs__query-docs) FIRST … fall back to WebFetch / WebSearch / GitHub" | scope_condition (vendor research order of operations) | OK | No |
| "Save vendor-research findings as their own short notes in the vault, tagged separately from the spec-analysis notes" | required_format (vendor notes tagged distinctly, e.g., kind: vendor-verification) | OK | No |
| "Cite vendor evidence explicitly (URL + library version)" | required_format (citations include URL + version) | OK | No |
| "Use vendor research surgically — only when the alignment between runtime spec and canonical arch spec hinges on a vendor capability, lifecycle, or integration shape that the specs assert but don't fully describe" | scope_condition (vendor research must be load-bearing) | OK | No |
| "Skip generic web breadth/adversarial/academic search" | scope_condition (skip generic web research) | OK | No |
| "A prior alignment final report (from an earlier run that got compromised mid-pipeline) is preserved at research/_comparison/prior_final_report_runtime-canon-arch-align.md for COMPARISON ONLY" | Entity: prior alignment final report (with use=comparison-only) + scope_condition (read once, no cite, no draft, no evidence) | OK — comparison-only treatment captured | No |
| "fresh report must stand independently" | scope_condition (prior report does not seed fresh report) | OK | No |
| "may surface a brief 'Comparison to prior run' appendix" | Optional appendix permitted (not in required_sections — it follows after the 6 terminal sections only if useful) | OK — captured as optional | No |
| terminal section 1 "Document scope and structural diff" | required_section_headings #1 + Sub-Q2 | OK | No |
| terminal section 2 "Integration surface the canonical architecture spec must own" | required_section_headings #2 + Sub-Q4 + Sub-Q5 | OK | No |
| terminal section 3 "Runtime-driven additions the canonical architecture spec is missing" | required_section_headings #3 + Sub-Q5 | OK | No |
| terminal section 4 "Recommended changes to the canonical architecture specification" | required_section_headings #4 + Sub-Q1 + Sub-Q6 | OK | No |
| terminal section 5 "Flagged contradictions requiring user resolution" | required_section_headings #5 + Sub-Q7 | OK | No |
| terminal section 6 "Division-of-responsibility guidance for companion subsystem documents" | required_section_headings #6 + Sub-Q8 | OK | No |

**Audit result:** 0 rows with `Gap? = YES`. Every significant noun phrase, named entity, technical term, and section requirement in the canonical query maps to at least one atomic item in the decomposition. Decomposition is gap-free.
