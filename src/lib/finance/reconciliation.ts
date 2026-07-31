/**
 * Revenue reconciliation: comparing what employees say they sold against what actually reached
 * the bank.
 *
 * The two sides are recorded independently — that independence is the whole point, since two
 * copies of the same number prove nothing. They are then compared on BOTH bases:
 *
 *   gross  — what customers were billed. Employees declare this; the money side is grossed up
 *            by adding the gateway's fee and tax back onto the credit.
 *   net    — what actually landed. The money side reports this directly; the declared side is
 *            netted down using the fees observed on its matched settlements.
 *
 * Showing both is deliberate. Gross agreeing while net disagrees means a fee changed or was
 * mis-recorded; net agreeing while gross disagrees means someone declared the wrong sale value.
 * One number alone cannot tell those apart.
 *
 * The awkward case this exists for: an INR payment lands in the bank whole, but a USD payment
 * goes through Razorpay or PayPal, which converts it, takes a fee, adds GST on that fee, and
 * credits the remainder. So for a $500 sale:
 *
 *     declared gross      USD 500
 *     × fxRate 85.00  =   INR 42,500     grossInr
 *     − fee               INR  1,000     feeInr
 *     − GST on fee        INR    180     taxInr
 *     = bank credit       INR 41,320     netInr
 *
 * Comparing the declared 42,500 against the bank's 41,320 without accounting for the 1,180 of
 * deductions reports a shortfall that does not exist.
 *
 * Pure module — no Prisma, no IO — so the arithmetic can be tested directly.
 */

export type ReconChannel = 'BANK_DIRECT' | 'RAZORPAY' | 'PAYPAL' | 'OTHER';

export interface DeclarationInput {
  id: string;
  employeeId: string;
  employeeName?: string | null;
  saleDate: Date;
  grossAmount: number;
  currency: string;
  channel: ReconChannel;
  reference?: string | null;
}

export interface SettlementInput {
  id: string;
  source: 'BANK_STATEMENT' | 'RAZORPAY' | 'PAYPAL' | 'MANUAL';
  captureDate: Date;
  /** Null means captured but not yet credited — in transit. */
  settlementDate: Date | null;
  originalCurrency: string;
  originalAmount: number;
  fxRate: number;
  grossInr: number;
  feeInr: number;
  taxInr: number;
  netInr: number;
  declarationId?: string | null;
  externalRef?: string | null;
}

export interface ReconciliationOptions {
  periodStart: Date;
  periodEnd: Date;
  /**
   * Absolute INR tolerance. Rounding on FX and per-transaction fees means an exact tie is the
   * exception, not the rule; anything inside this band counts as agreeing.
   */
  toleranceInr?: number;
  /** FX rates for declarations with no matched settlement to borrow a real rate from. */
  fallbackFxRates?: Record<string, number>;
}

export interface ReconciliationResult {
  periodStart: string;
  periodEnd: string;
  toleranceInr: number;

  declared: {
    count: number;
    grossInr: number;
    /** Gross less the fees observed on matched settlements. */
    netInr: number;
    /** Declarations we could not convert to INR — see `unratedCurrencies`. */
    unconvertedCount: number;
    unratedCurrencies: string[];
  };

  settled: {
    count: number;
    grossInr: number;
    netInr: number;
    feeInr: number;
    taxInr: number;
  };

  /** Captured in or before the period but not yet credited. Explains variance rather than being one. */
  inTransit: {
    count: number;
    grossInr: number;
    netInr: number;
  };

  variance: {
    grossInr: number;
    netInr: number;
    grossMatches: boolean;
    netMatches: boolean;
    /** True only when both bases agree — the "data is correct" signal. */
    matches: boolean;
  };

  /** Lines that need a human: unmatched on either side, or matched but disagreeing. */
  exceptions: ReconciliationException[];
}

export type ExceptionKind =
  | 'DECLARED_NOT_SETTLED'
  | 'SETTLED_NOT_DECLARED'
  | 'AMOUNT_MISMATCH'
  | 'MISSING_FX_RATE';

