'use client';

/**
 * Shared visual primitives for the Goals & KRA module (Plan B, Phase 5).
 * Dimension chips, status pills, pace indicator and the verification timeline.
 */
import { FiCheck, FiClock, FiX } from 'react-icons/fi';
import type { KraGoalVerification } from '@/lib/kra/client';

const DIMENSION_STYLES: Record<string, string> = {
  OUTPUT: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  QUALITY: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  TAT: 'bg-amber-50 text-amber-700 ring-amber-200',
  COLLABORATION: 'bg-sky-50 text-sky-700 ring-sky-200',
  IMPROVEMENT: 'bg-violet-50 text-violet-700 ring-violet-200',
  BEHAVIOR: 'bg-rose-50 text-rose-700 ring-rose-200',
};

export function DimensionBadge({ dimension }: { dimension: string | null }) {
  if (!dimension) return null;
  const cls = DIMENSION_STYLES[dimension] ?? 'bg-gray-50 text-gray-600 ring-gray-200';
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset ${cls}`}>
      {dimension}
    </span>
  );
}

const STATUS_STYLES: Record<string, { cls: string; label: string }> = {
  PENDING: { cls: 'bg-gray-100 text-gray-600', label: 'Pending' },
  IN_PROGRESS: { cls: 'bg-blue-100 text-blue-700', label: 'In progress' },
  SUBMITTED: { cls: 'bg-amber-100 text-amber-700', label: 'Submitted' },
  TL_VERIFIED: { cls: 'bg-sky-100 text-sky-700', label: 'TL verified' },
  MANAGER_VERIFIED: { cls: 'bg-emerald-100 text-emerald-700', label: 'Verified ✓' },
  REJECTED: { cls: 'bg-rose-100 text-rose-700', label: 'Rejected' },
  ACHIEVED: { cls: 'bg-emerald-100 text-emerald-700', label: 'Achieved' },
};

export function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] ?? { cls: 'bg-gray-100 text-gray-600', label: status };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${s.cls}`}>{s.label}</span>;
}

export function OnTrackPill({ onTrack }: { onTrack: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
        onTrack ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
      }`}
    >
      {onTrack ? '● On track' : '● Behind'}
    </span>
  );
}

/** Compact 2-step (TL → Manager) verification trail. */
export function VerificationTimeline({ verifications }: { verifications: KraGoalVerification[] }) {
  if (!verifications.length) return null;
  return (
    <ol className="mt-3 space-y-1.5 border-l border-gray-200 pl-3">
      {verifications.map((v) => {
        const approved = v.status === 'APPROVED';
        return (
          <li key={v.id} className="flex items-start gap-2 text-xs">
            <span
              className={`mt-0.5 inline-flex h-4 w-4 flex-none items-center justify-center rounded-full ${
                approved ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
              }`}
            >
              {approved ? <FiCheck size={10} /> : <FiX size={10} />}
            </span>
            <span className="text-gray-600">
              <span className="font-medium text-gray-800">{v.level}</span> {approved ? 'approved' : 'rejected'}
              {v.comment ? <span className="text-gray-500"> — {v.comment}</span> : null}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function PendingHint({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-gray-400">
      <FiClock size={11} /> {children}
    </span>
  );
}
