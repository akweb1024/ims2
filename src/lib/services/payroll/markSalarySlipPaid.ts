import { Prisma } from '@prisma/client';

export async function markSalarySlipPaid(
  slipId: string,
  tx: Prisma.TransactionClient
) {
  const salarySlip = await tx.salarySlip.findUnique({
    where: { id: slipId },
  });

  if (!salarySlip) {
    return { ok: false as const, status: 404, error: 'Salary slip not found' };
  }

  if (salarySlip.status === 'PAID') {
    return { ok: false as const, status: 400, error: 'Salary already paid' };
  }

  const updatedSlip = await tx.salarySlip.update({
    where: { id: slipId },
    data: {
      status: 'PAID',
      amountPaid: salarySlip.netPayable,
    },
  });

  return { ok: true as const, slip: updatedSlip };
}

