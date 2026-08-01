import { chmod, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { describe, expect, test } from "vitest";

import type { InquiryCheckpointEvidence } from "../../checkpoint";
import type { InquiryDefinition } from "../../definition";
import type { JsonObject } from "../../fluree-client";
import type { GitRunner } from "../../git";
import {
  assertNativeModelControls,
  type IntakeModelOptions,
  installModelControls,
  intakeModel,
  integratedModelDocument,
  prepareModel,
  verifyModelSource,
} from "../../model";
import {
  configGraphIri,
  contextFor,
  evidenceHash,
  inquiryIri,
  namespacesFor,
  semanticGraphIri,
} from "../../namespaces";
import { BLOB_SHA, definitionFixture, SHA } from "./fixture";

const sourceContent = "# Source Section\nfirst line\nsecond line\n";

function frameEvidence(
  definition: InquiryDefinition,
  suffix: string
): Pick<
  InquiryCheckpointEvidence,
  "evidenceVersion" | "frameAttestation" | "frameGeneration" | "frameObservation"
> {
  return {
    evidenceVersion: "checkpoint-evidence-v2",
    frameAttestation: inquiryIri(definition, "frame:lineage-attestation", `frame-${suffix}`),
    frameGeneration: inquiryIri(definition, "frame:generation", `generation-${suffix}`),
    frameObservation: inquiryIri(definition, "frame:observation", `observation-${suffix}`),
  };
}

function frameBoundaryResponse(
  definition: InquiryDefinition,
  evidence: InquiryCheckpointEvidence,
  body: JsonObject
): unknown | undefined {
  const where = JSON.stringify(body.where);
  if (
    body.from === `${definition.ledger}#txn-meta` &&
    (where.includes("frame-generation-intake") || where.includes("frame-observation-intake"))
  ) {
    return [["fluree:commit:frame-intake", "1"]];
  }
  if (
    Array.isArray(body.select) &&
    body.select.length > 0 &&
    body.select.every(
      (selection) =>
        selection !== null && typeof selection === "object" && !Array.isArray(selection)
    )
  ) {
    const frame = namespacesFor(definition).frame;
    const subjects = body.select.map((selection) => Object.keys(selection as JsonObject)[0]);
    const expansions = subjects.map((subject) => {
      if (subject === evidence.frameGeneration) {
        const reconstructionVersion = "frame-reconstruction-v1";
        return {
          "@id": subject,
          "@type": `${frame}Generation`,
          [`${frame}member`]: { "@id": evidence.frameAttestation },
          [`${frame}memberCount`]: 1,
          [`${frame}membershipDigest`]: evidenceHash(
            `${reconstructionVersion}\nframe:LineageAttestation ${evidence.frameAttestation}\n`
          ),
          [`${frame}reconstructionVersion`]: reconstructionVersion,
        };
      }
      if (subject === evidence.frameObservation) {
        return { "@id": subject, "@type": `${frame}Observation` };
      }
      return { "@id": subject, "@type": `${frame}LineageAttestation` };
    });
    return expansions.length === 1 ? expansions : [expansions];
  }
  return undefined;
}

function sourceGit(): GitRunner {
  return {
    root: "/repo",
    text(args) {
      if (args[0] === "cat-file" && args[1] === "-e") return "";
      if (args[0] === "rev-parse") return `${BLOB_SHA}\n`;
      if (args[0] === "cat-file" && args[1] === "-t") return "blob\n";
      if (args[0] === "show") return sourceContent;
      throw new Error(`Unexpected Git command: ${args.join(" ")}`);
    },
    bytes() {
      throw new Error("Model source verification reads text only");
    },
  };
}

function sourceAnchor(locatorPath = "docs/source.md"): JsonObject {
  return {
    "@id": "https://example.test/inquiry/id/source/example",
    "@type": "model:SourceAnchor",
    "model:repository": "Example/Repository",
    "model:gitSha": SHA,
    "model:path": locatorPath,
    "model:locator": `Example/Repository@${SHA}:${locatorPath}#L1-L2`,
    "model:sourceRevision": {
      "@id": inquiryIri(definitionFixture, "git:commit", SHA),
    },
    "model:lineStart": {
      "@value": 1,
      "@type": "xsd:integer",
    },
    "model:lineEnd": {
      "@value": 2,
      "@type": "xsd:integer",
    },
    "model:section": "Source Section",
  };
}

const materializationPath = "tools/temporal-inquiry/model/materialize-semantics.sparql";
const materializationQuery = `# PRAGMA reasoning: datalog
PREFIX model: <https://example.test/inquiry/model#>
CONSTRUCT {
  ?subject model:semanticLabel ?label .
}
FROM __QUERY_LEDGER__
WHERE {
  ?subject model:name ?label .
}
`;

interface SemanticIntakeEvent {
  readonly kind:
    | "construct"
    | "control"
    | "info"
    | "read-semantic-graph"
    | "seal"
    | "stage"
    | "update-semantic-graph"
    | "wait-for-index";
  readonly metadata?: JsonObject;
  readonly value?: unknown;
}

interface SemanticIntakeHarness {
  readonly definition: InquiryDefinition;
  readonly events: SemanticIntakeEvent[];
  readonly evidence: InquiryCheckpointEvidence;
  readonly options: IntakeModelOptions;
  readonly root: string;
  checkpointCompleted(): boolean;
}

async function semanticIntakeHarness(failConstruct = false): Promise<SemanticIntakeHarness> {
  const root = await mkdtemp(join(tmpdir(), "inquiry-semantic-model-"));
  const executable = resolve(root, "fluree-test");
  const definition: InquiryDefinition = {
    ...definitionFixture,
    model: {
      ...definitionFixture.model,
      materialization: materializationPath,
    },
  };
  const facts: JsonObject = {
    "@context": {
      ...contextFor(definition),
      model: `${definition.namespace}model#`,
    },
    "@graph": [sourceAnchor()],
  };
  const files = new Map<string, string>([
    [definition.repository.definition, `${JSON.stringify({ name: "Example/Repository" })}\n`],
    [definition.model.ontology, "GRAPH <urn:ontology> {}\n"],
    [definition.model.rules, "GRAPH <urn:rules> {}\n"],
    [definition.model.shapes, "@prefix sh: <http://www.w3.org/ns/shacl#> .\n"],
    [definition.model.config, "GRAPH <urn:config> {}\n"],
    [definition.model.facts[0], `${JSON.stringify(facts)}\n`],
    [materializationPath, materializationQuery],
  ]);
  for (const [path, content] of files) {
    await mkdir(dirname(resolve(root, path)), { recursive: true });
    await writeFile(resolve(root, path), content);
  }
  await writeFile(
    executable,
    `#!/bin/sh
if [ "$1" = "--version" ]; then
  echo "fluree ${definition.runtime.version}"
elif [ "\${2##*/}" != "canonical-kernel-markers.jsonld" ] && [ "\${2##*/}" != "integrated-model.jsonld" ]; then
  echo "Conforms: false"
  exit 1
else
  echo "Conforms: true"
fi
`
  );
  await chmod(executable, 0o755);

  const events: SemanticIntakeEvent[] = [];
  const stagedNodes = new Map<string, JsonObject>();
  let ledgerT = 0;
  let semanticPublished = false;
  let completed:
    | {
        readonly checkpointId: string;
        readonly controlRows: readonly (readonly unknown[])[];
        readonly definitionHash: string;
        readonly evidenceHash: string;
        readonly modelHash: string;
        readonly t: number;
      }
    | undefined;
  const semanticNode: JsonObject = {
    "@id": inquiryIri(definition, "model:semantic-node", "reviewed-source"),
    "@type": "model:SemanticFact",
    "model:semanticLabel": "Reviewed source",
  };
  const client: IntakeModelOptions["client"] = {
    ledger: definition.ledger,
    async info() {
      events.push({ kind: "info", value: ledgerT });
      return {
        ledger: definition.ledger,
        commitT: ledgerT,
        indexT: ledgerT,
        commitId: `commit-${String(ledgerT)}`,
        indexId: `commit-${String(ledgerT)}`,
      };
    },
    async query(body) {
      const frameBoundary = frameBoundaryResponse(definition, evidence, body);
      if (frameBoundary !== undefined) return frameBoundary;
      if (body.from === `${definition.ledger}#txn-meta`) {
        return completed === undefined
          ? []
          : [
              [
                `fluree:commit:sha256:checkpoint-${String(completed.t)}`,
                completed.definitionHash,
                completed.evidenceHash,
                completed.modelHash,
                String(completed.t),
                `fluree:commit:sha256:checkpoint-${String(completed.t)}`,
              ],
            ];
      }
      const source = body.from;
      if (
        typeof source === "object" &&
        source !== null &&
        "graph" in source &&
        source.graph === configGraphIri(definition.ledger)
      ) {
        const encoded = JSON.stringify(body.where);
        return encoded.includes("f:graphOverrides") || encoded.includes("f:reasoningModes")
          ? []
          : [["https://example.test/config"]];
      }
      const selected = JSON.stringify(body.select);
      if (
        completed !== undefined &&
        body.from === `${definition.ledger}@t:${String(completed.t)}` &&
        selected.includes("?control")
      ) {
        const compactControl = (control: unknown) =>
          typeof control === "string" ? control.replace(contextFor(definition).id, "id:") : control;
        return selected.includes("?controlHash")
          ? completed.controlRows.map(([control, ...receipt]) => [
              compactControl(control),
              ...receipt,
            ])
          : completed.controlRows.map(([control]) => [compactControl(control)]);
      }
      if (selected.includes("sessionGeneration")) return [];
      if (selected.includes("frameSource")) {
        return [[inquiryIri(definition, "git:commit", SHA)]];
      }
      return [["matched"]];
    },
    async sparql(query, tracked) {
      if (/\bASK\b/u.test(query)) return true;
      expect(tracked).toBe(true);
      const nativeConstruct = /^\s*#\s*PRAGMA\s+reasoning:\s*datalog\s*$/imu.test(query);
      events.push({
        kind: nativeConstruct ? "construct" : "read-semantic-graph",
        value: query,
      });
      if (nativeConstruct && failConstruct) {
        throw new Error("Native Datalog closure failed");
      }
      return {
        result: {
          "@context": contextFor(definition),
          "@graph": nativeConstruct || semanticPublished ? [semanticNode] : [],
        },
        reasoning: { capped: false },
      };
    },
    async updateGraph(update) {
      events.push({ kind: "update-semantic-graph", value: update });
      semanticPublished = true;
      ledgerT += 1;
      return { t: ledgerT };
    },
    async upsertTrig(value) {
      ledgerT += 1;
      events.push({ kind: "control", value });
      return {
        result: { t: ledgerT, commit_id: `control-${String(ledgerT)}` },
        t: ledgerT,
        commit: `control-${String(ledgerT)}`,
      };
    },
    async upsertTurtle(value) {
      ledgerT += 1;
      events.push({ kind: "control", value });
      return {
        result: { t: ledgerT, commit_id: `control-${String(ledgerT)}` },
        t: ledgerT,
        commit: `control-${String(ledgerT)}`,
      };
    },
    async waitForIndex() {
      events.push({ kind: "wait-for-index", value: ledgerT });
      return {
        commitT: ledgerT,
        indexT: ledgerT,
        ledger: definition.ledger,
      };
    },
    async insert(value, options) {
      const isCompletion = options?.metadata?.["meta:inquiryComplete"] === true;
      events.push({
        kind: isCompletion ? "seal" : "stage",
        value,
        metadata: options?.metadata,
      });
      const nodes = (Array.isArray(value) ? value : [value]) as readonly JsonObject[];
      if (!isCompletion) {
        for (const node of nodes) {
          if (typeof node["@id"] === "string") stagedNodes.set(node["@id"], node);
        }
      }
      ledgerT += 1;
      if (isCompletion) {
        const checkpointReference = options?.metadata?.["meta:inquiryCheckpoint"];
        const checkpointId =
          checkpointReference !== null &&
          typeof checkpointReference === "object" &&
          !Array.isArray(checkpointReference)
            ? (checkpointReference as JsonObject)["@id"]
            : undefined;
        const checkpointNode = nodes.find(
          (node) => node["@id"] === checkpointId && node["@type"] === "model:InquiryCheckpoint"
        );
        const controlReferences = checkpointNode?.["model:controlTransaction"];
        if (
          typeof checkpointId !== "string" ||
          typeof options?.metadata?.["meta:definitionHash"] !== "string" ||
          typeof options.metadata["meta:evidenceHash"] !== "string" ||
          typeof options.metadata["meta:modelHash"] !== "string" ||
          !Array.isArray(controlReferences)
        ) {
          throw new Error("Semantic checkpoint fixture received an invalid completion");
        }
        const controlRows = controlReferences.map((reference) => {
          const controlId =
            reference !== null && typeof reference === "object" && !Array.isArray(reference)
              ? (reference as JsonObject)["@id"]
              : undefined;
          const controlNode =
            nodes.find((node) => node["@id"] === controlId) ??
            (typeof controlId === "string" ? stagedNodes.get(controlId) : undefined);
          if (typeof controlId !== "string" || controlNode === undefined) {
            throw new Error("Semantic checkpoint fixture received an invalid control reference");
          }
          return [
            controlId,
            controlNode["model:commit"],
            controlNode["model:controlHash"],
            controlNode["model:format"],
            controlNode["model:path"],
            controlNode["model:t"],
            controlNode["model:transaction"] ?? null,
          ] as const;
        });
        completed = {
          checkpointId,
          controlRows,
          definitionHash: options.metadata["meta:definitionHash"],
          evidenceHash: options.metadata["meta:evidenceHash"],
          modelHash: options.metadata["meta:modelHash"],
          t: ledgerT,
        };
      }
      return { t: ledgerT };
    },
  };
  const evidence: InquiryCheckpointEvidence = {
    observedCommit: SHA,
    historyGeneration: inquiryIri(definition, "git:history-generation", "history-semantic"),
    projectionGenerations: [],
    ...frameEvidence(definition, "semantic"),
  };
  return {
    definition,
    events,
    evidence,
    options: {
      definition,
      root,
      git: sourceGit(),
      flureeExecutable: executable,
      client,
    },
    root,
    checkpointCompleted: () => completed !== undefined,
  };
}

describe("authored model admission", () => {
  test.each([
    ["IRI", "https://ns.flur.ee/db#datalog"],
    ["literal", "datalog"],
  ])("refuses a ledger-wide reasoning mode expressed as an %s", async (kind, mode) => {
    await expect(
      assertNativeModelControls(
        {
          async query(body) {
            const encoded = JSON.stringify(body.where);
            if (encoded.includes("f:graphOverrides")) return [];
            if (encoded.includes("f:reasoningModes")) {
              const patterns = Array.isArray(body.where) ? body.where : [];
              const modePattern = patterns.find(
                (pattern) =>
                  pattern !== null &&
                  typeof pattern === "object" &&
                  !Array.isArray(pattern) &&
                  "f:reasoningModes" in pattern
              ) as JsonObject | undefined;
              const binding = modePattern?.["f:reasoningModes"];
              const admitsTerm =
                binding === "?value" ||
                (kind === "IRI" &&
                  binding !== null &&
                  typeof binding === "object" &&
                  !Array.isArray(binding) &&
                  (binding as JsonObject)["@id"] === "?value");
              return admitsTerm ? [[mode]] : [];
            }
            return [["matched"]];
          },
        },
        definitionFixture
      )
    ).rejects.toThrow(/must not add graph overrides or ledger-wide reasoning modes/u);
  });

  test("verifies exact repository, revision, blob, line, and heading evidence", () => {
    const attestation = verifyModelSource(definitionFixture, sourceAnchor(), {
      repository: "Example/Repository",
      git: sourceGit(),
    });

    expect(attestation).toEqual(
      expect.objectContaining({
        locator: `Example/Repository@${SHA}:docs/source.md#L1-L2`,
        revision: SHA,
        blob: BLOB_SHA,
        lineStart: 1,
        lineEnd: 2,
        section: "Source Section",
      })
    );
    expect(attestation.contentHash).toHaveLength(64);
  });

  test("refuses a locator or revision that is not exact", () => {
    expect(() =>
      verifyModelSource(
        definitionFixture,
        {
          ...sourceAnchor(),
          "model:locator": `Example/Repository@${SHA}:docs/source.md#L2-L2`,
        },
        { repository: "Example/Repository", git: sourceGit() }
      )
    ).toThrow(/must equal/u);
    expect(() =>
      verifyModelSource(
        definitionFixture,
        {
          ...sourceAnchor(),
          "model:sourceRevision": { "@id": "urn:wrong:revision" },
        },
        { repository: "Example/Repository", git: sourceGit() }
      )
    ).toThrow(/Source revision/u);
  });

  test("admits one exact shared JSON-LD context into one native transaction", () => {
    const context = {
      label: "https://example.test/label#",
      model: "https://example.test/model#",
      subject: { "@id": "model:subject", "@type": "@id" },
    };
    const integrated = integratedModelDocument([
      {
        "@context": context,
        "@graph": [{ "@id": "model:one", "model:name": "One" }],
      },
      {
        "@context": context,
        "@graph": [
          {
            "@id": "model:two",
            "label:name": "Two",
          },
        ],
      },
    ]);

    expect(integrated).toEqual({
      "@context": {
        label: "https://example.test/label#",
        model: "https://example.test/model#",
        subject: { "@id": "model:subject", "@type": "@id" },
      },
      "@graph": [
        {
          "@id": "model:one",
          "model:name": "One",
        },
        {
          "@id": "model:two",
          "label:name": "Two",
        },
      ],
    });
  });

  test("refuses context overlays and node-local context changes", () => {
    expect(() =>
      integratedModelDocument([
        {
          "@context": { model: "https://example.test/model#" },
          "@graph": [{ "@id": "model:one" }],
        },
        {
          "@context": { model: "https://other.example/model#" },
          "@graph": [{ "@id": "model:two" }],
        },
      ])
    ).toThrow(/exact shared top-level @context/u);
    expect(() =>
      integratedModelDocument([
        {
          "@context": { model: "https://example.test/model#" },
          "@graph": [
            {
              "@context": { alias: "model:name" },
              "@id": "model:one",
            },
          ],
        },
      ])
    ).toThrow(/must not declare a local @context/u);
  });

  test("writes native controls and facts before the sole complete checkpoint", async () => {
    const root = await mkdtemp(join(tmpdir(), "inquiry-model-"));
    const executable = resolve(root, "fluree-test");
    const secondFactsPath = "tools/temporal-inquiry/model/reviewed-authority.jsonld";
    const definition = {
      ...definitionFixture,
      model: {
        ...definitionFixture.model,
        ontology: "tools/temporal-inquiry/model/ontology/control.trig",
        rules: "tools/temporal-inquiry/model/rules/control.trig",
        facts: [...definitionFixture.model.facts, secondFactsPath],
      },
    };
    const facts: JsonObject = {
      "@context": {
        ...contextFor(definition),
        model: `${definitionFixture.namespace}model#`,
      },
      "@graph": [sourceAnchor()],
    };
    const config = `@prefix f: <https://ns.flur.ee/db#> .
GRAPH <${configGraphIri(definitionFixture.ledger)}> {
  <urn:config> a f:LedgerConfig ;
    f:reasoningDefaults <urn:reasoning> ;
    f:shaclDefaults <urn:shacl> ;
    f:datalogDefaults <urn:datalog> ;
    f:transactDefaults <urn:transact> .
  <urn:reasoning> f:overrideControl f:OverrideAll .
  <urn:shacl> f:shaclEnabled true ;
    f:validationMode f:ValidationReject ;
    f:overrideControl f:OverrideNone .
  <urn:datalog> f:datalogEnabled true ;
    f:rulesSource <urn:rules> ;
    f:allowQueryTimeRules false ;
    f:overrideControl f:OverrideNone .
  <urn:transact> f:uniqueEnabled true ;
    f:overrideControl f:OverrideNone .
}
`;
    const files = new Map<string, string>([
      [
        definitionFixture.repository.definition,
        `${JSON.stringify({ name: "Example/Repository" })}\n`,
      ],
      [definition.model.ontology, "GRAPH <urn:ontology> {}\n"],
      [definition.model.rules, "GRAPH <urn:rules> {}\n"],
      [definition.model.shapes, "@prefix sh: <http://www.w3.org/ns/shacl#> .\n"],
      [definition.model.config, config],
      [definition.model.facts[0], `${JSON.stringify(facts)}\n`],
      [
        secondFactsPath,
        `${JSON.stringify({
          "@context": facts["@context"],
          "@graph": [
            {
              "@id": "https://example.test/authority/reviewed",
              "@type": "https://example.test/authority#Decision",
            },
          ],
        })}\n`,
      ],
    ]);
    try {
      for (const [path, content] of files) {
        await mkdir(dirname(resolve(root, path)), { recursive: true });
        await writeFile(resolve(root, path), content);
      }
      await writeFile(
        executable,
        `#!/bin/sh
if [ "$1" = "--version" ]; then
  echo "fluree ${definitionFixture.runtime.version}"
elif [ "\${2##*/}" != "canonical-kernel-markers.jsonld" ] && [ "\${2##*/}" != "integrated-model.jsonld" ]; then
  echo "Conforms: false"
  exit 1
else
  echo "Conforms: true"
fi
`
      );
      await chmod(executable, 0o755);

      const events: {
        kind: "checkpoint" | "trig" | "turtle";
        metadata?: JsonObject;
        opts?: JsonObject;
        value: unknown;
      }[] = [];
      const sparqlQueries: string[] = [];
      const queryBodies: JsonObject[] = [];
      let completed:
        | {
            readonly checkpointId: string;
            readonly definitionHash: string;
            readonly evidenceHash: string;
            readonly modelHash: string;
            readonly controlRows: readonly (readonly unknown[])[];
            readonly t: number;
          }
        | undefined;
      let ledgerT = 0;
      let indexBarriers = 0;
      const evidence: InquiryCheckpointEvidence = {
        observedCommit: SHA,
        historyGeneration: inquiryIri(definitionFixture, "git:history-generation", "history-123"),
        projectionGenerations: [],
        ...frameEvidence(definitionFixture, "123"),
      };
      const options: IntakeModelOptions = {
        definition,
        root,
        git: sourceGit(),
        flureeExecutable: executable,
        client: {
          ledger: definitionFixture.ledger,
          async query(body) {
            queryBodies.push(body);
            const frameBoundary = frameBoundaryResponse(definitionFixture, evidence, body);
            if (frameBoundary !== undefined) return frameBoundary;
            if (body.from === "example/history:main#txn-meta") {
              return completed === undefined
                ? []
                : [
                    [
                      "fluree:commit:sha256:existing",
                      completed.definitionHash,
                      completed.evidenceHash,
                      completed.modelHash,
                      String(completed.t),
                      "fluree:commit:sha256:existing",
                    ],
                  ];
            }
            const source = body.from;
            if (
              typeof source === "object" &&
              source !== null &&
              "graph" in source &&
              source.graph === `urn:fluree:${definitionFixture.ledger}#config`
            ) {
              const encoded = JSON.stringify(body.where);
              return encoded.includes("f:graphOverrides") || encoded.includes("f:reasoningModes")
                ? []
                : [["https://example.test/config"]];
            }
            const selected = JSON.stringify(body.select);
            if (
              completed !== undefined &&
              body.from === `${definitionFixture.ledger}@t:${completed.t}` &&
              selected.includes("?control")
            ) {
              const compactControl = (control: unknown) =>
                typeof control === "string"
                  ? control.replace(contextFor(definitionFixture).id, "id:")
                  : control;
              return selected.includes("?controlHash")
                ? completed.controlRows.map(([control, ...receipt]) => [
                    compactControl(control),
                    ...receipt,
                  ])
                : completed.controlRows.map(([control]) => [compactControl(control)]);
            }
            if (selected.includes("sessionGeneration")) return [];
            if (selected.includes("frameSource")) {
              return [[inquiryIri(definitionFixture, "git:commit", SHA)]];
            }
            return [["matched"]];
          },
          async info() {
            throw new Error("No-materialization intake must not inspect a semantic ledger head");
          },
          async sparql(query) {
            sparqlQueries.push(query);
            if (/\bASK\b/u.test(query)) return true;
            return query.includes("SELECT ?value") ? [] : [["https://example.test/config"]];
          },
          async updateGraph() {
            throw new Error("No-materialization intake must not update a semantic graph");
          },
          async upsertTrig(value) {
            events.push({ kind: "trig", value });
            ledgerT += 1;
            return {
              result: { t: ledgerT, commit_id: `control-${ledgerT}` },
              t: ledgerT,
              commit: `control-${ledgerT}`,
            };
          },
          async upsertTurtle(value) {
            events.push({ kind: "turtle", value });
            ledgerT += 1;
            return {
              result: { t: ledgerT, commit_id: `control-${ledgerT}` },
              t: ledgerT,
              commit: `control-${ledgerT}`,
            };
          },
          async waitForIndex() {
            indexBarriers += 1;
            return {
              commitT: ledgerT,
              indexT: ledgerT,
              ledger: definitionFixture.ledger,
            };
          },
          async insert(value, options) {
            const checkpointReference = options?.metadata?.["meta:inquiryCheckpoint"];
            const checkpointReferenceId =
              checkpointReference !== null &&
              typeof checkpointReference === "object" &&
              !Array.isArray(checkpointReference)
                ? (checkpointReference as JsonObject)["@id"]
                : undefined;
            if (
              options?.metadata?.["meta:inquiryComplete"] === true &&
              typeof checkpointReferenceId === "string" &&
              typeof options.metadata["meta:definitionHash"] === "string" &&
              typeof options.metadata["meta:evidenceHash"] === "string" &&
              typeof options.metadata["meta:modelHash"] === "string"
            ) {
              if (completed?.checkpointId === checkpointReferenceId) {
                throw new Error("Unique constraint violation: model:checkpointKey");
              }
              const nodes = (Array.isArray(value) ? value : [value]) as readonly JsonObject[];
              const checkpointNode = nodes.find(
                (node) =>
                  node["@id"] === checkpointReferenceId &&
                  node["@type"] === "model:InquiryCheckpoint"
              );
              const controlReferences = checkpointNode?.["model:controlTransaction"];
              if (!Array.isArray(controlReferences)) {
                throw new Error("Checkpoint fixture requires linked model control transactions");
              }
              const controlRows = controlReferences.map((reference) => {
                const controlId =
                  reference !== null && typeof reference === "object" && !Array.isArray(reference)
                    ? reference["@id"]
                    : undefined;
                const controlNode = nodes.find((node) => node["@id"] === controlId);
                if (typeof controlId !== "string" || controlNode === undefined) {
                  throw new Error("Checkpoint fixture has an invalid model control reference");
                }
                return [
                  controlId,
                  controlNode["model:commit"],
                  controlNode["model:controlHash"],
                  controlNode["model:format"],
                  controlNode["model:path"],
                  controlNode["model:t"],
                  controlNode["model:transaction"] ?? null,
                ] as const;
              });
              ledgerT += 1;
              completed = {
                checkpointId: checkpointReferenceId,
                definitionHash: options.metadata["meta:definitionHash"],
                evidenceHash: options.metadata["meta:evidenceHash"],
                modelHash: options.metadata["meta:modelHash"],
                controlRows,
                t: ledgerT,
              };
            }
            events.push({
              kind: "checkpoint",
              value,
              metadata: options?.metadata,
              opts: options?.opts,
            });
            return { t: ledgerT };
          },
        },
      };
      const prepared = await prepareModel(options);
      const receipt = await installModelControls(options, prepared);
      expect(sparqlQueries).toEqual([]);
      await expect(intakeModel(options, evidence, { ...receipt }, prepared)).rejects.toThrow(
        /exact prepared model/u
      );
      await expect(
        intakeModel(
          {
            ...options,
            definition: {
              ...definition,
              namespace: "https://other.example/inquiry/",
            },
          },
          evidence,
          receipt,
          prepared
        )
      ).rejects.toThrow(/does not belong/u);
      const report = await intakeModel(options, evidence, receipt, prepared);
      expect(indexBarriers).toBe(1);

      expect(events.map((event) => event.kind)).toEqual([
        "trig",
        "turtle",
        "trig",
        "trig",
        "checkpoint",
      ]);
      expect(events.at(-1)?.metadata).toEqual(
        expect.objectContaining({
          "meta:inquiryCheckpoint": { "@id": report.checkpointId },
          "meta:inquiryComplete": true,
          "meta:modelHash": report.modelHash,
        })
      );
      expect(events.at(-1)?.opts).toEqual({
        uniqueProperties: [`${definitionFixture.namespace}model#checkpointKey`],
      });
      expect(events.at(-1)?.value).toEqual(
        expect.arrayContaining([
          sourceAnchor(),
          expect.objectContaining({
            "@id": "https://example.test/authority/reviewed",
          }),
          expect.objectContaining({
            "@id": report.checkpointId,
            "@type": "model:InquiryCheckpoint",
            "model:evidenceHash": report.evidenceHash,
            "model:historyGeneration": { "@id": evidence.historyGeneration },
            "model:frameAttestation": { "@id": evidence.frameAttestation },
            "model:complete": true,
          }),
          expect.objectContaining({
            "@type": "model:CheckpointCompletion",
            "model:checkpointKey": { "@id": report.checkpointId },
          }),
        ])
      );
      expect(report.validation).toMatch(/Conforms: true/u);
      expect(report.sources).toHaveLength(1);
      expect(report.controlHashes).toEqual({
        [definition.model.config]: expect.any(String),
        [definition.model.ontology]: expect.any(String),
        [definition.model.rules]: expect.any(String),
        [definition.model.shapes]: expect.any(String),
      });
      expect(report.controlTransactions).toEqual([
        expect.objectContaining({ format: "trig", path: definition.model.ontology, t: 1 }),
        expect.objectContaining({ format: "turtle", path: definition.model.shapes, t: 2 }),
        expect.objectContaining({ format: "trig", path: definition.model.rules, t: 3 }),
        expect.objectContaining({ format: "trig", path: definition.model.config, t: 4 }),
      ]);
      expect(report.checkpoint).toEqual({
        existing: false,
        transaction: "fluree:commit:sha256:existing",
        t: 5,
        address: "fluree:commit:sha256:existing",
      });
      const retryReceipt = await installModelControls(options, prepared);
      expect(retryReceipt.controlTransactions.map(({ t }) => t)).toEqual([6, 7, 8, 9]);
      const eventCount = events.length;
      const retried = await intakeModel(options, evidence, retryReceipt, prepared);
      expect(indexBarriers).toBe(2);
      expect(events).toHaveLength(eventCount);
      expect(retryReceipt.controlTransactions).not.toEqual(report.controlTransactions);
      expect(retried.controlTransactions).toEqual(report.controlTransactions);
      expect(retried.checkpoint).toEqual({
        existing: true,
        transaction: "fluree:commit:sha256:existing",
        t: 5,
        address: "fluree:commit:sha256:existing",
      });

      completed = undefined;
      const concurrentEvidence: InquiryCheckpointEvidence = {
        ...evidence,
        frameAttestation: inquiryIri(
          definitionFixture,
          "frame:lineage-attestation",
          "frame-concurrent"
        ),
      };
      const concurrent = await Promise.all([
        intakeModel(options, concurrentEvidence, retryReceipt, prepared),
        intakeModel(options, concurrentEvidence, retryReceipt, prepared),
      ]);
      expect(concurrent.map((result) => result.checkpoint)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ existing: false, t: 10 }),
          expect.objectContaining({ existing: true, t: 10 }),
        ])
      );
      expect(indexBarriers).toBe(4);
      expect(queryBodies.length).toBeGreaterThan(0);
      expect(queryBodies.every((body) => body.reasoning === "none")).toBe(true);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("materializes native Datalog closure before sealing its linked checkpoint", async () => {
    const harness = await semanticIntakeHarness();
    try {
      const prepared = await prepareModel(harness.options);
      expect(prepared.materialization).toBe(materializationQuery);
      expect(prepared.materializationHash).toMatch(/^[0-9a-f]{64}$/u);
      const controls = await installModelControls(harness.options, prepared);
      const report = await intakeModel(harness.options, harness.evidence, controls, prepared);
      if (report.semantic === undefined) {
        throw new Error("Semantic-configured intake did not return its materialization receipt");
      }

      const stageIndex = harness.events.findIndex((event) => event.kind === "stage");
      const constructIndex = harness.events.findIndex((event) => event.kind === "construct");
      const updateIndex = harness.events.findIndex(
        (event) => event.kind === "update-semantic-graph"
      );
      const sealIndex = harness.events.findIndex((event) => event.kind === "seal");
      expect(harness.events.filter((event) => event.kind === "control")).toHaveLength(4);
      expect(stageIndex).toBeGreaterThan(3);
      expect(
        harness.events
          .slice(stageIndex + 1, constructIndex)
          .some((event) => event.kind === "wait-for-index")
      ).toBe(true);
      expect(constructIndex).toBeGreaterThan(stageIndex);
      expect(updateIndex).toBeGreaterThan(constructIndex);
      expect(sealIndex).toBeGreaterThan(updateIndex);
      expect(harness.events.at(-1)?.kind).toBe("seal");

      const stage = harness.events[stageIndex];
      const stagedNodes = stage?.value as readonly JsonObject[];
      expect(stage?.metadata).toEqual(
        expect.objectContaining({
          "f:message": "Stage reviewed temporal inquiry model",
          "meta:modelHash": report.modelHash,
        })
      );
      expect(stagedNodes).toEqual(
        expect.arrayContaining([
          sourceAnchor(),
          expect.objectContaining({ "@type": "model:ControlTransaction" }),
        ])
      );
      expect(
        stagedNodes.filter((node) => node["@type"] === "model:ControlTransaction")
      ).toHaveLength(4);
      expect(
        stagedNodes.some(
          (node) =>
            node["@type"] === "model:InquiryCheckpoint" ||
            node["@type"] === "model:SemanticMaterialization" ||
            node["@type"] === "model:CheckpointCompletion"
        )
      ).toBe(false);

      const semanticReads = harness.events.filter((event) => event.kind === "read-semantic-graph");
      const nativeConstructs = harness.events.filter((event) => event.kind === "construct");
      expect(semanticReads).toHaveLength(2);
      expect(nativeConstructs).toHaveLength(1);
      expect(nativeConstructs[0]?.value).toEqual(
        expect.stringContaining("FROM <example/history:main>")
      );
      expect(nativeConstructs[0]?.value).toEqual(
        expect.stringMatching(/^\s*#\s*PRAGMA\s+reasoning:\s*datalog\s*$/imu)
      );
      expect(nativeConstructs[0]?.value).not.toEqual(expect.stringContaining("__QUERY_LEDGER__"));

      const graphUpdates = harness.events.filter((event) => event.kind === "update-semantic-graph");
      expect(graphUpdates).toHaveLength(1);
      expect(graphUpdates[0]?.value).toEqual({
        context: contextFor(harness.definition),
        graph: semanticGraphIri(harness.definition),
        insert: [
          {
            "@id": inquiryIri(harness.definition, "model:semantic-node", "reviewed-source"),
            "@type": "model:SemanticFact",
            "model:semanticLabel": "Reviewed source",
          },
        ],
        tracked: true,
      });
      expect(report.semantic).toEqual(
        expect.objectContaining({
          graph: semanticGraphIri(harness.definition),
          modelHash: report.modelHash,
          baseT: 5,
          materializedT: 6,
          nodeCount: 1,
        })
      );

      const seal = harness.events[sealIndex];
      const sealedNodes = seal?.value as readonly JsonObject[];
      const semanticReceipt = sealedNodes.find(
        (node) => node["@type"] === "model:SemanticMaterialization"
      );
      const checkpoint = sealedNodes.find(
        (node) => node["@id"] === report.checkpointId && node["@type"] === "model:InquiryCheckpoint"
      );
      expect(seal?.metadata).toEqual(
        expect.objectContaining({
          "meta:inquiryCheckpoint": { "@id": report.checkpointId },
          "meta:inquiryComplete": true,
        })
      );
      expect(semanticReceipt).toEqual(
        expect.objectContaining({
          "@id": report.semantic.id,
          "@type": "model:SemanticMaterialization",
          "model:semanticGraph": { "@id": semanticGraphIri(harness.definition) },
          "model:materializationQueryHash": report.semantic.queryHash,
          "model:semanticContentHash": report.semantic.contentHash,
          "model:modelHash": report.modelHash,
          "model:baseT": report.semantic.baseT,
          "model:materializedT": report.semantic.materializedT,
          "model:materializedNodeCount": 1,
          "model:complete": true,
        })
      );
      expect(checkpoint).toEqual(
        expect.objectContaining({
          "model:modelFile": expect.arrayContaining(["materialize-semantics.sparql"]),
          "model:semanticMaterialization": { "@id": report.semantic.id },
          "model:complete": true,
        })
      );
      expect(harness.checkpointCompleted()).toBe(true);
    } finally {
      await rm(harness.root, { recursive: true, force: true });
    }
  });

  test("does not complete a checkpoint when native Datalog closure fails", async () => {
    const harness = await semanticIntakeHarness(true);
    try {
      const prepared = await prepareModel(harness.options);
      const controls = await installModelControls(harness.options, prepared);
      await expect(
        intakeModel(harness.options, harness.evidence, controls, prepared)
      ).rejects.toThrow(/Native Datalog closure failed/u);

      expect(harness.events.filter((event) => event.kind === "stage")).toHaveLength(1);
      expect(harness.events.filter((event) => event.kind === "construct")).toHaveLength(1);
      expect(harness.events.filter((event) => event.kind === "update-semantic-graph")).toHaveLength(
        0
      );
      expect(harness.events.filter((event) => event.kind === "seal")).toHaveLength(0);
      expect(harness.events.at(-1)?.kind).toBe("construct");
      expect(harness.checkpointCompleted()).toBe(false);
    } finally {
      await rm(harness.root, { recursive: true, force: true });
    }
  });
});
