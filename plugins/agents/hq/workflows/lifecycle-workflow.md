---
description: Review a workflow change as source owned and released by its parent agent plugin
argument-hint: "PLUGIN=<id> WORKFLOW=<name>"
---

# Lifecycle: Workflow Source

1. Review the workflow inputs, steps, failure gates, tests, and dependent links.
2. Confirm the workflow exists under exactly one parent
   `plugins/agents/<plugin>` distribution owner.
3. Stop at source verification. Do not edit provider homes or start lifecycle
   mutation automatically.
4. When explicitly requested, verify the parent plugin through
   [[plugins/agents/hq/workflows/lifecycle-agent-plugin]], beginning with
   `rawr agent plugins check`.

The workflow has no independent sync, export, channel, or provider identity.
