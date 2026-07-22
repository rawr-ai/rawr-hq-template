import { issue, type ControllerIssue } from "./issues";
import { parseControllerDigest, type ControllerDigest } from "./primitives";
import { failure, success, type ControllerResult, type NonEmptyReadonlyArray } from "./result";

declare const controllerSelectionBrand: unique symbol;

export const CONTROLLER_SELECTION_BYTES = 65 as const;

export type ControllerSelection = Readonly<{
  controllerDigest: ControllerDigest;
  [controllerSelectionBrand]: "ControllerSelection";
}>;

export type ControllerSelectionPlan =
  | Readonly<{
      kind: "converged";
      selection: ControllerSelection;
      bytes: Uint8Array;
    }>
  | Readonly<{
      kind: "replace";
      reason: "missing" | "invalid" | "different";
      selection: ControllerSelection;
      bytes: Uint8Array;
      current?: ControllerSelection;
      currentIssues?: NonEmptyReadonlyArray<ControllerIssue>;
    }>;

export function createControllerSelection(
  controllerDigest: unknown
): ControllerResult<ControllerSelection, ControllerIssue> {
  const parsed = parseControllerDigest(controllerDigest, "selection.controllerDigest");
  return parsed.ok
    ? success(Object.freeze({ controllerDigest: parsed.value }) as ControllerSelection)
    : parsed;
}

export function encodeControllerSelection(selection: ControllerSelection): Uint8Array {
  const bytes = new Uint8Array(CONTROLLER_SELECTION_BYTES);
  for (let index = 0; index < selection.controllerDigest.length; index += 1) {
    bytes[index] = selection.controllerDigest.charCodeAt(index);
  }
  bytes[CONTROLLER_SELECTION_BYTES - 1] = 0x0a;
  return bytes;
}

export function decodeControllerSelection(
  bytes: unknown
): ControllerResult<ControllerSelection, ControllerIssue> {
  if (!(bytes instanceof Uint8Array)) {
    return failure([
      issue("EXPECTED_BYTES", "selection", "Controller selection must be a Uint8Array"),
    ]);
  }
  if (bytes.byteLength !== CONTROLLER_SELECTION_BYTES) {
    return failure([
      issue(
        "INVALID_SELECTION_LENGTH",
        "selection",
        "Controller selection must be one digest plus a newline",
        {
          expected: CONTROLLER_SELECTION_BYTES,
          actual: bytes.byteLength,
        }
      ),
    ]);
  }
  if (bytes[CONTROLLER_SELECTION_BYTES - 1] !== 0x0a) {
    return failure([
      issue("INVALID_SELECTION", "selection", "Controller selection must end with one LF byte"),
    ]);
  }
  let digest = "";
  for (let index = 0; index < CONTROLLER_SELECTION_BYTES - 1; index += 1) {
    const value = bytes[index]!;
    const isDigit = value >= 0x30 && value <= 0x39;
    const isLowerHex = value >= 0x61 && value <= 0x66;
    if (!isDigit && !isLowerHex) {
      return failure([
        issue(
          "INVALID_SELECTION",
          "selection.controllerDigest",
          "Selection digest must be lowercase ASCII hexadecimal",
          {
            actual: value,
            offset: index,
          }
        ),
      ]);
    }
    digest += String.fromCharCode(value);
  }
  return createControllerSelection(digest);
}

export function planControllerSelection(
  currentBytes: Uint8Array | null | undefined,
  candidate: ControllerSelection
): ControllerSelectionPlan {
  const bytes = encodeControllerSelection(candidate);
  if (currentBytes === null || currentBytes === undefined) {
    return { kind: "replace", reason: "missing", selection: candidate, bytes };
  }
  const current = decodeControllerSelection(currentBytes);
  if (!current.ok) {
    return {
      kind: "replace",
      reason: "invalid",
      selection: candidate,
      bytes,
      currentIssues: current.issues,
    };
  }
  if (current.value.controllerDigest === candidate.controllerDigest) {
    return { kind: "converged", selection: current.value, bytes };
  }
  return {
    kind: "replace",
    reason: "different",
    selection: candidate,
    bytes,
    current: current.value,
  };
}
