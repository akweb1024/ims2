/**
 * A small CSV reader for finance imports — bank statement exports and gateway settlement
 * reports. Deliberately not a dependency: these files are small, and the awkward parts are
 * predictable enough to handle directly.
 *
 * Handles what real exports actually contain: quoted fields, commas and newlines inside quotes,
 * doubled quotes as an escape, CRLF, a UTF-8 BOM, and trailing blank lines. It does NOT try to
 * be a full RFC 4180 implementation.
 *
 * Pure module, so the parsing and the amount/date coercion can be tested directly.
 */

/** Split CSV text into rows of raw cells. */
export function parseCsvRows(text: string): string[][] {
  const src = text.replace(/^﻿/, ''); // strip BOM
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < src.length; i++) {
    const c = src[i];

    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') { cell += '"'; i++; }  // escaped quote
        else inQuotes = false;
      } else {
        cell += c;
      }
      continue;
    }

    if (c === '"') { inQuotes = true; continue; }
    if (c === ',') { row.push(cell); cell = ''; continue; }
    if (c === '\r') continue;
    if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; continue; }
    cell += c;
  }
  // Whatever is left over is the final row, unless the file ended on a newline.
  if (cell !== '' || row.length > 0) { row.push(cell); rows.push(row); }

  return rows.filter((r) => r.some((v) => v.trim() !== ''));
}

/** Parse to objects keyed by header. Headers are lowercased and stripped of punctuation. */
export function parseCsv(text: string): Record<string, string>[] {
  const rows = parseCsvRows(text);
  if (rows.length < 2) return [];
  const headers = rows[0].map(normaliseHeader);
  return rows.slice(1).map((r) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { if (h) obj[h] = (r[i] ?? '').trim(); });
    return obj;
  });
}

export function normaliseHeader(h: string): string {
  return h.trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
}

/**
 * Read a money cell. Exports are inconsistent: thousands separators, currency symbols, a
 * trailing minus, or parentheses for negatives. Returns null rather than 0 when there is no
 * usable number, so a blank cell is never mistaken for a zero amount.
 */
export function parseAmount(raw: string | undefined | null): number | null {
  if (raw == null) return null;
  let s = String(raw).trim();
  if (!s) return null;

  let negative = false;
  if (/^\(.*\)$/.test(s)) { negative = true; s = s.slice(1, -1); }
  if (/-\s*$/.test(s)) { negative = true; s = s.replace(/-\s*$/, ''); }

  s = s.replace(/[^0-9.\-]/g, '');       // drop symbols, spaces and thousands separators
  if (s.startsWith('-')) { negative = true; s = s.slice(1); }
  if (!s || s === '.') return null;

  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return negative ? -n : n;
}

/**
 * Read a date cell. Accepts ISO, and the dd/mm/yyyy and dd-mm-yyyy forms Indian bank exports
 * use. Ambiguous US-style mm/dd is NOT guessed at — day-first is assumed, because that is what
 * the statements this imports actually use, and silently swapping day and month would move
 * money between periods.
 */
export function parseDate(raw: string | undefined | null): Date | null {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s) return null;

  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (iso) return safeDate(+iso[1], +iso[2], +iso[3]);

  const dmy = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/.exec(s);
  if (dmy) {
    const year = dmy[3].length === 2 ? 2000 + +dmy[3] : +dmy[3];
    return safeDate(year, +dmy[2], +dmy[1]);
  }

  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function safeDate(y: number, m: number, d: number): Date | null {
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return Number.isNaN(dt.getTime()) ? null : dt;
}

/** Pick the first present value among candidate normalised header names. */
export function pick(row: Record<string, string>, ...keys: string[]): string | undefined {
  for (const k of keys) {
    const v = row[normaliseHeader(k)];
    if (v != null && v !== '') return v;
  }
  return undefined;
}

export interface MappedSettlementRow {
  externalRef?: string;
  captureDate?: string;
  settlementDate?: string;
  originalAmount?: number;
  originalCurrency?: string;
  fxRate?: number;
  feeInr?: number;
  taxInr?: number;
  netInr?: number;
  narration?: string;
  /** Why this row could not be used, if it could not. */
  error?: string;
}

/**
 * Map a parsed CSV row onto the settlement import shape, accepting the column names bank
 * exports and the Razorpay/PayPal reports actually use.
 */
export function mapSettlementRow(row: Record<string, string>): MappedSettlementRow {
  const gross = parseAmount(pick(row, 'gross', 'amount', 'originalAmount', 'credit', 'deposit'));
  const capture = parseDate(pick(row, 'captureDate', 'date', 'transactionDate', 'valueDate', 'created'));

  if (gross == null) return { error: 'no usable amount' };
  if (gross <= 0) return { error: 'amount is zero or a debit' };
  if (!capture) return { error: 'no usable date' };

  const currency = (pick(row, 'currency', 'originalCurrency', 'ccy') || 'INR').toUpperCase();
  const fee = parseAmount(pick(row, 'fee', 'feeInr', 'charges', 'commission')) ?? 0;
  const tax = parseAmount(pick(row, 'tax', 'taxInr', 'gst')) ?? 0;
  const net = parseAmount(pick(row, 'net', 'netInr', 'settlementAmount', 'netAmount'));
  const fx = parseAmount(pick(row, 'fxRate', 'exchangeRate', 'rate', 'conversionRate'));
  const settlement = parseDate(pick(row, 'settlementDate', 'settledOn', 'creditDate', 'payoutDate'));

  // A foreign amount with no rate cannot be expressed in INR, and guessing 1:1 would understate
  // it by roughly 85x. Refuse the row instead — the API refuses it too, this is just earlier.
  if (currency !== 'INR' && !(fx && fx > 0)) {
    return { error: `${currency} row has no exchange rate column` };
  }

  return {
    externalRef: pick(row, 'externalRef', 'transactionId', 'txnId', 'referenceId', 'reference', 'utr', 'chequeNo'),
    captureDate: capture.toISOString(),
    settlementDate: settlement ? settlement.toISOString() : undefined,
    originalAmount: gross,
    originalCurrency: currency,
    fxRate: currency === 'INR' ? 1 : fx!,
    feeInr: Math.abs(fee),
    taxInr: Math.abs(tax),
    netInr: net ?? undefined,
    narration: pick(row, 'narration', 'description', 'particulars', 'details', 'remarks'),
  };
}
