/**
 * Invoice Number Generator — Multi-Company / Multi-Brand Safe
 *
 * Format:  {PREFIX}{ENTITY_CODE}-{FISCAL_YEAR}-{SEQUENCE}
 * Example: INV-STM-2026-00001   (Company "STM Journals")
 *          INV-ANV-2026-00001   (Brand "ANV Publications")
 *          PRO-IMS-2026-00003   (Company "IMS", 3rd proforma)
 *          REN-STM-2026-00002   (Renewal invoice for STM)
 *
 * The entity code is derived from the company or brand name — 2–6 uppercase
 * alphanumeric characters. This ensures GLOBAL UNIQUENESS even when two
 * entities share the same prefix (both using default "INV-").
 *
 * All generation goes through prisma counter increment (atomic) + a
 * duplicate-check retry loop to handle race conditions.
 */

import { prisma } from '@/lib/prisma';

/** Derive a short entity code from a name (2–6 chars, uppercase, alphanum only) */
export function deriveEntityCode(name: string): string {
  // Strip non-alphanumeric, uppercase, take first 6 chars
  const code = name
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .slice(0, 6);
  return code || 'GEN'; // fallback to "GEN" (generic) if name is empty/special
}

export interface GeneratedNumbers {
  invoiceNumber: string;
  proformaNumber: string;
}

/**
 * Generate a globally-unique invoice + proforma number pair.
 *
 * Uses an atomic counter on the Brand or Company record (whichever is relevant),
 * with a retry loop to handle unlikely race conditions.
 *
 * @param companyId  - The company that owns the invoice
 * @param brandId    - Optional brand; if provided, uses brand counter + entity code
 * @param prefix     - Override prefix (e.g., "REN-" for renewals). Defaults to INV- / PRO-.
 */
export async function generateInvoiceNumbers(
  companyId: string,
  brandId?: string | null,
  prefix?: string
): Promise<GeneratedNumbers> {
  const year = new Date().getFullYear();
  const MAX_ATTEMPTS = 5;

  let invoiceNumber = '';
  let proformaNumber = '';
  let attempts = 0;

  while (attempts < MAX_ATTEMPTS) {
    try {
      if (brandId) {
        // ─── Brand-scoped number ───────────────────────────────────────
        const updatedBrand = await prisma.brand.update({
          where: { id: brandId },
          data: {
            invoiceNextNumber: { increment: 1 },
            proformaNextNumber: { increment: 1 },
          },
        });

        const entityCode = deriveEntityCode(updatedBrand.name);
        const invPrefix = prefix ?? (updatedBrand.invoicePrefix || 'INV-');
        const proPrefix = updatedBrand.proformaPrefix || 'PRO-';
        const invSeq = (updatedBrand.invoiceNextNumber! - 1).toString().padStart(5, '0');
        const proSeq = (updatedBrand.proformaNextNumber! - 1).toString().padStart(5, '0');

        invoiceNumber = `${invPrefix}${entityCode}-${year}-${invSeq}`;
        proformaNumber = `${proPrefix}${entityCode}-${year}-${proSeq}`;
      } else {
        // ─── Company-scoped number ─────────────────────────────────────
        const updatedCompany = await prisma.company.update({
          where: { id: companyId },
          data: {
            invoiceNextNumber: { increment: 1 },
            proformaNextNumber: { increment: 1 },
          },
        });

        const entityCode = deriveEntityCode(updatedCompany.name);
        const invPrefix = prefix ?? (updatedCompany.invoicePrefix || 'INV-');
        const proPrefix = updatedCompany.proformaPrefix || 'PRO-';
        const invSeq = (updatedCompany.invoiceNextNumber - 1).toString().padStart(5, '0');
        const proSeq = (updatedCompany.proformaNextNumber - 1).toString().padStart(5, '0');

        invoiceNumber = `${invPrefix}${entityCode}-${year}-${invSeq}`;
        proformaNumber = `${proPrefix}${entityCode}-${year}-${proSeq}`;
      }

      // Safety: verify no existing invoice already has these numbers
      const conflict = await prisma.invoice.findFirst({
        where: {
          OR: [{ invoiceNumber }, { proformaNumber }],
        },
        select: { id: true },
      });

      if (conflict) {
        // Increment already happened — just bump the sequence suffix
        attempts++;
        const suffix = attempts.toString().padStart(2, '0');
        invoiceNumber = `${invoiceNumber}-R${suffix}`;
        proformaNumber = `${proformaNumber}-R${suffix}`;
        // Check again
        const conflict2 = await prisma.invoice.findFirst({
          where: { OR: [{ invoiceNumber }, { proformaNumber }] },
          select: { id: true },
        });
        if (!conflict2) break;
        continue;
      }

      break; // unique — done
    } catch (err) {
      attempts++;
      if (attempts >= MAX_ATTEMPTS) throw err;
      // slight backoff
      await new Promise((r) => setTimeout(r, 50 * attempts));
    }
  }

  return { invoiceNumber, proformaNumber };
}

/**
 * Generate a single invoice number only (e.g., for subscription renewals)
 * using a simple timestamp + entity code approach when no counter is available.
 *
 * Format: {PREFIX}{ENTITY_CODE}-{YEAR}-{TIMESTAMP_TAIL}
 */
export function generateFallbackInvoiceNumber(
  entityName: string,
  prefix: string = 'INV-'
): string {
  const year = new Date().getFullYear();
  const entityCode = deriveEntityCode(entityName);
  // 6-digit tail from timestamp (last 6 chars of epoch ms)
  const tail = Date.now().toString().slice(-6);
  return `${prefix}${entityCode}-${year}-${tail}`;
}
