import { createReleaseLifecycleApplications } from "./internal/application";
import { module } from "./module";
import type { ReleaseLifecycleRuntime } from "./ports";

const check = module.check.handler(async ({ context, input }) => {
  return await applications(context.runtime).check(input);
});

const build = module.build.handler(async ({ context, input }) => {
  return await applications(context.runtime).build(input);
});

function applications(runtime: ReleaseLifecycleRuntime) {
  return createReleaseLifecycleApplications({
    source: runtime.source,
    artifacts: runtime.artifacts,
  });
}

export const router = module.router({ check, build });
