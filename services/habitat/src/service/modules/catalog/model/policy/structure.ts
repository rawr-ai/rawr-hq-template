import type { SourceInventoryResult } from "@habitat-ai/resource-source-inventory";
import picomatch from "picomatch";
import { Validator } from "typebox/schema";
import type { HabitatCatalog } from "../dto/catalog.js";
import type { StructureCheckFinding } from "../dto/check.js";
import {
  STRUCTURE_PICOMATCH_OPTIONS,
  StructureDocumentSchema,
  type StructureScope,
} from "../dto/structure.js";

type RuleApplication = HabitatCatalog["applications"][number];

/** Resolved application executable by the native Habitat structure policy. */
export type HabitatStructureApplication = RuleApplication & {
  readonly runner: Extract<RuleApplication["runner"], { name: "habitat" }>;
};

/** Narrows one resolved application to the native structure runner. */
export function isHabitatStructureApplication(
  application: RuleApplication
): application is HabitatStructureApplication {
  return application.runner.name === "habitat";
}

/** Live or inventory-derived kind understood by native structure evaluation. */
export type StructureRootKind = StructureScope["kind"] | "other";

type BoundStructureScope = Omit<StructureScope, "allowEmpty"> & {
  readonly allowEmpty: boolean;
  readonly bindingPath: string;
};

/** Schema-admitted structure application with inapplicable unbound scopes removed. */
export type AdmittedStructureApplication = {
  readonly application: HabitatStructureApplication;
  readonly scopes: readonly BoundStructureScope[];
};

/** Inventory-derived source universe shared by every application in one invocation. */
export type StructureUniverse = {
  readonly paths: readonly string[];
  readonly trackedNonFilePaths: ReadonlySet<string>;
  readonly directChildren: ReadonlyMap<string, readonly string[]>;
};

type PlannedRoot = {
  readonly path: string;
};

type PlannedScope = {
  readonly scope: BoundStructureScope;
  readonly reportPath: string;
  readonly roots: readonly PlannedRoot[];
};

/** Pure inventory interpretation awaiting live matched-root and direct-child observations. */
export type StructureEvaluationPlan = {
  readonly application: HabitatStructureApplication;
  readonly scopes: readonly PlannedScope[];
  readonly rootObservationPaths: readonly string[];
  readonly universe: StructureUniverse;
};

/** Stable path-only native Habitat diagnostic derived from the public report contract. */
export type StructureDiagnostic = Pick<StructureCheckFinding, "code" | "path" | "message">;

const structureValidator = new Validator({}, StructureDocumentSchema);

/** Admits TypeBox-valid structure authority and resolves its root-role applicability. */
export function admitStructureDocument(
  value: unknown,
  application: HabitatStructureApplication
):
  | { readonly ok: true; readonly admitted: AdmittedStructureApplication }
  | { readonly ok: false; readonly detail: string } {
  if (!structureValidator.Check(value)) {
    const [, errors] = structureValidator.Errors(value);
    return {
      ok: false,
      detail:
        errors
          .slice(0, 20)
          .map((error) => error.message)
          .join("; ") || "Structure document does not satisfy schema version 2.",
    };
  }

  const bindings = new Map(
    application.runner.rootBindings.map(
      (binding): readonly [string, (typeof application.runner.rootBindings)[number]] => [
        binding.rootRole,
        binding,
      ]
    )
  );
  const unknownRole = value.scopes.find((scope) => !bindings.has(scope.rootRole));
  if (unknownRole !== undefined) {
    return {
      ok: false,
      detail: `Structure scope "${unknownRole.name}" names unknown root role "${unknownRole.rootRole}".`,
    };
  }

  const scopes: BoundStructureScope[] = [];
  for (const scope of value.scopes) {
    const binding = bindings.get(scope.rootRole);
    if (binding?.path === undefined) continue;
    if (appendPath(binding.path, scope.relativePath).length > 4_096) {
      return {
        ok: false,
        detail: `Structure scope "${scope.name}" resolves beyond the maximum repository path length.`,
      };
    }
    scopes.push({ ...scope, allowEmpty: scope.allowEmpty ?? false, bindingPath: binding.path });
  }
  return { ok: true, admitted: { application, scopes } };
}

