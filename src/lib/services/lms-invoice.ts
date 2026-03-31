import { prisma } from '@/lib/prisma';
import { generateInvoiceNumbers } from '@/lib/invoice-number';
import { FinanceService } from '@/lib/services/finance';
import { logger } from '@/lib/logger';
import { UserRole, CustomerType } from '@/types';
import { hashPassword } from '@/lib/auth-legacy';

export class LMSInvoiceService {
  /**
   * Generates an invoice for an LMS participant.
   * If the participant doesn't have a CustomerProfile, it creates one.
   */
  static async generateForParticipant(participantId: string, companyId?: string, brandId?: string) {
    return await prisma.$transaction(async (tx) => {
      // 1. Fetch participant
      const participant = await tx.lMSParticipant.findUnique({
        where: { id: participantId },
        include: { invoices: { take: 1 } }
      });

      if (!participant) throw new Error('Participant not found');
      
      // Check if already has an invoice
      if (participant.invoices.length > 0) {
        return participant.invoices[0];
      }

      // 2. Find or Create User & CustomerProfile
      let user = await tx.user.findUnique({
        where: { email: participant.email },
        include: { customerProfile: true }
      });

      if (!user) {
        // Create a skeleton user for the participant
        // Use a random password that they can reset later
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
                city: participant.state, // Closest match in participant model
                state: participant.state,
                country: participant.country || 'India',
                pincode: participant.pinCode,
                gstVatTaxId: participant.gstVatNo,
              }
            }
          },
          include: { customerProfile: true }
        });
      } else if (!user.customerProfile) {
        // User exists but no profile (rare but possible)
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
          }
        });
        (user as any).customerProfile = profile;
      }

      const customerProfile = user.customerProfile!;

      // 3. Determine Company & Brand
      // If not provided, try to find a sensible default
      let targetCompanyId = companyId;
      if (!targetCompanyId) {
        const firstCompany = await tx.company.findFirst();
        if (!firstCompany) throw new Error('No company found in system to associate invoice with.');
        targetCompanyId = firstCompany.id;
      }

      const company = await tx.company.findUnique({ where: { id: targetCompanyId } });
      if (!company) throw new Error('Company not found');

      // 4. Generate Invoice Numbers
      const { invoiceNumber, proformaNumber } = await generateInvoiceNumbers(
        targetCompanyId,
        brandId || null
      );

      // 5. Prepare Line Items
      const lineItems = [
        {
          description: `Workshop Registration: ${participant.workshopTitle || 'General'}`,
          quantity: 1,
          price: participant.courseFee || 0,
          amount: participant.courseFee || 0,
          taxRate: 18, // Default 18% as per IMS standards
        }
      ];

      // If there is a discount/payable diff
      const discountAmount = (participant.courseFee || 0) - (participant.payableAmount || 0);

      // calculate tax components (Simplified version of calculateInvoiceTaxBreakdown for now)
      // Since we know the total payable amount, we back-calculate or just use the provided values.
      // IMS usually expects subtotal + tax = total.
      const total = participant.payableAmount || 0;
      const subtotal = total / 1.18;
      const taxAmount = total - subtotal;

      // 6. Create Invoice
      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          proformaNumber,
          companyId: targetCompanyId,
          brandId: brandId || null,
          customerProfileId: customerProfile.id,
          lmsParticipantId: participant.id,
          currency: participant.otherCurrency || 'INR',
          amount: subtotal,
          tax: taxAmount,
          total: total,
          status: (participant.paymentStatus?.toLowerCase() === 'success' || participant.paymentStatus?.toLowerCase() === 'completed') ? 'PAID' : 'UNPAID',
          dueDate: new Date(),
          paidDate: (participant.paymentStatus?.toLowerCase() === 'success' || participant.paymentStatus?.toLowerCase() === 'completed') ? new Date() : null,
          description: `Invoice for ${participant.workshopTitle}`,
          lineItems: lineItems as any,
          billingAddress: participant.address,
          billingCity: participant.state,
          billingState: participant.state,
          billingCountry: participant.country || 'India',
          billingPincode: participant.pinCode,
          gstNumber: participant.gstVatNo,
          
          // Branding Snapshots (from Company/Brand)
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
        }
      });

      // 7. Finance Posting
      try {
        await FinanceService.postInvoiceJournal(targetCompanyId, invoice.id);
        
        // If already paid, post the payment too
        if (invoice.status === 'PAID') {
           // We need to create a Payment record first
           const payment = await tx.payment.create({
             data: {
               invoiceId: invoice.id,
               amount: total,
               paymentDate: new Date(),
               paymentMethod: 'ONLINE',
               status: 'COMPLETED',
               transactionId: participant.razorpayPaymentId || `LMS-${participant.pid}`,
               companyId: targetCompanyId,
             }
           });
           await FinanceService.postPaymentJournal(targetCompanyId, payment.id);
        }
      } catch (financeError) {
        logger.error('Failed to post LMS invoice to finance', financeError, { invoiceId: invoice.id });
        // We don't rollback the whole transaction if finance posting fails, 
        // to ensure the invoice at least exists.
      }

      logger.info('LMS Invoice generated', { invoiceId: invoice.id, participantId: participant.id });
      return invoice;
    });
  }
}
