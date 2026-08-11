import { Prisma } from '@prisma/client';

/**
 * The double-entry invariants for a journal entry, as a pure function.
 *
 * Extracted from FinanceService.createJournalEntry, which imports Prisma at module scope and
 * so could not be reached from a unit test — leaving the one rule the whole ledger rests on
 * (debits equal credits) unverified.
 *
 * Arithmetic is done in Prisma.Decimal, not floats: 0.1 + 0.2 !== 0.3 in binary floating
 * point, and an entry that fails to balance by a fraction of a paisa is still a failure.
 */

export interface JournalLineInput {
    accountId: string;
    debit?: number | string | Prisma.Decimal | null;
    credit?: number | string | Prisma.Decimal | null;
    description?: string;
}

export interface PreparedJournalLine {
    accountId: string;
    description: string;
    debit: Prisma.Decimal;
    credit: Prisma.Decimal;
}

export interface PreparedJournalEntry {
    lines: PreparedJournalLine[];
    totalDebit: Prisma.Decimal;
    totalCredit: Prisma.Decimal;
}

const ZERO = () => new Prisma.Decimal(0);

/** Absent, null and empty all mean "nothing on this side of the line", not NaN. */
function toDecimal(value: JournalLineInput['debit']): Prisma.Decimal {
    if (value === undefined || value === null || value === '') return ZERO();
    return new Prisma.Decimal(value);
}

/**
 * Validate and normalise the lines of a journal entry.
 *
 * Throws — rather than returning a result — because every caller treats a failure as fatal,
 * and the messages are the ones the API already surfaces.
 */
export function prepareJournalEntry(
    lines: readonly JournalLineInput[],
    fallbackDescription: string,
): PreparedJournalEntry {
    let totalDebit = ZERO();
    let totalCredit = ZERO();

    const prepared = lines.map((line) => {
        const debit = toDecimal(line.debit);
        const credit = toDecimal(line.credit);

        // A negative debit is a credit wearing a disguise. Allowing it lets two wrong lines
        // cancel out and satisfy the balance check while leaving the ledger meaningless, so
        // reject it at the door rather than discovering it in a trial balance.
        if (debit.isNegative() || credit.isNegative()) {
            throw new Error(
                `Journal Entry cannot contain negative amounts. Use the opposite side of the entry instead.`,
            );
        }

        totalDebit = totalDebit.plus(debit);
        totalCredit = totalCredit.plus(credit);

        return {
            accountId: line.accountId,
            description: line.description || fallbackDescription,
            debit,
            credit,
        };
    });

    if (!totalDebit.equals(totalCredit)) {
        throw new Error(
            `Journal Entry is not balanced. Total Debit: ${totalDebit}, Total Credit: ${totalCredit}`,
        );
    }

    if (totalDebit.equals(0)) {
        throw new Error(`Journal Entry cannot be empty.`);
    }

    return { lines: prepared, totalDebit, totalCredit };
}
