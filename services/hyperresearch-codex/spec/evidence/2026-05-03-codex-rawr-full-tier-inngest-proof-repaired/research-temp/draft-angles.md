# Triple Draft Angle Matrix

| Draft | Angle | Core question | Best use in synthesis |
| --- | --- | --- | --- |
| A | Service/spec architecture | What must RAWR encode as runtime-owned durable workflow contract, and what must remain plugin declaration or operator policy? | Use for the normative spec surface: `/api/inngest`, function registry, stable workflow identity, step boundaries, policy fields, test gates, and production caveats. |
| B | Operations/security/proof boundary | What must be true before RAWR can claim durable production behavior rather than contained lab conformance? | Use for ingress hardening, signing/event keys, local-versus-production separation, Connect caveats, self-hosting caveats, and proof requirements. |
| C | Workflow semantics and validation | How should individual Inngest primitives map to validation rules and workflow examples? | Use for retry/idempotency cases, wait continuation races, batching/control incompatibilities, and concrete acceptance tests. |

Draft A should make the strongest service-architecture argument: RAWR durable plugin workflows should be specified as runtime-owned Inngest functions and durable steps, not as arbitrary plugin async code. The synthesis should preserve this boundary even when it adds operational and example-level detail from the other drafts.
