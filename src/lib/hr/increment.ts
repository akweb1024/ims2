/**
 * Increment recommendation rule engine (ICDR HR Framework §41 + §6/§6.1).
 *
 * Pure — no DB. Given a performance rating and compa-ratio (from the grade midpoint),
 * recommends an increment %, moderating for band position and blocking under PIP/notice.
 * Uses the corrected, non-overlapping rating bands from the Reviewer Addendum (A).
 */
import { compaRatioBucket } from './grades';

export type Rating = 'A+' | 'A' | 'B+' | 'B' | 'C' | 'D';

/** Corrected non-overlapping increment ranges (%) — Addendum A. */
export const RATING_RANGES: Record<Rating, { min: number; max: number }> = {
  'A+': { min: 16, max: 25 },
  A: { min: 11, max: 15 },
  'B+': { min: 8, max: 10 },
  B: { min: 5, max: 7 },
  C: { min: 1, max: 4 },
  D: { min: 0, max: 0 },
};

const STRONG: Rating[] = ['A+', 'A', 'B+'];

export type IncrementMode = 'INCREMENT' | 'BONUS' | 'BLOCKED' | 'NEEDS_RATING';
export type NoteSeverity = 'BLOCK' | 'WARN' | 'INFO' | 'OK';
export interface IncrementNote { key: string; severity: NoteSeverity; message: string }

export interface IncrementInput {
  rating: Rating | null | undefined;
  compaRatio: number | null | undefined;
  promotion?: boolean;
  /** Employee under PIP, serving notice or disciplinary action → block/defer (§41). */
  underPipOrNotice?: boolean;
}

export interface IncrementResult {
  mode: IncrementMode;
  minPct: number | null;
  maxPct: number | null;
  recommendedPct: number | null;
  equityCorrection: boolean;
  moderatedForHighCompa: boolean;
  notes: IncrementNote[];
}

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

/** Recommend an increment for a rating + compa-ratio (§41). */
export function recommendIncrement(input: IncrementInput): IncrementResult {
  const { rating, compaRatio, promotion = false, underPipOrNotice = false } = input;
  const notes: IncrementNote[] = [];

  // 1) Hard block (§41): PIP / notice / disciplinary.
  if (underPipOrNotice) {
    notes.push({ key: 'pip_block', severity: 'BLOCK', message: 'Blocked/deferred — employee is under PIP, serving notice or in disciplinary action.' });
    return { mode: 'BLOCKED', minPct: 0, maxPct: 0, recommendedPct: 0, equityCorrection: false, moderatedForHighCompa: false, notes };
  }

  // 2) Rating required.
  if (!rating || !(rating in RATING_RANGES)) {
    notes.push({ key: 'needs_rating', severity: 'WARN', message: 'No performance rating on record — run the quarterly/annual rating before recommending an increment.' });
    return { mode: 'NEEDS_RATING', minPct: null, maxPct: null, recommendedPct: null, equityCorrection: false, moderatedForHighCompa: false, notes };
  }

  const range = RATING_RANGES[rating];
  notes.push({ key: 'rating_band', severity: 'INFO', message: `Rating ${rating} → guideline ${range.min}–${range.max}%.` });

  const bucket = compaRatioBucket(compaRatio ?? null);
  let recommendedPct = Math.round((range.min + range.max) / 2);
  let mode: IncrementMode = 'INCREMENT';
  let equityCorrection = false;
  let moderatedForHighCompa = false;

  if (compaRatio != null) {
    notes.push({ key: 'compa', severity: 'INFO', message: `Compa-ratio ${compaRatio.toFixed(2)} (${bucket.label}).` });

    // Above 1.20 without promotion → prefer bonus over high fixed increment.
    if (compaRatio > 1.2 && !promotion) {
      mode = 'BONUS';
      moderatedForHighCompa = true;
      recommendedPct = range.min; // if given as fixed pay, keep it minimal
      notes.push({ key: 'high_compa', severity: 'WARN', message: 'Compa-ratio above 1.20 without promotion — prefer a one-time bonus or role upgrade over a high fixed increment; hold fixed pay near the band minimum.' });
    } else if (compaRatio < 0.85 && STRONG.includes(rating)) {
      // Below band with a strong rating → equity correction, bias to the top.
      equityCorrection = true;
      recommendedPct = range.max;
      notes.push({ key: 'equity_correction', severity: 'WARN', message: 'Below 0.85 compa-ratio with a strong rating — bias to the top of the band as an equity correction.' });
    }
  } else {
    notes.push({ key: 'no_compa', severity: 'INFO', message: 'No compa-ratio (grade midpoint not set) — using the rating band midpoint.' });
  }

  recommendedPct = clamp(recommendedPct, range.min, range.max);
  if (mode === 'INCREMENT' && !equityCorrection && !moderatedForHighCompa) {
    notes.push({ key: 'ok', severity: 'OK', message: `Recommend ${recommendedPct}% (band midpoint).` });
  }

  return { mode, minPct: range.min, maxPct: range.max, recommendedPct, equityCorrection, moderatedForHighCompa, notes };
}
