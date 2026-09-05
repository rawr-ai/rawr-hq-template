import type { AppRole, RuntimeLaunchIdentity } from "../../definition/src/index";
import type { RuntimeObservationSeed } from "../src/index";

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type Assert<T extends true> = T;
export type RoleEquality = Assert<Equal<RuntimeObservationSeed["roles"][number], AppRole>>;
export type IdentityEquality = Assert<
  Equal<RuntimeObservationSeed["identity"], RuntimeLaunchIdentity>
>;
