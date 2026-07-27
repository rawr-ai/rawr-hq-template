/** Host-owned time source used by Example Todo creation flows. */
export interface Clock {
  /** Returns the current time as an ISO date-time string. */
  now(): string;
}
