import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { releaseInvoiceStockReservations } from "@/lib/invoice-stock-reservation";

export const RESET_INVOICING_CONFIRMATION = "RESET ALL INVOICING DATA";

type ResetInvoice = {
  id: string;
  invoiceNumber: string;
};

type ResetPayment = {
  id: string;
  razorpayPaymentId: string | null;
  transactionId: string | null;
  invoice: ResetInvoice | null;
};

type ResetRevenueTransaction = {
  id: string;
  referenceNumber: string | null;
  transactionNumber: string;
};

type InvoicingResetScope = {
  invoices: ResetInvoice[];
  payments: ResetPayment[];
  revenueTransactions: ResetRevenueTransaction[];
  financialRecordReferences: string[];
  journalReferences: string[];
  paymentJournalDescriptions: string[];
};

export type InvoicingResetPreview = {
  invoiceCount: number;
  paymentCount: number;
  revenueTransactionCount: number;
  revenueClaimCount: number;
  expenseAllocationCount: number;
  financialRecordCount: number;
  journalEntryCount: number;
  dispatchOrderLinkCount: number;
  itProjectLinkCount: number;
  companyCounterCount: number;
  brandCounterCount: number;
};

const compactReferences = (references: Array<string | null | undefined>) =>
  Array.from(
    new Set(
      references
        .map((reference) => reference?.trim())
        .filter((reference): reference is string => Boolean(reference)),
    ),
  );

const getScope = async (db: typeof prisma | Prisma.TransactionClient): Promise<InvoicingResetScope> => {
  const invoices = await db.invoice.findMany({
    select: {
      id: true,
      invoiceNumber: true,
    },
  });

  const invoiceIds = invoices.map((invoice) => invoice.id);
  const payments = invoiceIds.length
    ? await db.payment.findMany({
        where: { invoiceId: { in: invoiceIds } },
        select: {
          id: true,
          razorpayPaymentId: true,
          transactionId: true,
          invoice: {
            select: {
              id: true,
              invoiceNumber: true,
            },
          },
        },
      })
    : [];

  const paymentIds = payments.map((payment) => payment.id);
  const revenueTransactions =
    invoiceIds.length || paymentIds.length
      ? await db.revenueTransaction.findMany({
          where: {
            OR: [
              ...(invoiceIds.length ? [{ invoiceId: { in: invoiceIds } }] : []),
              ...(paymentIds.length ? [{ paymentId: { in: paymentIds } }] : []),
            ],
          },
          select: {
            id: true,
            referenceNumber: true,
            transactionNumber: true,
          },
        })
      : [];

  const financialRecordReferences = compactReferences([
    ...revenueTransactions.flatMap((transaction) => [
      transaction.referenceNumber,
      transaction.transactionNumber,
    ]),
    ...payments.flatMap((payment) => [
      payment.razorpayPaymentId,
      payment.transactionId,
    ]),
  ]);

  const journalReferences = compactReferences([
    ...invoices.map((invoice) => invoice.invoiceNumber),
    ...payments.flatMap((payment) => [
      payment.razorpayPaymentId,
      payment.transactionId,
    ]),
  ]);

  const paymentJournalDescriptions = compactReferences(
    payments.map((payment) =>
      payment.invoice ? `Payment Received for #${payment.invoice.invoiceNumber}` : null,
    ),
  );

  return {
    invoices,
    payments,
    revenueTransactions,
    financialRecordReferences,
    journalReferences,
    paymentJournalDescriptions,
  };
};

const getJournalWhere = (scope: InvoicingResetScope): Prisma.JournalEntryWhereInput => ({
  OR: [
    ...(scope.journalReferences.length
      ? [{ reference: { in: scope.journalReferences } }]
      : []),
    ...(scope.paymentJournalDescriptions.length
      ? [{ description: { in: scope.paymentJournalDescriptions } }]
      : []),
  ],
});

const getFinancialRecordWhere = (
  scope: InvoicingResetScope,
): Prisma.FinancialRecordWhereInput | null =>
  scope.financialRecordReferences.length
    ? { referenceId: { in: scope.financialRecordReferences } }
    : null;

