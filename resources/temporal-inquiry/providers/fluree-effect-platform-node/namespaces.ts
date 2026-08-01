import { createHash } from "node:crypto";

import { canonicalLedgerId, type InquiryDefinition } from "./definition";

export interface InquiryNamespaces {
  readonly git: string;
  readonly id: string;
  readonly frame: string;
  readonly session: string;
  readonly model: string;
  readonly meta: string;
  readonly f: "https://ns.flur.ee/db#";
  readonly rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#";
  readonly xsd: "http://www.w3.org/2001/XMLSchema#";
  readonly graphs: {
    readonly ontology: string;
    readonly rules: string;
    readonly shapes: string;
  };
}

/** Derive the neutral vocabulary and named-graph IRIs from one definition. */
export function namespacesFor(definition: InquiryDefinition): InquiryNamespaces {
  const root = definition.namespace;
  return {
    git: `${root}git#`,
    id: `${root}id/`,
    frame: `${root}frame#`,
    session: `${root}session#`,
    model: `${root}model#`,
    meta: `${root}meta#`,
    f: "https://ns.flur.ee/db#",
    rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
    xsd: "http://www.w3.org/2001/XMLSchema#",
    graphs: {
      ontology: `${root}graph/ontology`,
      rules: `${root}graph/rules`,
      shapes: `${root}graph/shapes`,
    },
  };
}

/** Return the fixed named graph whose history stores native semantic closures. */
export function semanticGraphIri(definition: InquiryDefinition): string {
  return `${definition.namespace}graph/semantic`;
}

/** Produce the compact context shared by kernel-authored RDF observations. */
export function contextFor(definition: InquiryDefinition): Readonly<Record<string, string>> {
  const namespaces = namespacesFor(definition);
  return {
    git: namespaces.git,
    id: namespaces.id,
    frame: namespaces.frame,
    session: namespaces.session,
    model: namespaces.model,
    meta: namespaces.meta,
    f: namespaces.f,
    rdf: namespaces.rdf,
    xsd: namespaces.xsd,
  };
}

/** Build a stable instance IRI without assigning product meaning. */
export function inquiryIri(definition: InquiryDefinition, kind: string, identity: string): string {
  const safeKind = kind
    .split(":")
    .map((part) => part.replace(/[^A-Za-z0-9._~-]/gu, "_"))
    .join("/");
  return `${definition.namespace}id/${safeKind}/${encodeURIComponent(identity)}`;
}

/** Hash exact evidence bytes for generation and attestation identities. */
export function evidenceHash(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

/** Express one date-time as an explicitly typed JSON-LD value. */
export function dateTimeLiteral(value: string | number | Date): {
  readonly "@value": string;
  readonly "@type": "xsd:dateTime";
} {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) {
    throw new Error(`Invalid date-time '${String(value)}'`);
  }
  // FlureeDB 4.1.4 stores xsd:dateTime with six fractional digits. Author the
  // same canonical lexical form so immutable post-write RDF comparison does
  // not mistake its native normalization for a changed fact.
  const lexical = date.toISOString().replace(/(\.\d{3})Z$/u, "$1000Z");
  return {
    "@value": lexical,
    "@type": "xsd:dateTime",
  };
}

/** Return Fluree's reserved configuration graph for the canonical ledger ID. */
export function configGraphIri(ledger: string): string {
  return `urn:fluree:${canonicalLedgerId(ledger)}#config`;
}

/** @deprecated Use `configGraphIri`; retained as a descriptive internal alias. */
export const nativeConfigGraphIri = configGraphIri;

/** Return the reserved transaction-metadata graph reference for a ledger. */
export function transactionMetadataSource(ledger: string): string {
  return `${canonicalLedgerId(ledger)}#txn-meta`;
}

/** Validate an IRI before interpolating it into a fixed SPARQL query. */
export function sparqlIri(value: string, name = "IRI"): string {
  const hasControlOrSpace = [...value].some((character) => (character.codePointAt(0) ?? 0) <= 0x20);
  if (
    value.length === 0 ||
    hasControlOrSpace ||
    /[<>{}"|^`\\]/u.test(value) ||
    !/^(?:https?:|urn:|[A-Za-z0-9][A-Za-z0-9._/-]*:)/u.test(value)
  ) {
    throw new Error(`${name} must be an absolute IRI or Fluree ledger identity`);
  }
  return `<${value}>`;
}
