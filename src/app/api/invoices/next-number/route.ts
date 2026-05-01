import { NextRequest, NextResponse } from 'next/server';
import { authorizedRoute } from '@/lib/middleware-auth';
import { prisma } from '@/lib/prisma';
import { ValidationError, handleApiError } from '@/lib/error-handler';
import { deriveEntityCode, getInvoiceYearLabel, sanitizeEntityCode } from '@/lib/invoice-number';

export const GET = authorizedRoute(
  ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FINANCE_ADMIN'],
  async (req: NextRequest, user) => {
    try {
      const { searchParams } = new URL(req.url);
      const brandId = searchParams.get('brandId');
      const now = new Date();

      if (brandId) {
        const brand = await prisma.brand.findFirst({
          where: {
            id: brandId,
            ...(user.role === 'SUPER_ADMIN' ? {} : { companyId: user.companyId }),
          },
          select: {
            id: true,
            name: true,
            invoicePrefix: true,
            proformaPrefix: true,
            invoiceNextNumber: true,
            proformaNextNumber: true,
            invoiceEntityCode: true,
            invoiceYearFormat: true,
            company: {
              select: {
                fiscalYearStart: true,
                invoiceYearFormat: true,
              }
            }
          },
        });
        if (!brand) throw new ValidationError('Brand not found');
        const entityCode = sanitizeEntityCode(brand.invoiceEntityCode) || deriveEntityCode(brand.name || 'GEN');
        const yearLabel = getInvoiceYearLabel(
          brand.invoiceYearFormat || brand.company?.invoiceYearFormat,
          brand.company?.fiscalYearStart,
          now
        );
        const invoiceSeq = Number(brand.invoiceNextNumber || 1).toString().padStart(5, '0');
        const proformaSeq = Number(brand.proformaNextNumber || 1).toString().padStart(5, '0');
        return NextResponse.json({
          scope: 'brand',
          scopeId: brand.id,
          invoiceNumber: `${brand.invoicePrefix || 'INV-'}${entityCode}-${yearLabel}-${invoiceSeq}`,
          proformaNumber: `${brand.proformaPrefix || 'PRO-'}${entityCode}-${yearLabel}-${proformaSeq}`,
        });
      }

      const companyId = user.companyId;
      if (!companyId) throw new ValidationError('Company context missing');

      const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: {
          id: true,
          name: true,
          invoicePrefix: true,
          proformaPrefix: true,
          invoiceNextNumber: true,
          proformaNextNumber: true,
          invoiceEntityCode: true,
          invoiceYearFormat: true,
          fiscalYearStart: true,
        },
      });
      if (!company) throw new ValidationError('Company not found');

      const entityCode = sanitizeEntityCode(company.invoiceEntityCode) || deriveEntityCode(company.name || 'GEN');
      const yearLabel = getInvoiceYearLabel(company.invoiceYearFormat, company.fiscalYearStart, now);
      const invoiceSeq = Number(company.invoiceNextNumber || 1).toString().padStart(5, '0');
      const proformaSeq = Number(company.proformaNextNumber || 1).toString().padStart(5, '0');

      return NextResponse.json({
        scope: 'company',
        scopeId: company.id,
        invoiceNumber: `${company.invoicePrefix || 'INV-'}${entityCode}-${yearLabel}-${invoiceSeq}`,
        proformaNumber: `${company.proformaPrefix || 'PRO-'}${entityCode}-${yearLabel}-${proformaSeq}`,
      });
    } catch (error) {
      return handleApiError(error, req.nextUrl.pathname);
    }
  },
);
