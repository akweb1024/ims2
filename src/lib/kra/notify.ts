/**
 * Notification helper for the Goals & KRA module (Plan B, Phase 3).
 * Thin wrapper over the existing Notification model so assignment/verification/rating
 * events surface in-app. Failures are swallowed — a notification must never break the
 * underlying mutation.
 */
import { prisma } from '@/lib/prisma';

export interface NotifyArgs {
  userId: string;
  title: string;
  message: string;
  type?: string; // e.g. KRA_GOAL, KRA_VERIFY, KRA_RATING
  link?: string;
}

export async function notify(args: NotifyArgs): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        userId: args.userId,
        title: args.title,
        message: args.message,
        type: args.type ?? 'INFO',
        link: args.link ?? null,
      },
    });
  } catch {
    // Non-fatal: never let a notification failure roll back the caller's work.
  }
}

/** Resolve an EmployeeProfile id -> its User id (notifications target users). */
export async function userIdForProfile(employeeProfileId: string): Promise<string | null> {
  const p = await prisma.employeeProfile.findUnique({
    where: { id: employeeProfileId },
    select: { userId: true },
  });
  return p?.userId ?? null;
}
