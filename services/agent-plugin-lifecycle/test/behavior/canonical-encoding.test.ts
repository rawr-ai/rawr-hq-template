import { describe, expect, it } from "vitest";

import { equalBytes } from "../../src/service/model/policy/byte-equality";
import { decodeBase64, encodeBase64 } from "../../src/service/model/policy/canonical-base64";
import {
  canonicalJsonLine,
  decodeCanonicalJson,
} from "../../src/service/model/policy/canonical-json";

const encoder = new TextEncoder();

describe("canonical encoding model", () => {
  it("serializes JSON bytes with exactly one terminating line feed", () => {
    const encoded = canonicalJsonLine({
      pluginId: "dev",
      paths: ["skills/orpc/SKILL.md"],
    });

    expect(encoded).toEqual(
      encoder.encode('{"pluginId":"dev","paths":["skills/orpc/SKILL.md"]}\n')
    );
    expect(encoded.at(-1)).toBe(0x0a);
    expect(encoded.at(-2)).not.toBe(0x0a);
  });

  it("admits a valid JSON envelope at its exact byte bound", () => {
    const bytes = encoder.encode('{"ok":true}');
    const decoded = decodeCanonicalJson(bytes, "record", bytes.byteLength);

    expect(decoded).toEqual({ ok: true, value: { ok: true } });
  });

  it("rejects non-byte and one-byte-oversized JSON envelopes with exact diagnostics", () => {
    expect(decodeCanonicalJson("{}", "record", 2)).toEqual({
      ok: false,
      issues: [
        {
          code: "EXPECTED_BYTES",
          path: "record",
          message: "Canonical envelope must be a Uint8Array",
        },
      ],
    });

    const bytes = encoder.encode("null");
    expect(decodeCanonicalJson(bytes, "record", bytes.byteLength - 1)).toEqual({
      ok: false,
      issues: [
        {
          code: "ENVELOPE_TOO_LARGE",
          path: "record",
          message: "Canonical envelope exceeds its protocol bound",
          expected: bytes.byteLength - 1,
          actual: bytes.byteLength,
        },
      ],
    });
  });

  it("rejects invalid UTF-8 and invalid JSON at the caller-owned path", () => {
    expect(decodeCanonicalJson(Uint8Array.of(0xc3, 0x28), "record", 2)).toEqual({
      ok: false,
      issues: [
        {
          code: "INVALID_UTF8",
          path: "record",
          message: "Canonical envelope is not valid UTF-8",
        },
      ],
    });
    expect(decodeCanonicalJson(encoder.encode("{"), "record", 1)).toEqual({
      ok: false,
      issues: [
        {
          code: "INVALID_JSON",
          path: "record",
          message: "Canonical envelope is not valid JSON",
        },
      ],
    });
  });

  it("compares complete byte content and length", () => {
    expect(equalBytes(Uint8Array.of(0, 1, 2), Uint8Array.of(0, 1, 2))).toBe(true);
    expect(equalBytes(Uint8Array.of(0, 1, 2), Uint8Array.of(0, 1, 3))).toBe(false);
    expect(equalBytes(Uint8Array.of(0, 1), Uint8Array.of(0, 1, 0))).toBe(false);
  });

  it("roundtrips empty payloads and every base64 tail length", () => {
    const payloads = [
      new Uint8Array(),
      Uint8Array.of(0xff),
      Uint8Array.of(0xff, 0xee),
      Uint8Array.of(0xff, 0xee, 0xdd),
    ];

    expect(payloads.map(encodeBase64)).toEqual(["", "/w==", "/+4=", "/+7d"]);
    for (const payload of payloads) {
      const decoded = decodeBase64(encodeBase64(payload), "payload.bytes");
      expect(decoded).toEqual({ ok: true, value: payload });
    }
  });

  it("rejects invalid base64 types, alphabets, and padding", () => {
    expect(decodeBase64(42, "payload.bytes")).toEqual({
      ok: false,
      issues: [
        {
          code: "EXPECTED_STRING",
          path: "payload.bytes",
          message: "Base64 value must be a string",
        },
      ],
    });

    for (const value of ["Zg*=", "Zg=", "Zg"]) {
      expect(decodeBase64(value, "payload.bytes")).toEqual({
        ok: false,
        issues: [
          {
            code: "INVALID_BASE64",
            path: "payload.bytes",
            message: "Value must use canonical padded base64",
          },
        ],
      });
    }
  });

  it("rejects structurally valid base64 with noncanonical trailing bits", () => {
    expect(decodeBase64("Zh==", "payload.bytes")).toEqual({
      ok: false,
      issues: [
        {
          code: "INVALID_BASE64",
          path: "payload.bytes",
          message: "Value is not the canonical base64 representation",
        },
      ],
    });
  });
});
