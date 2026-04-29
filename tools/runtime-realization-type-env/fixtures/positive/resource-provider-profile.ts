import { Effect } from "@rawr/sdk/effect";
import { providerFx, defineRuntimeProvider } from "@rawr/sdk/runtime/providers";
import {
  defineRuntimeResource,
  resourceRequirement,
} from "@rawr/sdk/runtime/resources";
import {
  defineRuntimeProfile,
  providerSelection,
} from "@rawr/sdk/runtime/profiles";
import { RuntimeSchema, schema } from "@rawr/sdk/runtime/schema";

export interface EmailSender {
  send(input: { readonly to: string; readonly subject: string }): Promise<void>;
}

export interface EmailSenderConfig {
  readonly from: string;
}

export const EmailSenderConfigSchema = schema.object<
  "email.sender.config",
  EmailSenderConfig
>("email.sender.config");

export type DecodedEmailSenderConfig =
  RuntimeSchema.Infer<typeof EmailSenderConfigSchema>;

export const EmailSenderResource = defineRuntimeResource<"email.sender", EmailSender>({
  id: "email.sender",
  title: "Email sender",
});

export const ClockResource = defineRuntimeResource<"clock", { now(): Date }>({
  id: "clock",
  title: "Clock",
});

export const ClockProvider = defineRuntimeProvider({
  kind: "runtime.provider",
  id: "clock.system",
  title: "System clock",
  provides: ClockResource,
  requires: [],
  build() {
    return providerFx.acquireRelease({
      acquire: function* () {
        return yield* Effect.succeed({
          now() {
            return new Date(0);
          },
        });
      },
    });
  },
});

export const EmailProvider = defineRuntimeProvider({
  kind: "runtime.provider",
  id: "email.sender.memory",
  title: "Memory email sender",
  provides: EmailSenderResource,
  requires: [
    resourceRequirement(ClockResource, {
      lifetime: "process",
      reason: "timestamp outbound fixture mail",
    }),
  ],
  configSchema: EmailSenderConfigSchema,
  build(input) {
    const config: DecodedEmailSenderConfig = input.config;

    return providerFx.acquireRelease({
      acquire: function* () {
        return yield* Effect.succeed({
          async send() {
            void config.from;
          },
        } satisfies EmailSender);
      },
    });
  },
});

export const RuntimeFixtureProfile = defineRuntimeProfile({
  kind: "runtime.profile",
  id: "runtime-realization.fixture",
  providerSelections: [
    providerSelection({
      resource: EmailSenderResource,
      provider: EmailProvider,
      lifetime: "process",
      role: "server",
    }),
    providerSelection({
      resource: ClockResource,
      provider: ClockProvider,
      lifetime: "process",
      role: "server",
    }),
  ],
});
