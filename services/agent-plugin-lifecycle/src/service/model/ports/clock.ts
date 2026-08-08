/** Supplies the observation instant recorded by lifecycle operations. */
export interface ClockPort {
  readonly now: () => Date;
}