/** Derives ancestors and direct children while pruning tracked non-file descendants. */
export function makeStructureUniverse(inventory: SourceInventoryResult): StructureUniverse {
  const trackedNonFilePaths = new Set(inventory.trackedNonFilePaths);
  const visiblePaths = inventory.paths.filter(
    (candidate) => !ancestors(candidate).some((ancestor) => trackedNonFilePaths.has(ancestor))
  );
  const allPaths = new Set<string>([""]);
  for (const visiblePath of visiblePaths) {
    allPaths.add(visiblePath);
    for (const ancestor of ancestors(visiblePath)) allPaths.add(ancestor);
  }

  const directChildren = new Map<string, string[]>();
  for (const candidate of allPaths) {
    if (candidate === "") continue;
    const parent = parentPath(candidate);
    const children = directChildren.get(parent) ?? [];
    children.push(baseName(candidate));
    directChildren.set(parent, children);
  }
  for (const children of directChildren.values()) children.sort(compareText);

  return {
    paths: [...allPaths].sort(compareText),
    trackedNonFilePaths,
    directChildren,
  };
}

/** Plans inventory-visible root matching without treating retained Git entries as live facts. */
export function planStructureEvaluation(
  admitted: AdmittedStructureApplication,
  universe: StructureUniverse
): StructureEvaluationPlan {
  const rootObservationPaths = new Set<string>();
  const scopes = admitted.scopes.map((scope): PlannedScope => {
    const reportPath = appendPath(scope.bindingPath, scope.relativePath);
    const matches =
      scope.relativePath === "."
        ? (candidate: string) => candidate === ""
        : picomatch(scope.relativePath, STRUCTURE_PICOMATCH_OPTIONS);
    const roots = universe.paths
      .filter((candidate) => {
        const relativePath = relativeToBoundRoot(candidate, scope.bindingPath);
        return relativePath !== undefined && matches(relativePath);
      })
      .map((candidate): PlannedRoot => {
        rootObservationPaths.add(candidate);
        return { path: candidate };
      });
    return { scope, reportPath, roots };
  });
  return {
    application: admitted.application,
    scopes,
    rootObservationPaths: [...rootObservationPaths].sort(compareText),
    universe,
  };
}

/** Selects inventory-admitted direct children only for roots observed as live directories. */
export function structureChildObservationPaths(
  plan: StructureEvaluationPlan,
  observedKinds: ReadonlyMap<string, StructureRootKind | "missing">
): readonly string[] {
  const paths = new Set<string>();
  for (const planned of plan.scopes) {
    if (planned.scope.kind !== "directory") continue;
    for (const root of planned.roots) {
      if (plannedStructureKind(plan, root.path, observedKinds) !== "directory") continue;
      for (const child of plan.universe.directChildren.get(root.path) ?? []) {
        paths.add(appendPath(root.path, child));
      }
    }
  }
  return [...paths].sort(compareText);
}

/** Applies native structure semantics to a prepared source universe and observed root kinds. */
export function evaluateStructurePlan(
  plan: StructureEvaluationPlan,
  observedKinds: ReadonlyMap<string, StructureRootKind | "missing">
): readonly StructureDiagnostic[] {
  const diagnostics: StructureDiagnostic[] = [];
  for (const planned of plan.scopes) {
    const roots = planned.roots.flatMap((root) => {
      const observedKind = plannedStructureKind(plan, root.path, observedKinds);
      return observedKind === "missing" ? [] : [{ path: root.path, kind: observedKind }];
    });
    if (!planned.scope.allowEmpty && roots.length === 0) {
      diagnostics.push({
        code: "root-missing",
        path: displayPath(planned.reportPath),
        message: `Structure scope "${planned.scope.name}" matched no ${planned.scope.kind} roots for ${displayPath(planned.reportPath)}.`,
      });
      continue;
    }

    for (const root of roots) {
      if (root.kind === planned.scope.kind) continue;
      diagnostics.push({
        code: "wrong-root-kind",
        path: displayPath(root.path),
        message: `Structure scope "${planned.scope.name}" expected ${planned.scope.kind} root, but ${displayPath(root.path)} is ${root.kind}.`,
      });
    }

    if (planned.scope.kind !== "directory") continue;
    for (const root of roots) {
      if (root.kind !== "directory") continue;
      const visibleChildren = (plan.universe.directChildren.get(root.path) ?? []).filter(
        (child) => observedStructureKind(appendPath(root.path, child), observedKinds) !== "missing"
      );
      diagnostics.push(...evaluateDirectoryChildren(planned.scope, root.path, visibleChildren));
    }
  }
  return diagnostics;
}

