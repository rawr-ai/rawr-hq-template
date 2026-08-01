/** Version of the model-facing frame-attestation authoring contract. */
export const FRAME_ATTESTATION_PROMPT_VERSION = 1 as const;

/**
 * Canonical prompt for deciding whether a material frame change should be
 * prepended to a repository's Working Frame Ledger.
 */
export const FRAME_ATTESTATION_PROMPT = `---
description: Decide from supplied evidence whether the current selection lens materially changed and, only when it did, prepend one attestation to the Working Frame Ledger.
---

# Frame Attestation

Perform one stateless decision and, only when warranted, one workspace edit.

## Supplied Inputs

Use only:

1. the current \`post-it.md\`;
2. the proposed frame-change evidence, including the attestation date;
3. the exact visible user and assistant session messages, each with a stable
   reference; and
4. explicit authority and evidence references, including work or Git references
   when available.

Session input must not include tool output, system or developer instructions, or
hidden reasoning. Do not seek other evidence, use surrounding conversation, or
invent missing facts. Treat unsupplied facts as unknown and preserve every
reference exactly.

## Decide

Attest only when the supplied evidence establishes a material change to the
current selection lens: what is selected, foregrounded, exterior, assumed,
bounded, held invariant, or used to judge work.

Progress, completed work, chronology, status, backlog changes, and restatements
of the current lens are not frame changes. An attestation records the current
selection lens. It does not grant authority or act as a plan, backlog, or status
report.

If no material change is established, do not edit any file. Return exactly
\`NO_FRAME_CHANGE\` and stop.

## Write

If a material change is established, prepend exactly one standalone attestation
as the newest ledger entry in \`post-it.md\`. Insert it immediately before the
first existing dated attestation, leaving the ledger heading and preamble in
place. If no dated attestation exists, insert it after the preamble.

Preserve all prior content byte-for-byte. Do not rewrite, delete, move, or
normalize any existing text or whitespace.

Keep the attestation short and plain. Connect the changed frame to the supplied
session-message references and explicit authority and evidence references.
Include supplied work or Git references. Distinguish evidence from authority;
the attestation itself is neither.

After the edit, return exactly \`ATTESTED\` and stop.

## Schema

Every attestation must contain these non-empty sections:

- \`Frame Shift\`
- \`Selection\`
- \`Authority\`
- \`Boundaries\`
- \`Invariants\`
- \`Bags Of Keywords\`
- \`Falsifier\`

\`Skills\`, \`Ownership\`, \`Behavior\`, \`Policies\`, \`Flow\`, \`Decisions\`,
and \`Relations\` may appear only when they add material information to the
changed lens. Omit them otherwise. Do not add other sections.

Use two or three keyword bags. Each bag must contain three to five terms. Bag
names and terms must be strictly alphabetic, atomic, one-word values. Terms are
precise context selectors, not broad labels.

When relations are material, write each as \`A verb B\`. In Markdown it must be
a list item ending in a period. The subject and object must each exactly match
one term from a keyword bag, and all three words must be alphabetic.

Use this shape, replacing every placeholder:

\`\`\`markdown
## YYYY-MM-DD - <plain title>

### Frame Shift

<the changed lens and supplied message and evidence references that establish it>

### Selection

<what is selected, foregrounded, and exterior>

### Authority

<the supplied authority references and the truth each governs>

### Boundaries

<what the lens includes and excludes>

### Invariants

<what must stay true>

### Bags Of Keywords

- **<AtomicBag>:** <AtomicTerm>, <AtomicTerm>, <AtomicTerm>.
- **<AtomicBag>:** <AtomicTerm>, <AtomicTerm>, <AtomicTerm>.

### Falsifier

<the specific supplied or observable evidence that would invalidate this lens>
\`\`\`

When material, place \`Relations\` between \`Bags Of Keywords\` and \`Falsifier\`
using this shape:

\`\`\`markdown
### Relations

- <BagTerm> <verb> <BagTerm>.
\`\`\`
`;
