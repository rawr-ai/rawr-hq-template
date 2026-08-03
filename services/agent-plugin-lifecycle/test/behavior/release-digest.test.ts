import type { Static, TSchema } from "typebox";
import { Value } from "typebox/value";
import { describe, expect, expectTypeOf, it } from "vitest";

import {
  type ContentDigest,
  ContentDigestSchema,
  type PayloadDigest,
  PayloadDigestSchema,
  type ReleaseDigest,
  ReleaseDigestSchema,
  type ReleaseInputDigest,
  ReleaseInputDigestSchema,
  type ReleaseSetDigest,
  ReleaseSetDigestSchema,
} from "../../src/service/model/dto/release-digest";
import {
  contentDigest,
  parseContentDigest,
  parsePayloadDigest,
  parseReleaseDigest,
  parseReleaseInputDigest,
  parseReleaseSetDigest,
  payloadDigest,
  releaseDigest,
  releaseInputDigest,
  releaseSetDigest,
} from "../../src/service/model/policy/release-digest";

const digestCases = [
  {
    name: "content",
    schema: ContentDigestSchema,
    parse: parseContentDigest,
    create: contentDigest,
    prefix: "sha256_",
    emptyDigest: "sha256_e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    defaultPath: "digest",
  },
  {
    name: "release input",
    schema: ReleaseInputDigestSchema,
    parse: parseReleaseInputDigest,
    create: releaseInputDigest,
    prefix: "ri1_",
    emptyDigest: "ri1_e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    defaultPath: "releaseInputDigest",
  },
  {
    name: "payload",
    schema: PayloadDigestSchema,
    parse: parsePayloadDigest,
    create: payloadDigest,
    prefix: "pd1_",
    emptyDigest: "pd1_e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    defaultPath: "payloadDigest",
  },
  {
    name: "release",
    schema: ReleaseDigestSchema,
    parse: parseReleaseDigest,
    create: releaseDigest,
    prefix: "rd1_",
    emptyDigest: "rd1_e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    defaultPath: "releaseDigest",
  },
  {
    name: "release set",
    schema: ReleaseSetDigestSchema,
    parse: parseReleaseSetDigest,
    create: releaseSetDigest,
    prefix: "rs1_",
    emptyDigest: "rs1_e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    defaultPath: "releaseSetDigest",
  },
] as const satisfies ReadonlyArray<{
  readonly name: string;
  readonly schema: TSchema;
  readonly parse: (value: unknown, path?: string) => unknown;
  readonly create: (bytes: Uint8Array) => string;
  readonly prefix: string;
  readonly emptyDigest: string;
  readonly defaultPath: string;
}>;

describe("release digest model", () => {
  it("keeps projectable wire strings separate from policy-admitted digest identities", () => {
    expectTypeOf<Static<typeof ContentDigestSchema>>().toEqualTypeOf<string>();
    expectTypeOf<Static<typeof ReleaseInputDigestSchema>>().toEqualTypeOf<string>();
    expectTypeOf<Static<typeof PayloadDigestSchema>>().toEqualTypeOf<string>();
    expectTypeOf<Static<typeof ReleaseDigestSchema>>().toEqualTypeOf<string>();
    expectTypeOf<Static<typeof ReleaseSetDigestSchema>>().toEqualTypeOf<string>();

    expectTypeOf<ContentDigest>().toMatchTypeOf<string>();
    expectTypeOf<ReleaseInputDigest>().toMatchTypeOf<string>();
    expectTypeOf<PayloadDigest>().toMatchTypeOf<string>();
    expectTypeOf<ReleaseDigest>().toMatchTypeOf<string>();
    expectTypeOf<ReleaseSetDigest>().toMatchTypeOf<string>();
  });

  it("admits only the exact lowercase prefix plus 64 hexadecimal digits", () => {
    for (const digestCase of digestCases) {
      const canonical = `${digestCase.prefix}${"a".repeat(64)}`;

      expect(Value.Check(digestCase.schema, canonical), digestCase.name).toBe(true);
      expect(
        Value.Check(digestCase.schema, `${digestCase.prefix}${"a".repeat(63)}`),
        `${digestCase.name}: 63 digits`
      ).toBe(false);
      expect(
        Value.Check(digestCase.schema, `${digestCase.prefix}${"a".repeat(65)}`),
        `${digestCase.name}: 65 digits`
      ).toBe(false);
      expect(
        Value.Check(digestCase.schema, `${digestCase.prefix}${"A".repeat(64)}`),
        `${digestCase.name}: uppercase digits`
      ).toBe(false);
      expect(
        Value.Check(digestCase.schema, `wrong_${"a".repeat(64)}`),
        `${digestCase.name}: wrong domain`
      ).toBe(false);
      expect(Value.Check(digestCase.schema, null), `${digestCase.name}: non-string`).toBe(false);
    }
  });

  it("keeps all five parser domains disjoint", () => {
    for (const [parserIndex, digestCase] of digestCases.entries()) {
      for (const [valueIndex, candidateCase] of digestCases.entries()) {
        const value = `${candidateCase.prefix}${"b".repeat(64)}`;
        const path = `request.${digestCase.name.replaceAll(" ", "-")}`;

        if (parserIndex === valueIndex) {
          expect(digestCase.parse(value, path), `${digestCase.name}: own domain`).toEqual({
            ok: true,
            value,
          });
          continue;
        }

        expect(
          digestCase.parse(value, path),
          `${digestCase.name}: rejects ${candidateCase.name}`
        ).toEqual({
          ok: false,
          issues: [
            {
              code: "INVALID_DIGEST",
              path,
              message: "Digest has the wrong domain or encoding",
            },
          ],
        });
        expect(digestCase.parse(value), `${digestCase.name}: default path`).toEqual({
          ok: false,
          issues: [
            {
              code: "INVALID_DIGEST",
              path: digestCase.defaultPath,
              message: "Digest has the wrong domain or encoding",
            },
          ],
        });
      }
    }
  });

  it("classifies non-string input before digest-domain policy", () => {
    for (const digestCase of digestCases) {
      const path = `request.${digestCase.name.replaceAll(" ", "-")}`;

      expect(digestCase.parse(null, path), `${digestCase.name}: explicit path`).toEqual({
        ok: false,
        issues: [{ code: "EXPECTED_STRING", path, message: "Value must be a string" }],
      });
      expect(digestCase.parse(null), `${digestCase.name}: default path`).toEqual({
        ok: false,
        issues: [
          {
            code: "EXPECTED_STRING",
            path: digestCase.defaultPath,
            message: "Value must be a string",
          },
        ],
      });
    }
  });

  it("binds every constructor to the exact SHA-256 digest of its bytes", () => {
    for (const digestCase of digestCases) {
      expect(digestCase.create(new Uint8Array()), digestCase.name).toBe(digestCase.emptyDigest);
    }
  });
});
