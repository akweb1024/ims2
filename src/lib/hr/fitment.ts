/**
 * Salary-fitment rule engine (ICDR HR Framework §40 + §5.1).
 *
 * Pure functions — no DB. The API route loads the grade + existing peers and feeds
 * them in, so this stays unit-testable. Builds on the grade primitives in ./grades.
 * All amounts are MONTHLY CTC.
 */
import { bandCheck, compaRatioBucket, computeCompaRatio, type BandCheck, type GradeBand } from './grades';

/** Flag a new hire whose salary exceeds existing same-grade peers by more than this. */
export const EQUITY_EXCEED_THRESHOLD_PCT = 15;

export type FitmentSeverity = 'BLOCK' | 'WARN' | 'INFO' | 'OK';
export interface FitmentCheck {
  key: string;
  severity: FitmentSeverity;
  message: string;
}

export interface FitmentInput {
  proposedMonthlyCtc: number | null | undefined;
  grade: (GradeBand & { code?: string | null; name?: string | null }) | null | undefined;
  isNewHire?: boolean;
  /** Existing same-grade (optionally same-role) peer monthly CTCs, candidate excluded. */
  peerSalaries?: number[];
}

export interface FitmentResult {
  ok: boolean; // no BLOCK-level checks
  needsException: boolean; // band breach → exception approval required
  needsJustification: boolean; // above midpoint → written justification
  needsEquityReview: boolean; // exceeds peers beyond threshold
  band: BandCheck;
  compaRatio: number | null;
  compaBucket: ReturnType<typeof compaRatioBucket>;
  peer: { count: number; max: number | null; median: number | null; exceedByPct: number | null };
  checks: FitmentCheck[];
}

function median(nums: number[]): number | null {
  if (!nums.length) return null;
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
}

const inr = (n: number | null | undefined) => (n == null ? '—' : `₹${Math.round(n).toLocaleString('en-IN')}`);

/** Summarise how a proposed salary compares to same-grade peers (pure). */
export function summarizeEquity(proposedMonthlyCtc: number | null | undefined, peerSalaries: number[] = []) {
  const peers = peerSalaries.filter((n) => typeof n === 'number' && n > 0);
  const max = peers.length ? Math.max(...peers) : null;
  const med = median(peers);
  let exceedByPct: number | null = null;
  if (proposedMonthlyCtc && max && max > 0 && proposedMonthlyCtc > max) {
    exceedByPct = Math.round(((proposedMonthlyCtc - max) / max) * 1000) / 10;
  }
  return { count: peers.length, max, median: med, exceedByPct };
}

/** Evaluate a proposed salary fitment against its grade and peers (§40). */
export function evaluateFitment(input: FitmentInput): FitmentResult {
  const { proposedMonthlyCtc, grade, isNewHire = true } = input;
  const checks: FitmentCheck[] = [];

  // 1) Grade required — blocks offer approval (§40).
  if (!grade) {
    checks.push({ key: 'grade_required', severity: 'BLOCK', message: 'Select a grade before approving the offer.' });
    return {
      ok: false, needsException: false, needsJustification: false, needsEquityReview: false,
      band: 'NO_BAND', compaRatio: null, compaBucket: compaRatioBucket(null),
      peer: { count: 0, max: null, median: null, exceedByPct: null }, checks,
    };
  }

  const label = grade.code ? `${grade.code}` : 'this grade';
  const band = bandCheck(proposedMonthlyCtc, grade);
  const compaRatio = computeCompaRatio(proposedMonthlyCtc, grade);
  const compaBucket = compaRatioBucket(compaRatio);

  if (proposedMonthlyCtc == null || proposedMonthlyCtc <= 0) {
    checks.push({ key: 'salary_required', severity: 'BLOCK', message: 'Enter a proposed monthly CTC.' });
  }

  // 2) Band check → exception approval (§40).
  let needsException = false;
  if (band === 'BELOW_MIN') {
    needsException = true;
    checks.push({ key: 'below_min', severity: 'WARN', message: `Proposed ${inr(proposedMonthlyCtc)} is below the ${label} band minimum ${inr(grade.minCtc)} — exception approval required.` });
  } else if (band === 'ABOVE_MAX') {
    needsException = true;
    checks.push({ key: 'above_max', severity: 'WARN', message: `Proposed ${inr(proposedMonthlyCtc)} is above the ${label} band maximum ${inr(grade.maxCtc)} — exception approval required.` });
  } else if (band === 'NO_BAND') {
    checks.push({ key: 'no_band', severity: 'INFO', message: `${label} has no salary band configured — set min/mid/max to enable fitment checks.` });
  } else {
    checks.push({ key: 'in_band', severity: 'OK', message: `Within the ${label} band (${inr(grade.minCtc)}–${inr(grade.maxCtc)}).` });
  }

  // 3) Midpoint check for new hires → written justification (§40).
  let needsJustification = false;
  if (isNewHire && grade.midCtc && proposedMonthlyCtc && proposedMonthlyCtc > grade.midCtc && band !== 'ABOVE_MAX') {
    needsJustification = true;
    checks.push({ key: 'above_midpoint', severity: 'WARN', message: `Above band midpoint ${inr(grade.midCtc)} for a new hire — record a written justification.` });
  }

  // 4) Compa-ratio guidance (§6.1).
  if (compaRatio != null) {
    checks.push({ key: 'compa_ratio', severity: 'INFO', message: `Compa-ratio ${compaRatio.toFixed(2)} (${compaBucket.label}). ${compaBucket.guidance}` });
    // Existing-employee correction cue.
    if (!isNewHire && compaBucket.bucket === 'BELOW') {
      checks.push({ key: 'equity_correction', severity: 'INFO', message: 'Below 0.85 compa-ratio — equity-correction review candidate if a strong performer.' });
    }
  }

  // 5) Internal-equity flag vs same-grade peers (§40).
  const peer = summarizeEquity(proposedMonthlyCtc, input.peerSalaries || []);
  let needsEquityReview = false;
  if (peer.exceedByPct != null && peer.exceedByPct > EQUITY_EXCEED_THRESHOLD_PCT) {
    needsEquityReview = true;
    checks.push({ key: 'internal_equity', severity: 'WARN', message: `Exceeds the highest existing ${label} peer (${inr(peer.max)}) by ${peer.exceedByPct}% — internal equity review required within 30 days. Consider mapping to a higher grade/specialist title.` });
  } else if (peer.count > 0) {
    checks.push({ key: 'internal_equity_ok', severity: 'OK', message: `In line with ${peer.count} existing ${label} peer(s) (max ${inr(peer.max)}).` });
  }

  const ok = !checks.some((c) => c.severity === 'BLOCK');
  return { ok, needsException, needsJustification, needsEquityReview, band, compaRatio, compaBucket, peer, checks };
}
