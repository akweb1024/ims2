import { prisma } from '@/lib/prisma';
import { generateInvoiceNumbers } from '@/lib/invoice-number';
import { FinanceService } from '@/lib/services/finance';
import { logger } from '@/lib/logger';
import { hashPassword } from '@/lib/auth-legacy';
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.CONFIG_ENCRYPTION_KEY || 'your-32-character-secret-key!!';
const ALGORITHM = 'aes-256-cbc';

function decrypt(text: string): string {
  try {
    const parts = text.split(':');
    if (parts.length < 2) return text;
    const iv = Buffer.from(parts.shift()!, 'hex');
    const encryptedText = parts.join(':');
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (e) {
    console.error('Decryption failed:', e);
    return text;
  }
}

export class LMSInvoiceService {
  /**
   * Fetches dynamic LMS configuration from AppConfiguration table.
   * Falls back to environment variables if none are configured.
   */
  static async getModuleDefaults() {
    try {
      const configs = await prisma.appConfiguration.findMany({
        where: {
          category: 'LMS_MODULE',
          key: { in: ['LMS_INVOICE_COMPANY_ID', 'LMS_INVOICE_BRAND_ID'] },
          isActive: true,
        },
      });

      let companyId: string | undefined = process.env.LMS_INVOICE_COMPANY_ID;
      let brandId: string | undefined = process.env.LMS_INVOICE_BRAND_ID;

      for (const config of configs) {
        if (config.key === 'LMS_INVOICE_COMPANY_ID' && config.value) {
          companyId = decrypt(config.value);
        } else if (config.key === 'LMS_INVOICE_BRAND_ID' && config.value) {
          brandId = decrypt(config.value);
        }
      }

      return { companyId, brandId };
    } catch (error) {
      logger.error('Failed to fetch LMS module defaults', error);
      return {
        companyId: process.env.LMS_INVOICE_COMPANY_ID,
        brandId: process.env.LMS_INVOICE_BRAND_ID,
      };
    }
  }

  /**
   * Generates an invoice for an LMS participant.
   * Participant/invoice creation runs inside a transaction.
   * Finance posting runs OUTSIDE the transaction so a missing chart-of-accounts
   * doesn't roll back the invoice itself.
   */
  static async generateForParticipant(
    participantId: string,
    companyId?: string | null,
    brandId?: string | null
  ) {
    // --- PHASE 1: Create invoice in a transaction ---
    const invoice = await prisma.$transaction(async (tx) => {
      // 1. Fetch participant
      const participant = await tx.lMSParticipant.findUnique({
        where: { id: participantId },
        include: { invoices: true },
      });

      if (!participant) throw new Error('Participant not found');

      // Idempotency — skip if already invoiced
      if (participant.invoices.length > 0) {
        return participant.invoices[0];
      }

      // 2. Find or create User + CustomerProfile
      let user = await tx.user.findUnique({
        where: { email: participant.email },
        include: { customerProfile: true },
      });

      if (!user) {
        const tempPassword = await hashPassword(Math.random().toString(36).slice(-10));
        user = await tx.user.create({
          data: {
            email: participant.email,
            password: tempPassword,
            role: 'CUSTOMER' as any,
            name: participant.name,
            customerProfile: {
              create: {
                name: participant.name,
                primaryEmail: participant.email,
                primaryPhone: participant.mobileNumber || '',
                customerType: 'INDIVIDUAL',
                billingAddress: participant.address,
                city: participant.state,
                state: participant.state,
                country: participant.country || 'India',
                pincode: participant.pinCode,
                gstVatTaxId: participant.gstVatNo,
              },
            },
          },
          include: { customerProfile: true },
        });
      } else if (!user.customerProfile) {
        const profile = await tx.customerProfile.create({
          data: {
            userId: user.id,
            name: participant.name,
            primaryEmail: participant.email,
            primaryPhone: participant.mobileNumber || '',
            customerType: 'INDIVIDUAL',
            billingAddress: participant.address,
            state: participant.state,
            country: participant.country || 'India',
            pincode: participant.pinCode,
            gstVatTaxId: participant.gstVatNo,
          },
        });
        (user as any).customerProfile = profile;
      }

      const customerProfile = user.customerProfile!;

      // 3. Determine Company & Brand — payload > module settings > env variables
      const defaults = await LMSInvoiceService.getModuleDefaults();
      const targetCompanyId = companyId || defaults.companyId;
      const targetBrandId = brandId || defaults.brandId;

      if (!targetCompanyId) throw new Error('No company ID available for invoice generation. Please configure LMS_INVOICE_COMPANY_ID in Settings or Environment.');

      const company = await tx.company.findUnique({ where: { id: targetCompanyId } });
      if (!company) throw new Error(`Company ${targetCompanyId} not found`);

      // 4. Generate invoice numbers
      const { invoiceNumber, proformaNumber } = await generateInvoiceNumbers(
        targetCompanyId,
        targetBrandId || null
      );

      const isPaid =
        participant.paymentStatus?.toLowerCase() === 'success' ||
        participant.paymentStatus?.toLowerCase() === 'completed';

      const currency = (participant.otherCurrency || 'INR').toUpperCase();
      const isDomestic = currency === 'INR';

      const total = participant.payableAmount || 0;
      
      let subtotal: number;
      let taxAmount: number;
      let taxRate: number;

      if (isDomestic) {
        // Reverse calculate 18% GST for domestic payments
        taxRate = 18;
        subtotal = Number((total / 1.18).toFixed(2));
        taxAmount = Number((total - subtotal).toFixed(2));
      } else {
        // 0% GST for International / Export of Services
        taxRate = 0;
        subtotal = total;
        taxAmount = 0;
      }

      const lineItems = [
        {
          description: `Workshop Registration: ${participant.workshopTitle || 'General'}`,
          quantity: 1,
          price: subtotal,
          amount: subtotal,
          taxRate: taxRate,
        },
      ];

      // 5. Create Invoice
      const newInvoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          proformaNumber,
          companyId: targetCompanyId,
          brandId: targetBrandId || null,
          customerProfileId: customerProfile.id,
          lmsParticipantId: participant.id,
          currency: participant.otherCurrency || 'INR',
          amount: subtotal,
          tax: taxAmount,
          total,
          status: isPaid ? 'PAID' : 'UNPAID',
          dueDate: new Date(),
          paidDate: isPaid ? new Date() : null,
          description: `Invoice for ${participant.workshopTitle || 'LMS Workshop'}`,
          lineItems: lineItems as any,
          billingAddress: participant.address,
          billingCity: participant.state,
          billingState: participant.state,
          billingCountry: participant.country || 'India',
          billingPincode: participant.pinCode,
          gstNumber: participant.gstVatNo,
          brandLegalName: company.legalEntityName || company.name,
          brandAddress: company.address,
          brandEmail: company.email,
          brandWebsite: company.website,
          brandGstin: company.gstin,
          brandPan: company.panNo,
          brandCin: company.cinNo,
          brandBankName: company.bankName,
          brandBankHolder: company.bankAccountHolder,
          brandBankNumber: company.bankAccountNumber,
          brandBankIfsc: company.bankIfscCode,
          brandPaymentMode: company.paymentMode || 'Online',
        },
      });

      // 6. Payment record (inside transaction — no external dependencies)
      if (isPaid) {
        await tx.payment.create({
          data: {
            invoiceId: newInvoice.id,
            amount: total,
            paymentDate: new Date(),
            paymentMethod: 'ONLINE',
            status: 'COMPLETED',
            transactionId: participant.razorpayPaymentId || `LMS-${participant.pid}`,
            companyId: targetCompanyId,
          },
        });
      }

      logger.info('LMS Invoice created', { invoiceId: newInvoice.id, participantId: participant.id });
      return newInvoice;
    });

    // --- PHASE 2: Finance posting OUTSIDE transaction ---
    // A missing chart-of-accounts will NOT roll back the invoice.
    try {
      await FinanceService.postInvoiceJournal(invoice.companyId!, invoice.id);
      if (invoice.status === 'PAID') {
        const payment = await prisma.payment.findFirst({ where: { invoiceId: invoice.id } });
        if (payment) await FinanceService.postPaymentJournal(invoice.companyId!, payment.id);
      }
    } catch (financeError) {
      logger.error('Finance posting failed for LMS invoice (non-critical)', financeError, {
        invoiceId: invoice.id,
      });
    }

    return invoice;
  }
}
