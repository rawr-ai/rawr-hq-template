---
level: error
tags: [grit, documentation, semantic-intent]
---
# Require Grit Helper Comments

Every named Grit `predicate`, `function`, and `pattern` declaration in the
canonical first `grit` fence carries a concise semantic comment immediately
above it. The comment records the policy relation or decision that the helper
encodes rather than narrating its syntax. The rule proves placement and
non-empty content; review owns the comment's usefulness.

```grit
language markdown(block)

document() as $document where {
  $filename <: r"(?:^|.*/)pattern\.md$",
  $document <: contains fenced_code_block() as $grit_fence where {
    $grit_fence <: contains info_string() as $info where {
      $info <: "grit"
    }
  } limit 1,
  $grit_fence <: r"(?ms).*^[ \t]*(?:(?:[^/ \t\r\n][^\r\n]*|/(?:[^/\r\n][^\r\n]*)?|//[ \t]*))?\r?\n[ \t]*(?:(?:private[ \t]+)?pattern|predicate|function)[ \t]+[\^#A-Za-z_][A-Za-z0-9_]*[ \t]*\(.*"
}
```

## Matches an undocumented predicate

````markdown
<!-- @filename: .habitat/blueprints/example/require_example/pattern.md -->
```grit
language js

predicate is_example() {
  true
}
```
````

## Matches an undocumented function

````markdown
<!-- @filename: .habitat/blueprints/example/require_example/pattern.md -->
```grit
language js

function example_status() js {
  return "ok";
}
```
````

## Matches an undocumented named pattern

````markdown
<!-- @filename: .habitat/blueprints/example/require_example/pattern.md -->
```grit
language js

pattern example() {
  `example`
}
```
````

## Matches an undocumented private pattern

````markdown
<!-- @filename: .habitat/blueprints/example/require_example/pattern.md -->
```grit
language js

private pattern example() {
  `example`
}
```
````

## Matches a blank helper comment

````markdown
<!-- @filename: .habitat/blueprints/example/require_example/pattern.md -->
```grit
language js

//
predicate is_example() {
  true
}
```
````

## Ignores documented helper kinds

````markdown
<!-- @filename: .habitat/blueprints/example/require_example/pattern.md -->
```grit
language js

// Restricts the example law to the example source boundary.
predicate is_example() {
  true
}

// Computes the status consumed by the example policy.
function example_status() js {
  return "ok";
}

// Names the public example relation exposed by this packet.
pattern example() {
  `example`
}

// Encapsulates the private relation used only by this packet.
private pattern private_example() {
  `example`
}
```
````

## Matches a later undocumented helper in the first Grit fence

````markdown
<!-- @filename: .habitat/blueprints/example/require_example/pattern.md -->
```grit
language js

// Documents the first helper.
predicate is_example() {
  true
}

predicate is_other_example() {
  true
}
```
````

## Ignores later Grit fences

````markdown
<!-- @filename: .habitat/blueprints/example/require_example/pattern.md -->
```grit
language js

// Documents the canonical helper body.
predicate is_example() {
  true
}
```

```grit
language js

predicate fixture_only() {
  true
}
```
````

## Ignores files outside pattern packets

````markdown
<!-- @filename: docs/example.md -->
```grit
language js

predicate is_example() {
  true
}
```
````
