/** Read a fixed record without invoking accessors or walking unknown payloads. */
export function fields(
  value: unknown,
  names: readonly string[]
): Record<string, unknown> | undefined {
  if (value === null || typeof value !== "object") return undefined;
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return undefined;
  const keys = Reflect.ownKeys(value);
  if (keys.length !== names.length || names.some((name) => !keys.includes(name))) return undefined;
  const result: Record<string, unknown> = {};
  for (const name of names) {
    const descriptor = Object.getOwnPropertyDescriptor(value, name);
    if (descriptor === undefined || !("value" in descriptor)) return undefined;
    Object.defineProperty(result, name, { value: descriptor.value, enumerable: true });
  }
  return result;
}

/** The seed schema and owned projection already establish finite DTO shape. */
export function detached<T>(value: T): T {
  const result = structuredClone(value);
  const seen = new WeakSet<object>();
  function freeze(input: unknown): void {
    if (input === null || typeof input !== "object" || seen.has(input)) return;
    seen.add(input);
    for (const child of Object.values(input)) freeze(child);
    Object.freeze(input);
  }
  freeze(result);
  return result;
}

/** Explicit telemetry accepts JSON-compatible values, not arbitrary runtime objects. */
export function telemetryData<T>(value: T): T {
  const active = new WeakSet<object>();
  function check(input: unknown): void {
    if (input === null || typeof input === "string" || typeof input === "boolean") return;
    if (typeof input === "number" && Number.isFinite(input)) return;
    if (typeof input !== "object" || input === null || active.has(input))
      throw new TypeError("Telemetry requires finite JSON data.");
    const prototype = Object.getPrototypeOf(input);
    if (!Array.isArray(input) && prototype !== Object.prototype && prototype !== null)
      throw new TypeError("Telemetry requires JSON objects.");
    active.add(input);
    for (const key of Reflect.ownKeys(input)) {
      if (Array.isArray(input) && key === "length") continue;
      const descriptor = Object.getOwnPropertyDescriptor(input, key);
      if (typeof key !== "string" || descriptor === undefined || !("value" in descriptor))
        throw new TypeError("Telemetry requires data properties.");
      check(descriptor.value);
    }
    if (Array.isArray(input) && Object.keys(input).length !== input.length)
      throw new TypeError("Telemetry arrays must be dense.");
    active.delete(input);
  }
  check(value);
  return detached(value);
}
