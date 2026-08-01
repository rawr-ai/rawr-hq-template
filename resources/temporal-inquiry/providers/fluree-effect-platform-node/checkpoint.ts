import type { InquiryDefinition } from "./definition";
import type { FlureeClient, JsonObject } from "./fluree-client";
import { assertFrameGenerationImmutable, assertFrameObservationImmutable } from "./frame";
import { assertGitObjectId } from "./git";
import { contextFor, evidenceHash, inquiryIri, namespacesFor, sparqlIri } from "./namespaces";
import { assertProjectionGenerationImmutable } from "./projection";

export interface InquiryCheckpointEvidence {
  readonly evidenceVersion?: "checkpoint-evidence-v2";
  readonly observedCommit: string;
  readonly historyGeneration: string;
  readonly projectionGenerations: readonly string[];
  readonly sessionGeneration?: string;
  readonly frameAttestation: string;
  readonly frameGeneration?: string;
  readonly frameObservation?: string;
  readonly semanticMaterialization?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function responseRows(response: unknown): readonly unknown[] {
  if (Array.isArray(response)) return response;
  if (isRecord(response) && Array.isArray(response.result)) return response.result;
  return [];
}

function rowValue(row: unknown, name: string, index: number): unknown {
  if (Array.isArray(row)) return row[index];
  if (!isRecord(row)) return undefined;
  return row[name] ?? row[`?${name}`];
}

function expandedInquiryIri(definition: InquiryDefinition, value: unknown): unknown {
  const literal =
    value !== null && typeof value === "object" && !Array.isArray(value)
      ? ((value as Record<string, unknown>)["@value"] ??
        (value as Record<string, unknown>).value ??
        value)
      : value;
  return typeof literal === "string" && literal.startsWith("id:")
    ? `${definition.namespace}id/${literal.slice(3)}`
    : literal;
}

function askResult(response: unknown): boolean {
  if (response === true) return true;
  if (isRecord(response) && "boolean" in response) {
    if (typeof response.boolean !== "boolean") {
      throw new Error("Fluree returned an invalid SPARQL ASK response");
    }
    return response.boolean;
  }
  if (isRecord(response) && response.result === true) return true;
  return responseRows(response).some(
    (row) => row === true || (Array.isArray(row) && row[0] === true)
  );
}

function inquiryIdentity(
  definition: InquiryDefinition,
  value: string,
  kind: string,
  label: string
): string {
  const prefix = inquiryIri(definition, kind, "");
  if (!value.startsWith(prefix) || value.length === prefix.length) {
    throw new Error(`${label} must be an identity from this inquiry`);
  }
  sparqlIri(value, label);
  return value;
}

/** Hash the exact normalized repository definition that governs one inquiry. */
export function inquiryDefinitionHash(definition: InquiryDefinition): string {
  return evidenceHash(JSON.stringify(definition));
}

/** Canonicalize and validate the exact evidence named by an inquiry checkpoint. */
export function normalizeInquiryCheckpointEvidence(
  definition: InquiryDefinition,
  evidence: InquiryCheckpointEvidence
): InquiryCheckpointEvidence {
  const observedCommit = assertGitObjectId(evidence.observedCommit, "checkpoint observed commit");
  const historyGeneration = inquiryIdentity(
    definition,
    evidence.historyGeneration,
    "git:history-generation",
    "Checkpoint history generation"
  );
  const lineageParts = [evidence.frameGeneration, evidence.frameObservation];
  if (
    lineageParts.some((value) => value !== undefined) &&
    lineageParts.some((value) => value === undefined)
  ) {
    throw new Error("Checkpoint frame lineage requires both generation and observation");
  }
  const isLineage = evidence.frameGeneration !== undefined;
  if (
    evidence.evidenceVersion !== undefined &&
    evidence.evidenceVersion !== "checkpoint-evidence-v2"
  ) {
    throw new Error("Checkpoint evidence version is unsupported");
  }
  if (evidence.evidenceVersion === "checkpoint-evidence-v2" && !isLineage) {
    throw new Error("Checkpoint evidence v2 requires frame lineage receipts");
  }
  const frameAttestation = inquiryIdentity(
    definition,
    evidence.frameAttestation,
    isLineage ? "frame:lineage-attestation" : "frame:attestation",
    "Checkpoint frame attestation"
  );
  const frameGeneration =
    evidence.frameGeneration === undefined
      ? undefined
      : inquiryIdentity(
          definition,
          evidence.frameGeneration,
          "frame:generation",
          "Checkpoint frame generation"
        );
  const frameObservation =
    evidence.frameObservation === undefined
      ? undefined
      : inquiryIdentity(
          definition,
          evidence.frameObservation,
          "frame:observation",
          "Checkpoint frame observation"
        );
  const projectionGenerations = [...evidence.projectionGenerations]
    .map((generation) =>
      inquiryIdentity(
        definition,
        generation,
        "model:projection-generation",
        "Checkpoint projection generation"
      )
    )
    .sort();
  if (new Set(projectionGenerations).size !== projectionGenerations.length) {
    throw new Error("Checkpoint projection generations must be unique");
  }
  const sessionGeneration =
    evidence.sessionGeneration === undefined
      ? undefined
      : inquiryIdentity(
          definition,
          evidence.sessionGeneration,
          "session-generation",
          "Checkpoint session generation"
        );
  const semanticMaterialization =
    evidence.semanticMaterialization === undefined
      ? undefined
      : inquiryIdentity(
          definition,
          evidence.semanticMaterialization,
          "model:semantic-materialization",
          "Checkpoint semantic materialization"
        );
  return Object.freeze({
    ...(isLineage ? { evidenceVersion: "checkpoint-evidence-v2" as const } : {}),
    observedCommit,
    historyGeneration,
    projectionGenerations: Object.freeze(projectionGenerations),
    ...(sessionGeneration === undefined ? {} : { sessionGeneration }),
    frameAttestation,
    ...(frameGeneration === undefined ? {} : { frameGeneration }),
    ...(frameObservation === undefined ? {} : { frameObservation }),
    ...(semanticMaterialization === undefined ? {} : { semanticMaterialization }),
  });
}

/** Compute the canonical content hash for one complete inquiry checkpoint. */
export function inquiryCheckpointEvidenceHash(
  definition: InquiryDefinition,
  modelHash: string,
  evidence: InquiryCheckpointEvidence
): string {
  return evidenceHash(
    JSON.stringify({
      definitionHash: inquiryDefinitionHash(definition),
      evidence: normalizeInquiryCheckpointEvidence(definition, evidence),
      modelHash,
    })
  );
}

/** Compute the only valid checkpoint IRI for one complete evidence bundle. */
export function inquiryCheckpointIri(
  definition: InquiryDefinition,
  modelHash: string,
  evidence: InquiryCheckpointEvidence
): string {
  return inquiryIri(
    definition,
    "model:inquiry-checkpoint",
    inquiryCheckpointEvidenceHash(definition, modelHash, evidence)
  );
}

async function assertInquiryCheckpointEvidence(
  client: Pick<FlureeClient, "ledger" | "query"> & Partial<Pick<FlureeClient, "sparql">>,
  definition: InquiryDefinition,
  evidence: InquiryCheckpointEvidence,
  from: string,
  verifyProjectionContent: boolean
): Promise<void> {
  // Receipt proof must inspect asserted facts, not trigger or trust derived facts.
  if (client.ledger !== definition.ledger) {
    throw new Error(
      `Fluree client ledger '${client.ledger}' does not match definition '${definition.ledger}'`
    );
  }
  const normalized = normalizeInquiryCheckpointEvidence(definition, evidence);
  const observedCommit = inquiryIri(definition, "git:commit", normalized.observedCommit);
  const frameWhere: JsonObject[] = [
    {
      "@id": normalized.historyGeneration,
      "@type": "git:HistoryGeneration",
      "git:complete": true,
    },
    {
      "@id": observedCommit,
      "@type": "git:Commit",
      "git:sha": normalized.observedCommit,
      "git:observedIn": { "@id": normalized.historyGeneration },
    },
    ...(normalized.frameGeneration === undefined
      ? [
          {
            "@id": normalized.frameAttestation,
            "@type": "frame:Attestation",
            "frame:observedCommit": { "@id": observedCommit },
            "frame:source": { "@id": "?frameSource" },
            ...(normalized.sessionGeneration === undefined
              ? {}
              : {
                  "frame:sessionGeneration": {
                    "@id": normalized.sessionGeneration,
                  },
                }),
          },
        ]
      : [
          {
            "@id": normalized.frameGeneration,
            "@type": "frame:Generation",
            "frame:schemaVersion": "frame-lineage-v1",
            "frame:historyGeneration": { "@id": normalized.historyGeneration },
            "frame:observedCommit": { "@id": observedCommit },
            "frame:currentAttestation": { "@id": normalized.frameAttestation },
            "frame:member": { "@id": normalized.frameAttestation },
            "frame:currentContent": { "@id": "?frameContent" },
            "frame:observedBlob": "?observedBlob",
            "frame:complete": true,
          },
          {
            "@id": normalized.frameObservation,
            "@type": "frame:Observation",
            "frame:schemaVersion": "frame-lineage-v1",
            "frame:generation": { "@id": normalized.frameGeneration },
            "frame:observedCommit": { "@id": observedCommit },
            "frame:observedBlob": "?observedBlob",
            "frame:selectedAttestation": { "@id": normalized.frameAttestation },
            "frame:selectedContent": { "@id": "?frameContent" },
            "frame:complete": true,
            ...(normalized.sessionGeneration === undefined
              ? {}
              : {
                  "frame:sessionGeneration": {
                    "@id": normalized.sessionGeneration,
                  },
                }),
          },
          {
            "@id": normalized.frameAttestation,
            "@type": "frame:LineageAttestation",
            "frame:schemaVersion": "frame-lineage-v1",
            "frame:source": { "@id": "?frameSource" },
            "frame:content": { "@id": "?frameContent" },
          },
        ]),
    {
      "@id": "?frameSource",
      "@type": "git:Commit",
      "git:observedIn": { "@id": normalized.historyGeneration },
    },
  ];
  const frameResponse = await client.query({
    "@context": contextFor(definition),
    from,
    select: ["?frameSource"],
    where: frameWhere,
    limit: 1,
    reasoning: "none",
  });
  if (responseRows(frameResponse).length === 0) {
    throw new Error("Checkpoint requires its exact complete history generation and frame receipts");
  }
  const frameSource = expandedInquiryIri(
    definition,
    rowValue(responseRows(frameResponse)[0], "frameSource", 0)
  );
  if (typeof frameSource !== "string") {
    throw new Error("Checkpoint frame source is not an identity from this inquiry");
  }

  if (normalized.sessionGeneration === undefined) {
    const linkedSession = await client.query({
      "@context": contextFor(definition),
      from,
      select: ["?sessionGeneration"],
      where: {
        "@id": normalized.frameObservation ?? normalized.frameAttestation,
        "frame:sessionGeneration": { "@id": "?sessionGeneration" },
      },
      limit: 1,
      reasoning: "none",
    });
    if (responseRows(linkedSession).length > 0) {
      throw new Error("Checkpoint must include the session generation linked by its frame");
    }
  } else {
    const sessionResponse = await client.query({
      "@context": contextFor(definition),
      from,
      select: ["?session"],
      where: {
        "@id": normalized.sessionGeneration,
        "@type": "session:Generation",
        "session:session": { "@id": "?session" },
        "session:complete": true,
        "session:observedCommit": { "@id": observedCommit },
      },
      limit: 1,
      reasoning: "none",
    });
    if (responseRows(sessionResponse).length === 0) {
      throw new Error(
        "Checkpoint session generation must be complete at the exact observed commit"
      );
    }
  }

  if (normalized.frameGeneration !== undefined) {
    if (client.sparql === undefined) {
      throw new Error("Checkpoint frame lineage proof requires SPARQL ancestry support");
    }
    const ancestry = await client.sparql(
      `# PRAGMA reasoning: none\nASK FROM ${sparqlIri(
        from,
        "checkpoint evidence ledger"
      )} WHERE { ${sparqlIri(
        observedCommit,
        "checkpoint observed commit"
      )} ${sparqlIri(`${namespacesFor(definition).git}parent`, "Git parent property")}* ${sparqlIri(
        frameSource,
        "frame source commit"
      )} . }`
    );
    if (!askResult(ancestry)) {
      throw new Error("Checkpoint frame attestation is not an ancestor of its observation commit");
    }
    if (verifyProjectionContent) {
      await assertFrameGenerationImmutable({
        client,
        definition,
        generation: normalized.frameGeneration,
        snapshot: from,
      });
      await assertFrameObservationImmutable({
        client,
        definition,
        observation: normalized.frameObservation as string,
        snapshot: from,
      });
    }
  }

  for (const generation of normalized.projectionGenerations) {
    const projectionResponse = await client.query({
      "@context": contextFor(definition),
      from,
      select: ["?generation"],
      where: {
        "@id": generation,
        "@type": "model:ProjectionGeneration",
        "model:complete": true,
        "model:historyGeneration": { "@id": normalized.historyGeneration },
        "model:observedCommit": { "@id": observedCommit },
      },
      limit: 1,
      reasoning: "none",
    });
    if (responseRows(projectionResponse).length === 0) {
      throw new Error(
        `Checkpoint projection generation '${generation}' is not complete at the exact observed commit`
      );
    }
    if (verifyProjectionContent) {
      await assertProjectionGenerationImmutable({
        client,
        definition,
        generation,
        snapshot: from,
      });
    }
  }
  if (normalized.semanticMaterialization !== undefined) {
    const semanticResponse = await client.query({
      "@context": contextFor(definition),
      from,
      select: ["?materialization"],
      where: {
        "@id": normalized.semanticMaterialization,
        "@type": "model:SemanticMaterialization",
        "model:complete": true,
      },
      limit: 1,
      reasoning: "none",
    });
    if (responseRows(semanticResponse).length === 0) {
      throw new Error(
        `Checkpoint semantic materialization '${normalized.semanticMaterialization}' is not complete`
      );
    }
  }
}

/**
 * Verify every linked generation and every projection boundary at one snapshot.
 *
 * Checkpoint sealing runs this exhaustive proof before and after its final
 * completion transaction. Projection work scales with the admitted corpus and
 * therefore belongs to refresh, never to a warm inquiry.
 */
export function assertInquiryCheckpointEvidenceComplete(
  client: Pick<FlureeClient, "ledger" | "query"> & Partial<Pick<FlureeClient, "sparql">>,
  definition: InquiryDefinition,
  evidence: InquiryCheckpointEvidence,
  from = definition.ledger
): Promise<void> {
  return assertInquiryCheckpointEvidence(client, definition, evidence, from, true);
}

/**
 * Verify the complete, content-addressed receipts linked by a sealed checkpoint.
 *
 * The immutable checkpoint snapshot was exhaustively proved when it was
 * admitted, so a read revalidates its native completion and generation
 * receipts without re-expanding every projection member.
 */
export function assertInquiryCheckpointEvidenceReceiptsComplete(
  client: Pick<FlureeClient, "ledger" | "query"> & Partial<Pick<FlureeClient, "sparql">>,
  definition: InquiryDefinition,
  evidence: InquiryCheckpointEvidence,
  from = definition.ledger
): Promise<void> {
  return assertInquiryCheckpointEvidence(client, definition, evidence, from, false);
}
