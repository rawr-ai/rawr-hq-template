import type { RuntimeLaunchIdentity } from "../../definition/src/index";
import type {
  HarnessFinding,
  HarnessHealthReport,
  NativeHarnessHandle,
} from "../../harnesses/src/index";

/** A successful native mount, owned only by this process's mounting operation. */
export interface StartedHarness {
  readonly descriptorId: string;
  readonly nativeHandle: NativeHarnessHandle;
  readonly stop: NativeHarnessHandle["stop"];
  readiness: NativeHarnessHandle["readiness"];
  liveness: NativeHarnessHandle["liveness"];
  readonly findings: readonly HarnessFinding[];
  readonly launchIdentity: RuntimeLaunchIdentity;
  readonly mount: {
    readonly mountedAt: string;
    readonly roles: readonly string[];
    readonly surfacePlanIds: readonly string[];
  };
  readonly reports: Map<HarnessHealthReport["kind"], HarnessHealthReport>;
}
