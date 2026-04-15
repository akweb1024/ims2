import { Prisma } from '@prisma/client';
import { ValidationError } from './error-handler';

const ORGANIZATION_TYPES = new Set(['INSTITUTION', 'AGENCY', 'UNIVERSITY', 'COMPANY']);

export function buildCustomerTypeWhere(type: string | null | undefined): Prisma.CustomerProfileWhereInput | null {
    if (!type) return null;

    if (type === 'INDIVIDUAL') {
        return { customerType: 'INDIVIDUAL' };
    }

    if (type === 'ORGANIZATION') {
        return { customerType: 'ORGANIZATION' };
    }

    if (ORGANIZATION_TYPES.has(type)) {
        return {
            customerType: 'ORGANIZATION',
            organizationType: type as 'INSTITUTION' | 'AGENCY' | 'UNIVERSITY' | 'COMPANY'
        };
    }

    throw new ValidationError(`Invalid customer type filter: ${type}`);
}
