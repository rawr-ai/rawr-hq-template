---
level: error
tags: [grit, documentation, semantic-intent]
---
# Require Grit Helper Comments

Every named Grit `predicate`, `function`, and `pattern` declaration carries a
concise semantic comment immediately above it. The comment records the policy
relation or decision that the helper encodes rather than narrating its syntax.

```grit
language markdown(block)

// Reports whether every named helper in a pattern document preserves semantic intent.
function grit_helper_comment_status($body) js {
  const marker = String.fromCharCode(96) + String.fromCharCode(96) + String.fromCharCode(96);
  const opening = marker + "grit";
  const sourceStart = $body.text.indexOf(opening) + opening.length;
  const sourceEnd = $body.text.indexOf(marker, sourceStart);
  const source = $body.text.slice(sourceStart, sourceEnd);
  const lines = source.split(/\r?\n/);
  const hasUndocumentedHelper = lines.some((line, index) => {
    const declaresHelper = /^[ \t]*(?:(?:private[ \t]+)?pattern|predicate|function)[ \t]+[\^#A-Za-z_][A-Za-z0-9_]*[ \t]*\(/.test(line);
    const precedingLine = lines[index - 1] || "";
    return declaresHelper && !/^[ \t]*\/\/[ \t]*\S/.test(precedingLine);
  });
  return hasUndocumentedHelper ? "missing" : "ok";
}

document() as $document where {
  $filename <: r"(?:^|.*/)pattern\.md$",
  $status = grit_helper_comment_status($document),
  $status <: includes "missing"
}
```
