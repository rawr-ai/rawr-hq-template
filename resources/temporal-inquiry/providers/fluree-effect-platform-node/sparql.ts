export interface SparqlToken {
  readonly kind: "iri" | "placeholder" | "pragma" | "variable" | "word";
  readonly value: string;
}

function normalizedPragma(value: string): string {
  return value
    .trim()
    .replace(/\s+/gu, " ")
    .replace(/\s*:\s*/gu, ": ")
    .toUpperCase();
}

/** Tokenize only the SPARQL controls that Habitat admits at its query boundary. */
export function sparqlTokens(sparql: string): readonly SparqlToken[] {
  const tokens: SparqlToken[] = [];
  let offset = 0;
  while (offset < sparql.length) {
    const character = sparql[offset];
    if (/\s/u.test(character)) {
      offset += 1;
      continue;
    }
    if (character === "#") {
      const lineStart = sparql.lastIndexOf("\n", offset - 1) + 1;
      const lineEnd = sparql.indexOf("\n", offset + 1);
      const commentEnd = lineEnd < 0 ? sparql.length : lineEnd;
      if (/^\s*$/u.test(sparql.slice(lineStart, offset))) {
        const pragma = /^\s*PRAGMA\b(.*)$/iu.exec(sparql.slice(offset + 1, commentEnd));
        if (pragma !== null) {
          tokens.push({ kind: "pragma", value: normalizedPragma(pragma[1] ?? "") });
        }
      }
      offset = lineEnd < 0 ? sparql.length : lineEnd + 1;
      continue;
    }
    if (character === "'" || character === '"') {
      const quote = character;
      const width = sparql.slice(offset, offset + 3) === quote.repeat(3) ? 3 : 1;
      offset += width;
      let terminated = false;
      while (offset < sparql.length) {
        if (sparql[offset] === "\\") {
          offset += 2;
        } else if (sparql.slice(offset, offset + width) === quote.repeat(width)) {
          offset += width;
          terminated = true;
          break;
        } else {
          offset += 1;
        }
      }
      if (!terminated) throw new Error("SPARQL contains an unterminated string");
      continue;
    }
    if (character === "<") {
      let iriEnd = offset + 1;
      while (
        iriEnd < sparql.length &&
        sparql[iriEnd] !== ">" &&
        (sparql[iriEnd].codePointAt(0) ?? 0) > 0x20 &&
        !/[<>{}"|^`\\]/u.test(sparql[iriEnd])
      ) {
        iriEnd += 1;
      }
      if (sparql[iriEnd] === ">") {
        tokens.push({ kind: "iri", value: sparql.slice(offset, iriEnd + 1) });
        offset = iriEnd + 1;
      } else {
        offset += 1;
      }
      continue;
    }
    if (sparql.startsWith("__", offset)) {
      const placeholder = /^__[A-Z0-9_]+__/u.exec(sparql.slice(offset));
      if (placeholder !== null) {
        tokens.push({ kind: "placeholder", value: placeholder[0] });
        offset += placeholder[0].length;
        continue;
      }
    }
    if (character === "?" || character === "$" || character === "@") {
      const start = offset;
      offset += 1;
      while (offset < sparql.length && /[A-Za-z0-9_-]/u.test(sparql[offset])) offset += 1;
      tokens.push({ kind: "variable", value: sparql.slice(start, offset) });
      continue;
    }
    if (/[A-Za-z]/u.test(character)) {
      const start = offset;
      offset += 1;
      while (offset < sparql.length && /[A-Za-z0-9_-]/u.test(sparql[offset])) offset += 1;
      if (sparql[offset] === ":") {
        offset += 1;
        while (offset < sparql.length && /[A-Za-z0-9._~:%-]/u.test(sparql[offset])) offset += 1;
        continue;
      }
      tokens.push({ kind: "word", value: sparql.slice(start, offset).toUpperCase() });
      continue;
    }
    offset += 1;
  }
  return tokens;
}

export function sparqlPragmas(sparql: string): readonly string[] {
  return sparqlTokens(sparql)
    .filter((token) => token.kind === "pragma")
    .map((token) => token.value);
}
