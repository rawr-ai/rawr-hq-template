import {
  createCanonicalStatus,
  createCanonicalSync,
  createCompleteTest,
  createManagedRetire,
  createTargetedTest,
  type CanonicalStatusApplication,
  type CanonicalStatusDependencies,
  type CanonicalSyncApplication,
  type CanonicalSyncDependencies,
  type CompleteTestApplication,
  type CompleteTestDependencies,
  type ManagedRetireApplication,
  type ManagedRetireDependencies,
  type TargetedTestApplication,
  type TargetedTestDependencies,
} from "@rawr/agent-provider-deployment";

export function createControllerTargetedTestApplication(
  dependencies: () => TargetedTestDependencies,
): TargetedTestApplication {
  return createTargetedTest(dependencies);
}

export function createControllerCompleteTestApplication(
  dependencies: () => CompleteTestDependencies,
): CompleteTestApplication {
  return createCompleteTest(dependencies);
}

export function createControllerCanonicalSyncApplication(
  dependencies: () => CanonicalSyncDependencies,
): CanonicalSyncApplication {
  return createCanonicalSync(dependencies);
}

export function createControllerCanonicalStatusApplication(
  dependencies: () => CanonicalStatusDependencies,
): CanonicalStatusApplication {
  return createCanonicalStatus(dependencies);
}

export function createControllerManagedRetireApplication(
  dependencies: () => ManagedRetireDependencies,
): ManagedRetireApplication {
  return createManagedRetire(dependencies);
}
