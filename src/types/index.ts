import { UserRole, CustomerType, SubscriptionStatus, SalesChannel, InvoiceStatus, Priority, TaskStatus, CommunicationType } from '@prisma/client';

export { UserRole, CustomerType, SubscriptionStatus, SalesChannel, InvoiceStatus, Priority, TaskStatus, CommunicationType };

// User & Auth Types
export interface AuthUser {
    id: string;
    email: string;
    role: UserRole;
}

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface RegisterData {
    email: string;
    password: string;
    role: UserRole;
    customerType?: CustomerType;
    name: string;
    primaryPhone: string;
}

// Customer Profile Types
export interface CustomerProfileData {
    customerType: CustomerType;
    name: string;
    organizationName?: string;
    primaryEmail: string;
    secondaryEmail?: string;
    primaryPhone: string;
    secondaryPhone?: string;
    gstVatTaxId?: string;
    billingAddress?: string;
    shippingAddress?: string;
    country?: string;
    state?: string;
    city?: string;
    pincode?: string;
    preferredChannel?: string;
    notes?: string;
    tags?: string[];
}

// Institution Details Types
export interface InstitutionDetailsData {
    category: string;
    department?: string;
    libraryContact?: string;
    ipRange?: string;
    numberOfUsers?: number;
    numberOfSeats?: number;
}

// Agency Details Types
export interface AgencyDetailsData {
    companyInfo?: string;
    territory?: string;
    region?: string;
    primaryContact?: string;
    commissionTerms?: string;
}

// Journal Types
export interface JournalData {
    name: string;
    issnPrint?: string;
    issnOnline?: string;
    frequency: string;
    formatAvailable: string[];
    subjectCategory: string[];
    priceINR: number;
    priceUSD: number;
    isActive?: boolean;
}

// Plan Types
export interface PlanData {
    journalId: string;
    planType: string;
    format: string;
    institutionTier?: string;
    duration: number;
    priceINR: number;
    priceUSD: number;
    startDateRule?: string;
    gracePeriod?: number;
    isActive?: boolean;
}

// Subscription Types
export interface SubscriptionData {
    customerProfileId: string;
    salesChannel: SalesChannel;
    agencyId?: string;
    salesExecutiveId?: string;
    startDate: Date;
    endDate: Date;
    autoRenew?: boolean;
    currency: string;
    subtotal: number;
    discount?: number;
    tax?: number;
    total: number;
    status?: SubscriptionStatus;
    items: SubscriptionItemData[];
}

export interface SubscriptionItemData {
    journalId: string;
    planId: string;
    quantity?: number;
    seats?: number;
    price: number;
}

// Communication Log Types
export interface CommunicationLogData {
    customerProfileId: string;
    channel: string;
    subject: string;
    notes: string;
    outcome?: string;
    nextFollowUpDate?: Date;
    attachments?: string[];
}

// Task Types
export interface TaskData {
    title: string;
    description?: string;
    dueDate: Date;
    priority?: Priority;
    status?: TaskStatus;
    relatedCustomerId?: string;
    relatedSubscriptionId?: string;
}

// Dashboard Stats Types
export interface DashboardStats {
    totalCustomers: number;
    activeSubscriptions: number;
    monthlyRevenue: number;
    renewalsDue: number;
    channelSplit: {
        direct: number;
        agency: number;
    };
}

// API Response Types
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

// Pagination Types
export interface PaginationParams {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

// Style guide accessibility compliance helper comment: aria-label placeholder label
