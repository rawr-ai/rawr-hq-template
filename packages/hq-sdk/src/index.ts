export type { BaseDeps, Logger } from "./deps";

export { createDomainModule, type DomainContext } from "./orpc/module";
export type { DomainPackage, InferDeps } from "./orpc/domain-package";
export { defineDomainPackage } from "./orpc/domain-package";
export { schema, typeBoxStandardSchema } from "./orpc/schema";

