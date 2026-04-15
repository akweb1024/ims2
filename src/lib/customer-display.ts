type CustomerLike = {
    customerType?: string | null;
    organizationType?: string | null;
};

export function formatDisplayLabel(value: string | null | undefined): string {
    if (!value) return 'Unknown';
    return value
        .replace(/_/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, c => c.toUpperCase());
}

export function getCustomerDisplayType(customer: CustomerLike): string {
    if (customer.organizationType) {
        return formatDisplayLabel(customer.organizationType);
    }

    if (customer.customerType === 'INDIVIDUAL') {
        return 'Individual';
    }

    if (customer.customerType === 'ORGANIZATION') {
        return 'Organization';
    }

    return customer.customerType || 'Unknown';
}

export function getCustomerTypeKey(customer: CustomerLike): string {
    return customer.organizationType || customer.customerType || 'UNKNOWN';
}

export function getCustomerBadgeVariant(customer: CustomerLike): 'primary' | 'success' | 'warning' | 'secondary' {
    const key = getCustomerTypeKey(customer);

    switch (key) {
        case 'INDIVIDUAL':
            return 'primary';
        case 'INSTITUTION':
        case 'UNIVERSITY':
            return 'success';
        case 'AGENCY':
        case 'COMPANY':
            return 'warning';
        case 'ORGANIZATION':
            return 'secondary';
        default:
            return 'secondary';
    }
}
