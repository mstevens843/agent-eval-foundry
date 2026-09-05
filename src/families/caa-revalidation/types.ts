export type Caa = "ALLOW" | "DENY";
export type CaaSource = "CACHE" | "CURRENT";
export type IssuanceDecision = "ISSUE" | "REFUSE";

export interface OrderName {
  readonly fqdn: string;
  /** Wall-clock hour at which this name's domain control was last validated. */
  readonly validatedAtHour: number;
  /** The authorization answer recorded at that validation. It may since have changed. */
  readonly cachedCaa: Caa;
}

export interface OrderView {
  readonly orderId: string;
  readonly nowHour: number;
  /** One to five names, unique and lowercase, in the order the order requested them. */
  readonly names: readonly OrderName[];
}

export interface NameResult {
  readonly fqdn: string;
  readonly caa: Caa;
  readonly source: CaaSource;
}

export interface OrderReport {
  readonly decision: IssuanceDecision;
  readonly results: readonly NameResult[];
}

/**
 * The host-owned authorization service.
 *
 * `current` answers for exactly the name it is given and records that call. It is synchronous, total
 * over any string, and never throws.
 */
export interface CaaAuthority {
  current(fqdn: string): Caa;
}

export interface Subject {
  readonly id: string;
  readonly label: string;
  run(view: OrderView, caa: CaaAuthority): OrderReport;
}
