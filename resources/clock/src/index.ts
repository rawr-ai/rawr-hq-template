import { Effect, type RawrEffect } from "@rawr/sdk/effect";
import { providerSelection } from "@rawr/sdk/runtime/profiles";
import { defineRuntimeProvider } from "@rawr/sdk/runtime/providers";
import { providerFx } from "@rawr/sdk/runtime/providers/effect";
import { defineRuntimeResource } from "@rawr/sdk/runtime/resources";
import type { AppRole } from "@rawr/sdk/runtime/resources";

export const RAWR_CLOCK_RESOURCE_TOPOLOGY = "resources/clock" as const;

export interface RuntimeClock {
  now(): Date;
  monotonicMs(): number;
  sleep(milliseconds: number): RawrEffect<void, unknown, never>;
}

export const ClockResource = defineRuntimeResource<"clock", RuntimeClock>({
  id: "clock",
  title: "Clock",
  purpose: "Process-local wall-clock and monotonic time operations.",
  defaultLifetime: "process",
  allowedLifetimes: ["process"],
  diagnosticContributor: {
    snapshot() {
      return { available: true };
    },
  },
});

export const SystemClockProvider = defineRuntimeProvider({
  kind: "runtime.provider",
  id: "clock.system",
  title: "System clock",
  provides: ClockResource,
  requires: [],
  build() {
    return providerFx.acquireRelease({
      acquire: () =>
        Effect.succeed({
          now() {
            return new Date();
          },
          monotonicMs() {
            return performance.now();
          },
          sleep(milliseconds: number) {
            return Effect.tryPromise(
              () =>
                new Promise<void>((resolve) => {
                  setTimeout(resolve, milliseconds);
                }),
            );
          },
        } satisfies RuntimeClock),
    });
  },
});

export const clock = {
  system(input: {
    readonly configKey?: string;
    readonly role?: AppRole;
    readonly instance?: string;
  } = {}) {
    return providerSelection({
      resource: ClockResource,
      provider: SystemClockProvider,
      lifetime: "process",
      role: input.role,
      instance: input.instance,
      configKey: input.configKey,
    });
  },
} as const;