function observedStructureKind(
  path: string,
  observedKinds: ReadonlyMap<string, StructureRootKind | "missing">
): StructureRootKind | "missing" {
  const kind = observedKinds.get(path);
  if (kind === undefined) {
    throw new Error(`Missing observation for planned structure path "${path}".`);
  }
  return kind;
}

function plannedStructureKind(
  plan: StructureEvaluationPlan,
  path: string,
  observedKinds: ReadonlyMap<string, StructureRootKind | "missing">
): StructureRootKind | "missing" {
  const kind = observedStructureKind(path, observedKinds);
  return kind !== "missing" && plan.universe.trackedNonFilePaths.has(path) ? "other" : kind;
}

function evaluateDirectoryChildren(
  scope: BoundStructureScope,
  rootPath: string,
  children: readonly string[]
): readonly StructureDiagnostic[] {
  const diagnostics: StructureDiagnostic[] = [];
  const required = scope.required ?? [];
  const allowed = scope.allowed ?? [];
  const forbidden = scope.forbidden ?? [];
  const requiredMatchers = makeMatchers(required);
  const allowedMatchers = makeMatchers([...required, ...allowed]);
  const forbiddenMatchers = makeMatchers(forbidden);

  for (const pattern of required) {
    if (children.some((child) => requiredMatchers.get(pattern)?.(child) === true)) continue;
    diagnostics.push({
      code: "missing-required-child",
      path: displayPath(rootPath),
      message: `Structure scope "${scope.name}" requires direct child ${pattern} under ${displayPath(rootPath)}.`,
    });
  }

  for (const child of children) {
    const forbiddenPattern = firstMatchingPattern(child, forbiddenMatchers);
    if (forbiddenPattern !== undefined) {
      diagnostics.push({
        code: "forbidden-child",
        path: displayPath(appendPath(rootPath, child)),
        message: `Structure scope "${scope.name}" forbids direct child ${child} under ${displayPath(rootPath)} via ${forbiddenPattern}.`,
      });
      continue;
    }
    if (scope.mode === "closed" && firstMatchingPattern(child, allowedMatchers) === undefined) {
      diagnostics.push({
        code: "unexpected-child",
        path: displayPath(appendPath(rootPath, child)),
        message: `Structure scope "${scope.name}" is closed and does not allow direct child ${child} under ${displayPath(rootPath)}.`,
      });
    }
  }
  return diagnostics;
}

function makeMatchers(patterns: readonly string[]) {
  return new Map(
    patterns.map((pattern): readonly [string, (candidate: string) => boolean] => [
      pattern,
      picomatch(pattern, STRUCTURE_PICOMATCH_OPTIONS),
    ])
  );
}

function firstMatchingPattern(
  name: string,
  matchers: ReadonlyMap<string, (candidate: string) => boolean>
): string | undefined {
  for (const [pattern, matches] of matchers) {
    if (matches(name)) return pattern;
  }
  return undefined;
}

function appendPath(parent: string, child: string): string {
  const normalizedParent = parent === "." ? "" : parent;
  if (child === ".") return normalizedParent;
  return normalizedParent === "" ? child : `${normalizedParent}/${child}`;
}

function relativeToBoundRoot(candidate: string, bindingPath: string): string | undefined {
  const normalizedBinding = bindingPath === "." ? "" : bindingPath;
  if (normalizedBinding === "") return candidate;
  if (candidate === normalizedBinding) return "";
  const prefix = `${normalizedBinding}/`;
  return candidate.startsWith(prefix) ? candidate.slice(prefix.length) : undefined;
}

function ancestors(candidate: string): readonly string[] {
  const parts = candidate.split("/");
  const out: string[] = [];
  for (let index = 1; index < parts.length; index += 1) {
    out.push(parts.slice(0, index).join("/"));
  }
  return out;
}

function parentPath(candidate: string): string {
  const separator = candidate.lastIndexOf("/");
  return separator < 0 ? "" : candidate.slice(0, separator);
}

function baseName(candidate: string): string {
  const separator = candidate.lastIndexOf("/");
  return separator < 0 ? candidate : candidate.slice(separator + 1);
}

function displayPath(candidate: string): string {
  return candidate === "" ? "." : candidate;
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
