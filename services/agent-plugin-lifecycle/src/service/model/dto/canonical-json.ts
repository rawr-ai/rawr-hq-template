/**
 * Describes values admitted by the lifecycle service's canonical JSON serializers.
 *
 * This compile-time boundary constrains serializer callers to JSON-shaped
 * data while concrete persisted records retain their own TypeBox schemas and
 * runtime validation.
 */
export type CanonicalJsonValue =
  | null
  | boolean
  | number
  | string
  | readonly CanonicalJsonValue[]
  | { readonly [key: string]: CanonicalJsonValue };
