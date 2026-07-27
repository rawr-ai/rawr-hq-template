/** Host-owned source of identifier candidates for new Example Todo records. */
export interface IdentifierGenerator {
  /** Produces one untrusted identifier candidate for service-owned admission. */
  generate(): unknown;
}
