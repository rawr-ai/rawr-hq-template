import { ReadonlyObject, type Static, Type } from "typebox";

import { RuntimeSchema } from "../../schema/src/index";

export const WebRouteModuleRefSchema = ReadonlyObject(
  Type.Object({
    kind: Type.Literal("web.route-module-ref"),
    ownerId: Type.String({
      pattern: "^plugin-owner:sha256:[0-9a-f]{64}$",
    }),
    routeId: Type.String(),
    path: Type.String(),
  }),
  { additionalProperties: false }
);

export type WebRouteModuleRef = Static<typeof WebRouteModuleRefSchema>;

export interface WebRouteModuleTableEntry {
  readonly ref: WebRouteModuleRef;
  readonly load: () => Promise<unknown>;
}

export interface WebRouteModuleTable {
  readonly kind: "web.route-module-table";
  get(ref: WebRouteModuleRef): WebRouteModuleTableEntry["load"];
  entries(): readonly WebRouteModuleTableEntry[];
}

const WebRouteModuleRefRuntimeSchema = RuntimeSchema.fromTypeBox(WebRouteModuleRefSchema);

function assertWebRouteModuleRefOwnData(value: unknown): void {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError("Web route-module references must be plain data objects.");
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError("Web route-module references must be plain data objects.");
  }
  const expected = new Set(["kind", "ownerId", "routeId", "path"]);
  const actual = Reflect.ownKeys(value);
  if (
    actual.length !== expected.size ||
    actual.some((key) => typeof key !== "string" || !expected.has(key))
  ) {
    throw new TypeError("Web route-module references require their exact own fields.");
  }
  for (const key of expected) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor === undefined || !descriptor.enumerable || !("value" in descriptor)) {
      throw new TypeError("Web route-module references require enumerable own data properties.");
    }
  }
}

function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function tuple(ref: WebRouteModuleRef): readonly string[] {
  return [ref.ownerId, ref.routeId, ref.path];
}

function compareTuples(left: readonly string[], right: readonly string[]): number {
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const order = compareStrings(left[index] ?? "", right[index] ?? "");
    if (order !== 0) return order;
  }
  return 0;
}

function key(ref: WebRouteModuleRef): string {
  return JSON.stringify(tuple(ref));
}

function copyRef(ref: WebRouteModuleRef): WebRouteModuleRef {
  return Object.freeze({
    kind: "web.route-module-ref",
    ownerId: ref.ownerId,
    routeId: ref.routeId,
    path: ref.path,
  });
}

export function createWebRouteModuleTable(
  input: readonly WebRouteModuleTableEntry[]
): WebRouteModuleTable {
  const byRef = new Map<string, WebRouteModuleTableEntry["load"]>();
  const entries = input.map((entry) => {
    assertWebRouteModuleRefOwnData(entry.ref);
    const decoded = WebRouteModuleRefRuntimeSchema.decode(entry.ref);
    if (!decoded.success) throw new TypeError("Invalid web route-module reference.");
    if (typeof entry.load !== "function") {
      throw new TypeError("A web route-module entry must preserve one loader.");
    }

    const ref = copyRef(decoded.value);
    const refKey = key(ref);
    if (byRef.has(refKey)) throw new TypeError("Duplicate web route-module reference.");
    byRef.set(refKey, entry.load);
    return Object.freeze({ ref, load: entry.load });
  });
  entries.sort((left, right) => compareTuples(tuple(left.ref), tuple(right.ref)));
  const snapshot = Object.freeze(entries);

  return Object.freeze({
    kind: "web.route-module-table" as const,
    get(ref: WebRouteModuleRef): WebRouteModuleTableEntry["load"] {
      assertWebRouteModuleRefOwnData(ref);
      const decoded = WebRouteModuleRefRuntimeSchema.decode(ref);
      if (!decoded.success) throw new TypeError("Invalid web route-module reference.");
      const load = byRef.get(key(decoded.value));
      if (load === undefined) throw new TypeError("Web route-module reference is absent.");
      return load;
    },
    entries: () => snapshot,
  });
}
