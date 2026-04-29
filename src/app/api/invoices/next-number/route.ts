import { NextRequest, NextResponse } from 'next/server';
import { authorizedRoute } from '@/lib/middleware-auth';
import { prisma } from '@/lib/prisma';
import { ValidationError, handleApiError } from '@/lib/error-handler';
import { deriveEntityCode } from '@/lib/invoice-number';

export const GET = authorizedRoute(
  ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FINANCE_ADMIN'],
  async (req: NextRequest, user) => {
    try {
      const { searchParams } = new URL(req.url);
      const brandId = searchParams.get('brandId');
      const year = new Date().getFullYear();

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
          },
        });
        if (!brand) throw new ValidationError('Brand not found');
        const entityCode = deriveEntityCode(brand.name || 'GEN');
        const invoiceSeq = Number(brand.invoiceNextNumber || 1).toString().padStart(5, '0');
        const proformaSeq = Number(brand.proformaNextNumber || 1).toString().padStart(5, '0');
        return NextResponse.json({
          scope: 'brand',
          scopeId: brand.id,
          invoiceNumber: `${brand.invoicePrefix || 'INV-'}${entityCode}-${year}-${invoiceSeq}`,
          proformaNumber: `${brand.proformaPrefix || 'PRO-'}${entityCode}-${year}-${proformaSeq}`,
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
        },
      });
      if (!company) throw new ValidationError('Company not found');

      const entityCode = deriveEntityCode(company.name || 'GEN');
      const invoiceSeq = Number(company.invoiceNextNumber || 1).toString().padStart(5, '0');
      const proformaSeq = Number(company.proformaNextNumber || 1).toString().padStart(5, '0');

      return NextResponse.json({
        scope: 'company',
        scopeId: company.id,
        invoiceNumber: `${company.invoicePrefix || 'INV-'}${entityCode}-${year}-${invoiceSeq}`,
        proformaNumber: `${company.proformaPrefix || 'PRO-'}${entityCode}-${year}-${proformaSeq}`,
      });
    } catch (error) {
      return handleApiError(error, req.nextUrl.pathname);
    }
  },
);

