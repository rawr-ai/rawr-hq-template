import {
  Cause,
  Chunk,
  Deferred,
  Effect,
  Exit,
  Layer,
  ManagedRuntime,
  PubSub,
  Queue,
  Ref,
  Schedule,
  Scope,
  Stream,
  pipe,
} from "effect";

export {
  Cause,
  Chunk,
  Deferred,
  Effect,
  Exit,
  Layer,
  ManagedRuntime,
  PubSub,
  Queue,
  Ref,
  Schedule,
  Scope,
  Stream,
  pipe,
};

export const effectVersionProof = "3.21.2" as const;

export function createEmptyManagedRuntime() {
  return ManagedRuntime.make(Layer.empty);
}
