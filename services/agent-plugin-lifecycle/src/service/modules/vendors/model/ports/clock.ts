/**
 * Supplies the observation instant Vendors records when it authors admitted
 * upstream content. The host binds the clock while the Vendors module owns
 * the timestamp's domain meaning.
 */
export interface VendorClockPort {
  readonly now: () => Date;
}
