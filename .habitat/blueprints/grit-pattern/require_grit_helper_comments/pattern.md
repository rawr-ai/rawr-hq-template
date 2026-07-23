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

// Detects a named helper without an adjacent non-empty comment in the canonical Grit body.
function grit_helper_comment_status($body) js {
  const marker = String.fromCharCode(96) + String.fromCharCode(96) + String.fromCharCode(96);
  const documentLines = $body.text.split(/\r?\n/);
  const sourceStart = documentLines.findIndex((line) => line.trim() === marker + "grit");
  if (sourceStart < 0) return "ok";
  const sourceEnd = documentLines.findIndex(
    (line, index) => index > sourceStart && line.trim() === marker
  );
  const lines = documentLines.slice(sourceStart + 1, sourceEnd < 0 ? undefined : sourceEnd);
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
