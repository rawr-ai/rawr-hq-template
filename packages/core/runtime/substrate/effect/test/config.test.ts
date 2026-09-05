import { afterEach, describe, expect, it } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parse } from "dotenv";

import type { CompiledProcessPlan } from "../../../compiler/src/index";
import { defineRuntimeProvider, defineRuntimeResource } from "../../../definition/src/index";
import { preflightConfig, type RuntimeSourceInput } from "../src/config";

type Source = CompiledProcessPlan["configSources"][number];
const roots: string[] = [];
async function root(): Promise<string> {
  const path = await mkdtemp(join(tmpdir(), "habitat-config-"));
  roots.push(path);
  return path;
}
afterEach(async () => {
  await Promise.all(roots.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

function fixture(sources: readonly Source[], key?: string, decode?: (value: unknown) => unknown) {
  let decodes = 0;
  const schema = {
    kind: "runtime.schema" as const,
    serializable: {},
    decode(value: unknown) {
      decodes++;
      return { success: true as const, value: decode === undefined ? value : decode(value) };
    },
    validate: (value: unknown) => ({ success: true as const, value }),
    toRedactedShape: () => ({ schema: {} }),
  };
  const provider = defineRuntimeProvider({
    id: "provider",
    title: "Provider",
    requires: [],
    provides: defineRuntimeResource({ id: "resource", title: "Resource", purpose: "Config proof" }),
    configSchema: schema,
    build: (): never => {
      throw new Error("Config preflight must not build a provider.");
    },
  });
  const compiledResources: CompiledProcessPlan["compiledResources"] =
    key === undefined
      ? []
      : [
          {
            kind: "compiled.resource-plan",
            selectionId: "selection",
            providerId: "provider",
            resource: { resourceId: "resource", lifetime: "process" },
            requirementIds: [],
            dependencyRequirementIds: [],
            configRef: {
              kind: "runtime.config-ref",
              key,
              sources: sources.map((source) => {
                switch (source.kind) {
                  case "env":
                    return { kind: "runtime.config.env" as const, key, name: source.prefix + key };
                  case "memory":
                    return { kind: "runtime.config.memory" as const, key };
                  case "test":
                    return { kind: "runtime.config.test" as const, key };
                  default:
                    return {
                      kind: `runtime.config.${source.kind}` as const,
                      key,
                      path: source.path,
                      optional: source.optional,
                    };
                }
              }),
            },
          },
        ];
  return {
    get decodes() {
      return decodes;
    },
    run: (input: RuntimeSourceInput) =>
      preflightConfig(
        {
          plan: { configSources: sources, compiledResources, serviceBindings: [] },
          references: {
            getProvider: () => provider,
            getService: () => {
              throw new Error("No service selected.");
            },
          },
        },
        input
      ),
  };
}

describe("runtime source preflight", () => {
  it("uses exact first-hit keys once and passes full raw values to the owning schema", async () => {
    const value = { secret: "private", nested: { n: 3 } };
    const proof = fixture([{ kind: "memory" }, { kind: "test" }], "a.b");
    const result = await proof.run({
      appRoot: await root(),
      memory: { a: { b: "wrong" }, "a.b": value },
      test: { "a.b": "later" },
    });
    expect(result.provider("selection")).toBe(value);
    expect(proof.decodes).toBe(1);
    expect(() => result.provider("missing")).toThrow(TypeError);
  });

  it("continues past absent keys but not a winning decode failure", async () => {
    const directory = await root();
    const proof = fixture([{ kind: "memory" }, { kind: "test" }], "KEY", (value) => {
      if (value === "secret-invalid") throw new Error("secret-invalid");
      return value;
    });
    expect(
      (
        await proof.run({ appRoot: directory, memory: { key: "wrong" }, test: { KEY: "right" } })
      ).provider("selection")
    ).toBe("right");
    let error: unknown;
    try {
      await proof.run({
        appRoot: directory,
        memory: { KEY: "secret-invalid" },
        test: { KEY: "right" },
      });
    } catch (cause) {
      error = cause;
    }
    expect(error).toBeInstanceOf(TypeError);
    expect(String(error)).not.toContain("secret-invalid");
    expect(proof.decodes).toBe(2);
  });

  it("distinguishes present undefined, empty string and inherited keys", async () => {
    const directory = await root();
    const proof = fixture([{ kind: "memory" }, { kind: "test" }], "key");
    expect(
      (
        await proof.run({ appRoot: directory, memory: { key: undefined }, test: { key: "later" } })
      ).provider("selection")
    ).toBeUndefined();
    const env = fixture([{ kind: "env", prefix: "PREFIX_" }, { kind: "test" }], "key");
    expect(
      (
        await env.run({ appRoot: directory, env: { PREFIX_key: "" }, test: { key: "later" } })
      ).provider("selection")
    ).toBe("");
    await expect(
      proof.run({ appRoot: directory, memory: Object.create({ key: "inherited" }), test: {} })
    ).rejects.toThrow(TypeError);
  });

  it("materializes every required source with zero value refs", async () => {
    const directory = await root();
    for (const source of [
      { kind: "memory" },
      { kind: "test" },
      { kind: "file", path: "missing.json", optional: false },
      { kind: "dotenv", path: ".env", optional: false },
    ] as const) {
      await expect(fixture([source]).run({ appRoot: directory })).rejects.toThrow(TypeError);
    }
    await fixture([{ kind: "memory" }, { kind: "test" }]).run({
      appRoot: directory,
      memory: {},
      test: {},
    });
    await fixture([
      { kind: "file", path: "missing.json", optional: true },
      { kind: "dotenv", path: ".env", optional: true },
    ]).run({ appRoot: directory });
  });

  it("skips only absent optional files, never malformed or unreadable present sources", async () => {
    const directory = await root();
    for (const [path, text] of [
      ["config.json", "[]"],
      [".env", "BROKEN"],
      [".env", 'KEY="unterminated'],
      [".env", 'KEY="value" junk'],
    ] as const) {
      await writeFile(join(directory, path), text);
      await expect(
        fixture([{ kind: path === ".env" ? "dotenv" : "file", path, optional: true }]).run({
          appRoot: directory,
        })
      ).rejects.toThrow(TypeError);
    }
    await mkdir(join(directory, "subdirectory"));
    await expect(
      fixture([{ kind: "file", path: "subdirectory", optional: true }]).run({ appRoot: directory })
    ).rejects.toThrow(TypeError);
    await writeFile(
      join(directory, "bad.json"),
      new Uint8Array([123, 34, 120, 34, 58, 34, 255, 34, 125])
    );
    await expect(
      fixture([{ kind: "file", path: "bad.json", optional: true }]).run({ appRoot: directory })
    ).rejects.toThrow(TypeError);
  });

  it("parses JSON literal keys without flattening or coercing values", async () => {
    const directory = await root();
    await writeFile(join(directory, "config.json"), '{"__proto__":{"secret":"full"},"a.b":3}');
    const proof = fixture([{ kind: "file", path: "config.json", optional: false }], "__proto__");
    expect((await proof.run({ appRoot: directory })).provider("selection")).toEqual({
      secret: "full",
    });
  });

  it("preserves familiar dotenv value syntax and prototype-like exact keys", async () => {
    const directory = await root();
    await writeFile(
      join(directory, ".env"),
      '\uFEFF# comment\r\nexport\tA="one\ntwo#three"\r\nB=first\rB=second # last\r__proto__=kept\rDOTTED.key=$A\rEMPTY=\rBACK=`multi\nline`\rESC="a\\r\\nb"\r'
    );
    for (const [key, expected] of Object.entries({
      A: "one\ntwo#three",
      B: "second",
      "DOTTED.key": "$A",
      EMPTY: "",
      BACK: "multi\nline",
      ESC: "a\r\nb",
    })) {
      expect(
        (
          await fixture([{ kind: "dotenv", path: ".env", optional: false }], key).run({
            appRoot: directory,
          })
        ).provider("selection")
      ).toBe(expected);
    }
    expect(
      (
        await fixture([{ kind: "dotenv", path: ".env", optional: false }], "__proto__").run({
          appRoot: directory,
        })
      ).provider("selection")
    ).toBe("kept");
  });

  it("requires an explicit absolute app root", async () => {
    await expect(fixture([]).run({ appRoot: "." })).rejects.toThrow(TypeError);
  });

  it("admits the vendor's trailing backslashes and escaped interior quote tokens", async () => {
    const directory = await root();
    for (const quote of ["'", '"', "`"]) {
      for (const value of ["C:\\temp\\", "C:\\temp\\\\", `inside\\${quote}quote`]) {
        const text = `KEY=${quote}${value}${quote}`;
        await writeFile(join(directory, ".env"), text);
        const result = await fixture(
          [{ kind: "dotenv", path: ".env", optional: false }],
          "KEY"
        ).run({ appRoot: directory });
        expect(result.provider("selection")).toBe(parse(text).KEY);
      }
    }
  });
});
