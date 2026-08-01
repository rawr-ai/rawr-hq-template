import type { InquiryDefinition } from "../../definition";

export const SHA = "0123456789abcdef0123456789abcdef01234567";
export const PARENT_SHA = "89abcdef0123456789abcdef0123456789abcdef";
export const BLOB_SHA = "1111111111111111111111111111111111111111";

export const definitionFixture: InquiryDefinition = {
  schemaVersion: 1,
  id: "example-inquiry",
  ownerProject: "habitat",
  ledger: "example/history:main",
  namespace: "https://example.test/inquiry/",
  runtime: {
    version: "4.1.4",
    endpoint: "http://127.0.0.1:8091",
    storage: ".fluree/example",
  },
  repository: {
    definition: "tools/temporal-inquiry/repository.json",
    pins: [],
    refPolicy: {
      version: "selected-refs-v1",
      include: ["refs/heads/", "refs/remotes/", "refs/tags/"],
      exclude: ["refs/codex/"],
    },
  },
  model: {
    ontology: "tools/temporal-inquiry/model/ontology.trig",
    rules: "tools/temporal-inquiry/model/rules.trig",
    shapes: "tools/temporal-inquiry/model/shapes.ttl",
    config: "tools/temporal-inquiry/model/config.trig",
    facts: ["tools/temporal-inquiry/model/reviewed-facts.jsonld"],
  },
  adapters: {
    projection: "tools/temporal-inquiry/src/projection/typescript.ts",
    session: "tools/temporal-inquiry/src/session/session.ts",
    queries: "tools/temporal-inquiry/adapters/queries",
  },
  frame: {
    path: "post-it.md",
  },
};
