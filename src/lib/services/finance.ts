import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export class FinanceService {
    /**
     * Create a double-entry journal entry with strict validation.
     * Ensures Total Debits = Total Credits.
     */
    static async createJournalEntry(
        companyId: string,
        data: {
            date: Date;
            description: string;
            reference?: string;
            postedBy?: string;
            lines: {
                accountId: string;
                debit?: number | Prisma.Decimal;
                credit?: number | Prisma.Decimal;
                description?: string;
            }[];
        }
    ) {
        const { date, description, reference, postedBy, lines } = data;

        // 1. Calculate totals
        let totalDebit = new Prisma.Decimal(0);
        let totalCredit = new Prisma.Decimal(0);

        const formattedLines = lines.map((line) => {
            const debit = line.debit ? new Prisma.Decimal(line.debit) : new Prisma.Decimal(0);
            const credit = line.credit ? new Prisma.Decimal(line.credit) : new Prisma.Decimal(0);

            totalDebit = totalDebit.plus(debit);
            totalCredit = totalCredit.plus(credit);

            return {
                accountId: line.accountId,
                description: line.description || description,
                debit,
                credit,
            };
        });

        // 2. Validate Balance
        if (!totalDebit.equals(totalCredit)) {
            throw new Error(
                `Journal Entry is not balanced. Total Debit: ${totalDebit}, Total Credit: ${totalCredit}`
            );
        }

        if (totalDebit.equals(0)) {
            throw new Error(`Journal Entry cannot be empty.`);
        }

        // 3. Generate Entry Number (Simple auto-increment logic or timestamp based for now)
        const count = await prisma.journalEntry.count({ where: { companyId: String(companyId) } });
        const entryNumber = `JE-${new Date().getFullYear()}-${String(count + 1).padStart(6, '0')}`;

        // 4. Create Transaction
        return await prisma.$transaction(async (tx) => {
            // Create Header
            const journalEntry = await tx.journalEntry.create({
                data: {
                    companyId: String(companyId),
                    entryNumber,
                    date,
                    description: String(description),
                    reference: reference ? String(reference) : null,
                    postedBy: postedBy ? String(postedBy) : null,
                    status: 'POSTED', // Auto-post for now
                },
            });

            // Create Lines
            await tx.journalLine.createMany({
                data: formattedLines.map((line) => ({
                    journalEntryId: journalEntry.id,
                    accountId: String(line.accountId),
                    description: String(line.description),
                    debit: line.debit,
                    credit: line.credit,
                })),
            });

            return journalEntry;
        });
    }

    /**
     * Get formatted ledger for an account
     */
    static async getAccountLedger(
        companyId: string,
        accountId: string,
        startDate?: Date,
        endDate?: Date
    ) {
        const jeFilter: Prisma.JournalEntryWhereInput = {
            status: 'POSTED'
        };

        if (startDate || endDate) {
            jeFilter.date = {};
            if (startDate) jeFilter.date.gte = startDate;
            if (endDate) jeFilter.date.lte = endDate;
        }

        const where: Prisma.JournalLineWhereInput = {
            account: {
                id: String(accountId),
                companyId: String(companyId),
            },
            journalEntry: jeFilter
        };

        const lines = await prisma.journalLine.findMany({
            where,
            include: {
                journalEntry: true,
            },
            orderBy: {
                journalEntry: {
                    date: 'asc',
                },
            },
        });

        // Calculate running balance (UI handles this usually, keeping API simple)
        const ledger = lines.map((line) => {
            return {
                ...line,
                debit: line.debit.toNumber(),
                credit: line.credit.toNumber(),
            };
        });

        return ledger;
    }

    /**
     * Get Trial Balance (Sum of all accounts)
     */
    static async getTrialBalance(companyId: string) {
        const accounts = await prisma.account.findMany({
            where: { companyId: String(companyId), isActive: true },
            include: {
                journalLines: {
                    where: { journalEntry: { status: 'POSTED' } }
                }
            }
        });

        return accounts.map((acc) => {
            let debitTotal = new Prisma.Decimal(0);
            let creditTotal = new Prisma.Decimal(0);

            acc.journalLines.forEach((line) => {
                debitTotal = debitTotal.plus(line.debit);
                creditTotal = creditTotal.plus(line.credit);
            });

            return {
                id: acc.id,
                code: acc.code,
                name: acc.name,
                type: acc.type,
                debitTotal: debitTotal.toNumber(),
                creditTotal: creditTotal.toNumber(),
                netBalance: debitTotal.minus(creditTotal).toNumber() // Debit Normal
            };
        });
    }

    // --- Automation Logic ---

    /**
     * Ensure standard accounts exist for automation
     */
    static async ensureDefaultAccounts(companyId: string) {
        const defaults = [
            { code: '1000', name: 'Bank', type: 'ASSET' },
            { code: '1200', name: 'Accounts Receivable', type: 'ASSET' },
            { code: '2000', name: 'Accounts Payable', type: 'LIABILITY' },
            { code: '2200', name: 'Tax Payable', type: 'LIABILITY' },
            { code: '3000', name: 'Retained Earnings', type: 'EQUITY' },
            { code: '4000', name: 'Sales Revenue', type: 'REVENUE' },
            { code: '5000', name: 'Cost of Goods Sold', type: 'EXPENSE' },
        ];

        for (const def of defaults) {
            const exists = await prisma.account.findFirst({
                where: { companyId: String(companyId), code: def.code }
            });
            if (!exists) {
                await prisma.account.create({
                    data: {
                        companyId: String(companyId),
                        code: def.code,
                        name: def.name,
                        type: def.type as any, // Cast to enum
                    }
                });
            }
        }
    }

    /**
     * Auto-post Invoice to Ledger
     */
    static async postInvoiceJournal(companyId: string, invoiceId: string) {
        await this.ensureDefaultAccounts(companyId);

        const invoice = await prisma.invoice.findUnique({
            where: { id: String(invoiceId) }
        });
        if (!invoice) throw new Error('Invoice not found');
        if (invoice.status === 'UNPAID') {
            // Verify if already posted? (Skip for now to keep simple, assuming one-time call)
        }

        const arAccount = await prisma.account.findFirst({ where: { companyId: String(companyId), code: '1200' } });
        const revAccount = await prisma.account.findFirst({ where: { companyId: String(companyId), code: '4000' } });
        const taxAccount = await prisma.account.findFirst({ where: { companyId: String(companyId), code: '2200' } });

        if (!arAccount || !revAccount || !taxAccount) throw new Error('Default accounts missing');

        const total = new Prisma.Decimal(invoice.total);
        const tax = new Prisma.Decimal(invoice.tax);
        const revenue = new Prisma.Decimal(invoice.amount);

        const lines = [
            { accountId: arAccount.id, debit: total, credit: 0, description: `Invoice #${invoice.invoiceNumber}` },
            { accountId: revAccount.id, debit: 0, credit: revenue, description: `Revenue - Inv #${invoice.invoiceNumber}` },
        ];

        if (tax.greaterThan(0)) { // isPositive() check alternative or > 0
            lines.push({ accountId: taxAccount.id, debit: 0, credit: tax, description: `Tax - Inv #${invoice.invoiceNumber}` });
        }

        // Note: Rounding might cause tiny mismatch if Invoice float logic was imprecise. 
        // In production, we'd add a "Rounding" line if diff < 0.05.

        await this.createJournalEntry(companyId, {
            date: new Date(),
            description: `Invoice Posting #${invoice.invoiceNumber}`,
            reference: invoice.invoiceNumber,
            lines: lines as any
        });
    }

    /**
     * Auto-post Payment to Ledger
     */
    static async postPaymentJournal(companyId: string, paymentId: string) {
        await this.ensureDefaultAccounts(companyId);

        const payment = await prisma.payment.findUnique({
            where: { id: String(paymentId) },
            include: { invoice: true }
        });
        if (!payment) throw new Error('Payment not found');

        const bankAccount = await prisma.account.findFirst({ where: { companyId: String(companyId), code: '1000' } });
        const arAccount = await prisma.account.findFirst({ where: { companyId: String(companyId), code: '1200' } }); // Crediting AR since it pays off invoice

        if (!bankAccount || !arAccount) throw new Error('Default accounts missing');

        const amount = new Prisma.Decimal(payment.amount);

        await this.createJournalEntry(companyId, {
            date: payment.paymentDate,
            description: `Payment Received ${payment.invoice ? `for #${payment.invoice.invoiceNumber}` : ''}`,
            reference: payment.transactionId || 'CASH',
            lines: [
                { accountId: bankAccount.id, debit: amount, credit: 0, description: 'Bank Deposit' },
                { accountId: arAccount.id, debit: 0, credit: amount, description: 'Payment applied to AR' }
            ]
        });
    }
}
