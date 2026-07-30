# Staged Habitat Laws

This directory holds intentionally unfinished laws that are not yet affirmed
blueprint authority or part of the required repository graph.

A staged law has an empty baseline, a `staged-rule.json` candidate manifest,
and a named burn-down owner. A burn-down branch moves the packet into
`.habitat/blueprints/**`, renames the manifest to `rule.json`, and makes it
enforced before correcting the live corpus. The completed packet lands only
when its corpus is green. Staging is not a compatibility surface, exception
store, alternate evaluator, or required advisory check.

See [[../AUTHORITY|the Habitat authority boundary]] and
[[../README|the active blueprint index]].
