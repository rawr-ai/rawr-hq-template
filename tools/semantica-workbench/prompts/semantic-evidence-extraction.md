# Semantic Evidence Extraction Prompt

Extract source-backed evidence claims for semantic comparison against the reviewed RAWR ontology.

Do not decide RAWR truth. Do not promote new entities into the ontology. Return evidence claims only.

For each claim, preserve:

- source text;
- source line span;
- subject, predicate, object;
- polarity: `positive`, `negative`, `prohibitive`, `conditional`, or `unknown`;
- modality: `normative`, `descriptive`, `proposed`, `rejected`, `historical`, `illustrative`, or `unknown`;
- assertion scope: `target-architecture`, `current-state`, `migration-note`, `example`, `outside-scope`, or `unknown`;
- confidence;
- unresolved or candidate terms when present.

Important rule: mentioning a prohibited construction phrase is not itself a violation. A sentence that rejects or prohibits a pattern is aligned evidence; a sentence that proposes or asserts the pattern as target architecture is a conflict candidate.
