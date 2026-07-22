import {
  Cause,
  Chunk,
  Deferred,
  Effect,
  Exit,
  Layer,
  ManagedRuntime,
  PubSub,
  pipe,
  Queue,
  Ref,
  Schedule,
  Scope,
  Stream,
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
  pipe,
  Queue,
  Ref,
  Schedule,
  Scope,
  Stream,
};

export const effectVersionProof = "3.21.3" as const;

export function createEmptyManagedRuntime() {
  return ManagedRuntime.make(Layer.empty);
}