export interface ReconciliationException {
  kind: ExceptionKind;
  detail: string;
  declarationId?: string;
  settlementId?: string;
  employeeName?: string | null;
  amountInr?: number;
  differenceInr?: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const within = (a: number, b: number, tol: number) => Math.abs(a - b) <= tol;

/** Inclusive on both ends — a settlement dated the last day of the month belongs to it. */
function inPeriod(d: Date, start: Date, end: Date): boolean {
  return d.getTime() >= start.getTime() && d.getTime() <= end.getTime();
}

/**
 * Convert a declaration to INR. Prefers the rate actually observed on its matched settlement,
 * because a real conversion beats any table; falls back to a supplied rate, and reports the
 * declaration as unconverted if neither exists rather than silently treating 1 USD as 1 INR.
 */
function declaredGrossInr(
  d: DeclarationInput,
  matched: SettlementInput | undefined,
  fallback: Record<string, number>,
): number | null {
  if (d.currency === 'INR') return d.grossAmount;
  if (matched && matched.fxRate > 0 && matched.originalCurrency === d.currency) {
    return d.grossAmount * matched.fxRate;
  }
  const rate = fallback[d.currency];
  return rate && rate > 0 ? d.grossAmount * rate : null;
}

export function reconcile(
  declarations: DeclarationInput[],
  settlements: SettlementInput[],
  options: ReconciliationOptions,
): ReconciliationResult {
  const { periodStart, periodEnd } = options;
  const tolerance = options.toleranceInr ?? 1;
  const fallback = options.fallbackFxRates ?? {};

  const byDeclaration = new Map<string, SettlementInput>();
  for (const s of settlements) {
    if (s.declarationId) byDeclaration.set(s.declarationId, s);
  }

  // Money side: settled within the period. Anything without a settlement date is in transit and
  // is deliberately kept out of the totals — it has not arrived, so it cannot reconcile yet.
  const settledInPeriod = settlements.filter(
    (s) => s.settlementDate !== null && inPeriod(s.settlementDate, periodStart, periodEnd),
  );
  const inTransit = settlements.filter(
    (s) => s.settlementDate === null && s.captureDate.getTime() <= periodEnd.getTime(),
  );

  // Employee side: sales made within the period.
  const declaredInPeriod = declarations.filter((d) => inPeriod(d.saleDate, periodStart, periodEnd));

  let declaredGross = 0;
  let declaredNet = 0;
  let unconvertedCount = 0;
  const unrated = new Set<string>();
  const exceptions: ReconciliationException[] = [];

  for (const d of declaredInPeriod) {
    const matched = byDeclaration.get(d.id);
    const gross = declaredGrossInr(d, matched, fallback);

    if (gross === null) {
      unconvertedCount += 1;
      unrated.add(d.currency);
      exceptions.push({
        kind: 'MISSING_FX_RATE',
        detail: `No FX rate for ${d.currency}; ${d.currency} ${d.grossAmount} left out of the INR totals.`,
        declarationId: d.id,
        employeeName: d.employeeName,
      });
      continue;
    }

    declaredGross += gross;
    // Net the declaration down by whatever the gateway actually took on its matched settlement.
    // With no match there is nothing observed to deduct, so gross stands in for net.
    declaredNet += matched ? gross - matched.feeInr - matched.taxInr : gross;

    if (!matched) {
      exceptions.push({
        kind: 'DECLARED_NOT_SETTLED',
        detail: `Declared ${d.currency} ${d.grossAmount} via ${d.channel} with no settlement matched to it.`,
        declarationId: d.id,
        employeeName: d.employeeName,
        amountInr: round2(gross),
      });
    } else if (!within(gross, matched.grossInr, tolerance)) {
      exceptions.push({
        kind: 'AMOUNT_MISMATCH',
        detail: `Declared gross ₹${round2(gross)} but the settlement grossed ₹${round2(matched.grossInr)}.`,
        declarationId: d.id,
        settlementId: matched.id,
        employeeName: d.employeeName,
        amountInr: round2(gross),
        differenceInr: round2(gross - matched.grossInr),
      });
    }
  }

  const declaredIds = new Set(declaredInPeriod.map((d) => d.id));
  for (const s of settledInPeriod) {
    if (!s.declarationId || !declaredIds.has(s.declarationId)) {
      exceptions.push({
        kind: 'SETTLED_NOT_DECLARED',
        detail: `₹${round2(s.netInr)} settled from ${s.source}${s.externalRef ? ` (${s.externalRef})` : ''} with no matching declaration.`,
        settlementId: s.id,
        amountInr: round2(s.netInr),
      });
    }
  }

  const settledGross = settledInPeriod.reduce((t, s) => t + s.grossInr, 0);
  const settledNet = settledInPeriod.reduce((t, s) => t + s.netInr, 0);
  const settledFee = settledInPeriod.reduce((t, s) => t + s.feeInr, 0);
  const settledTax = settledInPeriod.reduce((t, s) => t + s.taxInr, 0);

  const varianceGross = declaredGross - settledGross;
  const varianceNet = declaredNet - settledNet;
  const grossMatches = within(declaredGross, settledGross, tolerance);
  const netMatches = within(declaredNet, settledNet, tolerance);

  return {
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
    toleranceInr: tolerance,
    declared: {
      count: declaredInPeriod.length,
      grossInr: round2(declaredGross),
      netInr: round2(declaredNet),
      unconvertedCount,
      unratedCurrencies: [...unrated],
    },
    settled: {
      count: settledInPeriod.length,
      grossInr: round2(settledGross),
      netInr: round2(settledNet),
      feeInr: round2(settledFee),
      taxInr: round2(settledTax),
    },
    inTransit: {
      count: inTransit.length,
      grossInr: round2(inTransit.reduce((t, s) => t + s.grossInr, 0)),
      netInr: round2(inTransit.reduce((t, s) => t + s.netInr, 0)),
    },
    variance: {
      grossInr: round2(varianceGross),
      netInr: round2(varianceNet),
      grossMatches,
      netMatches,
      // Both bases have to agree before calling the period clean; gross alone would hide a
      // fee that was mis-recorded, net alone would hide a mis-declared sale value.
      matches: grossMatches && netMatches && unconvertedCount === 0,
    },
    exceptions,
  };
}

/**
 * Derive the INR breakdown for a gateway payment. Gateways report fee and tax in the settlement
 * currency (INR for both Razorpay and PayPal India), while the payment itself may be foreign.
 */
export function settlementBreakdown(input: {
  originalAmount: number;
  originalCurrency: string;
  fxRate: number;
  feeInr: number;
  taxInr: number;
}): { grossInr: number; netInr: number } {
  const grossInr = round2(input.originalAmount * (input.originalCurrency === 'INR' ? 1 : input.fxRate));
  return { grossInr, netInr: round2(grossInr - input.feeInr - input.taxInr) };
}