const getPreview = async (
  db: typeof prisma | Prisma.TransactionClient,
  scope: InvoicingResetScope,
): Promise<InvoicingResetPreview> => {
  const revenueTransactionIds = scope.revenueTransactions.map((transaction) => transaction.id);
  const invoiceIds = scope.invoices.map((invoice) => invoice.id);
  const journalWhere = getJournalWhere(scope);
  const financialRecordWhere = getFinancialRecordWhere(scope);

  const [
    revenueClaimCount,
    expenseAllocationCount,
    financialRecordCount,
    journalEntryCount,
    dispatchOrderLinkCount,
    itProjectLinkCount,
    companyCounterCount,
    brandCounterCount,
  ] = await Promise.all([
    revenueTransactionIds.length
      ? db.revenueClaim.count({
          where: { revenueTransactionId: { in: revenueTransactionIds } },
        })
      : 0,
    revenueTransactionIds.length
      ? db.employeeExpenseAllocation.count({
          where: { revenueTransactionId: { in: revenueTransactionIds } },
        })
      : 0,
    financialRecordWhere ? db.financialRecord.count({ where: financialRecordWhere }) : 0,
    journalWhere.OR?.length ? db.journalEntry.count({ where: journalWhere }) : 0,
    invoiceIds.length
      ? db.dispatchOrder.count({ where: { invoiceId: { in: invoiceIds } } })
      : 0,
    invoiceIds.length ? db.iTProject.count({ where: { invoiceId: { in: invoiceIds } } }) : 0,
    db.company.count(),
    db.brand.count(),
  ]);

  return {
    invoiceCount: scope.invoices.length,
    paymentCount: scope.payments.length,
    revenueTransactionCount: scope.revenueTransactions.length,
    revenueClaimCount,
    expenseAllocationCount,
    financialRecordCount,
    journalEntryCount,
    dispatchOrderLinkCount,
    itProjectLinkCount,
    companyCounterCount,
    brandCounterCount,
  };
};

export async function getInvoicingResetPreview(): Promise<InvoicingResetPreview> {
  const scope = await getScope(prisma);

  return getPreview(prisma, scope);
}

export async function resetAllInvoicingData(userId: string) {
  return prisma.$transaction(
    async (tx) => {
      const scope = await getScope(tx);
      const preview = await getPreview(tx, scope);
      const invoiceIds = scope.invoices.map((invoice) => invoice.id);
      const paymentIds = scope.payments.map((payment) => payment.id);
      const revenueTransactionIds = scope.revenueTransactions.map((transaction) => transaction.id);
      const journalWhere = getJournalWhere(scope);
      const financialRecordWhere = getFinancialRecordWhere(scope);

      for (const invoice of scope.invoices) {
        await releaseInvoiceStockReservations(tx, {
          invoiceId: invoice.id,
          userId,
          reason: "Global invoicing reset released reserved stock",
        });
      }

      const journalEntries = journalWhere.OR?.length
        ? await tx.journalEntry.findMany({
            where: journalWhere,
            select: { id: true },
          })
        : [];
      const journalEntryIds = journalEntries.map((entry) => entry.id);

      const bankReconciliationLines = journalEntryIds.length
        ? await tx.bankReconciliationLine.updateMany({
          where: { journalEntryId: { in: journalEntryIds } },
          data: { journalEntryId: null },
        })
        : { count: 0 };

      if (journalEntryIds.length) {
        await tx.journalEntry.deleteMany({
          where: { id: { in: journalEntryIds } },
        });
      }

      if (financialRecordWhere) {
        await tx.financialRecord.deleteMany({ where: financialRecordWhere });
      }

      if (revenueTransactionIds.length) {
        await tx.revenueTransaction.deleteMany({
          where: { id: { in: revenueTransactionIds } },
        });
      }

      if (invoiceIds.length) {
        await tx.dispatchOrder.updateMany({
          where: { invoiceId: { in: invoiceIds } },
          data: { invoiceId: null },
        });

        await tx.iTProject.updateMany({
          where: { invoiceId: { in: invoiceIds } },
          data: {
            invoiceId: null,
            isBilled: false,
          },
        });
      }

      if (paymentIds.length) {
        await tx.payment.deleteMany({
          where: { id: { in: paymentIds } },
        });
      }

      if (invoiceIds.length) {
        await tx.invoice.deleteMany({
          where: { id: { in: invoiceIds } },
        });
      }

      const [companyCounters, brandCounters] = await Promise.all([
        tx.company.updateMany({ data: { invoiceNextNumber: 1 } }),
        tx.brand.updateMany({ data: { invoiceNextNumber: 1 } }),
      ]);

      await tx.auditLog.create({
        data: {
          userId,
          action: "RESET_INVOICING_DATA",
          entity: "Invoicing",
          entityId: "GLOBAL",
          changes: {
            confirmation: RESET_INVOICING_CONFIRMATION,
            deleted: {
              invoices: scope.invoices.length,
              payments: scope.payments.length,
              revenueTransactions: scope.revenueTransactions.length,
              financialRecords: preview.financialRecordCount,
              journalEntries: journalEntryIds.length,
            },
            cascaded: {
              revenueClaims: preview.revenueClaimCount,
              employeeExpenseAllocations: preview.expenseAllocationCount,
            },
            unlinked: {
              dispatchOrders: preview.dispatchOrderLinkCount,
              itProjects: preview.itProjectLinkCount,
              bankReconciliationLines: bankReconciliationLines.count,
            },
            resetCounters: {
              companies: companyCounters.count,
              brands: brandCounters.count,
            },
          },
        },
      });

      return {
        ...preview,
        journalEntryCount: journalEntryIds.length,
        companyCounterCount: companyCounters.count,
        brandCounterCount: brandCounters.count,
      };
    },
    {
      maxWait: 10_000,
      timeout: 120_000,
    },
  );
}

// Style guide accessibility compliance helper comment: aria-label placeholder label
