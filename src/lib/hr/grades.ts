/**
 * Grade architecture keystone (ICDR HR Framework §2 + §6.1 compa-ratio).
 *
 * A Grade drives salary band, compa-ratio, notice period and increment guidance.
 * These pure helpers are the primitives the salary-fitment (§40) and increment
 * recommendation (§41) rule engines build on. Bands are MONTHLY CTC.
 */

export interface GradeBand {
  midCtc?: number | null;
  minCtc?: number | null;
  maxCtc?: number | null;
}

/** Compa-ratio = current monthly CTC / grade midpoint. Null when no midpoint is set. */
export function computeCompaRatio(monthlyCtc: number | null | undefined, grade: GradeBand | null | undefined): number | null {
  if (!grade || !grade.midCtc || grade.midCtc <= 0 || !monthlyCtc || monthlyCtc <= 0) return null;
  return Math.round((monthlyCtc / grade.midCtc) * 1000) / 1000;
}

export type CompaBucket = 'UNKNOWN' | 'BELOW' | 'NORMAL' | 'HIGH' | 'VERY_HIGH';

/** Bucket a compa-ratio per §6.1, with increment guidance. */
export function compaRatioBucket(ratio: number | null): { bucket: CompaBucket; label: string; guidance: string } {
  if (ratio === null || Number.isNaN(ratio)) {
    return { bucket: 'UNKNOWN', label: 'No band', guidance: 'Set a grade midpoint to enable compa-ratio.' };
  }
  if (ratio < 0.85) return { bucket: 'BELOW', label: 'Below band', guidance: 'Low within band — higher increment if performance is B+ or above (equity correction candidate).' };
  if (ratio <= 1.05) return { bucket: 'NORMAL', label: 'Normal', guidance: 'Normal band position — use rating-based increment.' };
  if (ratio <= 1.20) return { bucket: 'HIGH', label: 'High', guidance: 'High within band — moderate increment unless A/A+.' };
  return { bucket: 'VERY_HIGH', label: 'Very high', guidance: 'Very high within band — prefer bonus, role upgrade or freeze until promotion.' };
}

export type BandCheck = 'NO_BAND' | 'BELOW_MIN' | 'IN_BAND' | 'ABOVE_MAX';

/** Where a salary sits relative to the grade band (drives the §40 fitment gate). */
export function bandCheck(monthlyCtc: number | null | undefined, grade: GradeBand | null | undefined): BandCheck {
  if (!grade || grade.minCtc == null || grade.maxCtc == null) return 'NO_BAND';
  if (monthlyCtc == null) return 'NO_BAND';
  if (monthlyCtc < grade.minCtc) return 'BELOW_MIN';
  if (monthlyCtc > grade.maxCtc) return 'ABOVE_MAX';
  return 'IN_BAND';
}

export interface DefaultGradeSeed {
  code: string;
  name: string;
  order: number;
  minCtc: number | null;
  maxCtc: number | null;
  noticeDays: number;
  typicalExperience: string;
  decisionRights: string;
}

const mid = (min: number | null, max: number | null): number | null =>
  min != null && max != null ? Math.round((min + max) / 2) : null;

/** ICDR Framework §2 default group grade ladder (monthly CTC INR). Notice days per addendum C3. */
export const DEFAULT_GRADES: DefaultGradeSeed[] = [
  { code: 'G0', name: 'Intern / Summer Trainee', order: 0, minCtc: null, maxCtc: null, noticeDays: 15, typicalExperience: 'Student or short-term project trainee', decisionRights: 'No independent decision rights' },
  { code: 'G1', name: 'Trainee', order: 1, minCtc: 15000, maxCtc: 22000, noticeDays: 15, typicalExperience: 'Fresher under 3–4 month training', decisionRights: 'Daily supervision' },
  { code: 'G2', name: 'Junior Executive', order: 2, minCtc: 23000, maxCtc: 30000, noticeDays: 30, typicalExperience: 'Confirmed fresher or 0–1.5 years', decisionRights: 'Routine work under supervision' },
  { code: 'G3', name: 'Executive', order: 3, minCtc: 28000, maxCtc: 40000, noticeDays: 30, typicalExperience: '1–3 years relevant experience', decisionRights: 'Owns defined tasks/processes' },
  { code: 'G4', name: 'Senior Executive', order: 4, minCtc: 38000, maxCtc: 55000, noticeDays: 60, typicalExperience: '3–5 years or strong performer', decisionRights: 'Complex tasks, mentoring' },
  { code: 'G5', name: 'Team Leader / Specialist', order: 5, minCtc: 50000, maxCtc: 75000, noticeDays: 60, typicalExperience: '4–7 years or specialist skill', decisionRights: 'Small team / specialist portfolio' },
  { code: 'G6', name: 'Manager', order: 6, minCtc: 70000, maxCtc: 110000, noticeDays: 90, typicalExperience: '7–12 years / function ownership', decisionRights: 'Targets, people and systems' },
  { code: 'G7', name: 'Senior Manager / Business Lead', order: 7, minCtc: 100000, maxCtc: 180000, noticeDays: 90, typicalExperience: '10+ years / strategic role', decisionRights: 'P&L or major function ownership' },
  { code: 'G8', name: 'CXO / Business Head', order: 8, minCtc: null, maxCtc: null, noticeDays: 90, typicalExperience: 'Company-level leadership', decisionRights: 'Company or group accountability (board approved)' },
];

/** Row data for seeding the default ladder into a company (adds midCtc). */
export function defaultGradeRows(companyId: string) {
  return DEFAULT_GRADES.map((g) => ({
    companyId,
    code: g.code,
    name: g.name,
    order: g.order,
    minCtc: g.minCtc,
    midCtc: mid(g.minCtc, g.maxCtc),
    maxCtc: g.maxCtc,
    noticeDays: g.noticeDays,
    typicalExperience: g.typicalExperience,
    decisionRights: g.decisionRights,
  }));
}
