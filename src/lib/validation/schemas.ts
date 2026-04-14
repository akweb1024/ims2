import { z } from 'zod';

/**
 * Centralized Validation Schemas using Zod
 * These schemas provide consistent validation across the application
 */

// ============================================================================
// Common Field Schemas
// ============================================================================

export const emailSchema = z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address');

export const phoneSchema = z
    .string()
    .min(1, 'Phone number is required')
    .regex(/^[\d\s\-\+\(\)]+$/, 'Please enter a valid phone number')
    .min(10, 'Phone number must be at least 10 digits');

export const optionalPhoneSchema = z
    .string()
    .regex(/^[\d\s\-\+\(\)]*$/, 'Please enter a valid phone number')
    .optional()
    .or(z.literal(''));

export const urlSchema = z
    .string()
    .url('Please enter a valid URL')
    .or(z.literal(''));

export const passwordSchema = z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number');

// ============================================================================
// Authentication Schemas
// ============================================================================

export const loginSchema = z.object({
    email: emailSchema,
    password: z.string().min(1, 'Password is required'),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
});

export type RegisterFormData = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({
    email: emailSchema,
});

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
    password: passwordSchema,
    confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
});

export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

// ============================================================================
// Customer Schemas
// ============================================================================

export const customerSchema = z.object({
    // Basic Information
    name: z.string().min(2, 'Full name must be at least 2 characters'),
    email: emailSchema,
    phone: phoneSchema,
    secondaryPhone: optionalPhoneSchema,

    // Customer Type
    type: z.enum(['INDIVIDUAL', 'ORGANIZATION']),

    // Deep Organization Classification (optional for individuals)
    organizationType: z.enum(['UNIVERSITY', 'INSTITUTION', 'AGENCY', 'COMPANY']).optional().nullable(),
    governanceType: z.enum(['PRIVATE', 'GOVERNMENT']).optional().nullable(),
    universityCategory: z.enum(['STATE', 'CENTRAL', 'PRIVATE']).optional().nullable(),
    discountOffered: z.union([z.number(), z.string().transform(v => parseFloat(v) || 0)]).optional().nullable(),
    region: z.string().optional().nullable(),

    organizationName: z.string().optional().nullable(),
    designation: z.string().optional().nullable(),

    // Institutional Hierarchies
    affiliatedUniversityId: z.string().optional().nullable(),
    associatedAgencyId: z.string().optional().nullable(),
    institutionId: z.string().optional().nullable(), // Legacy constraint

    // GST / Tax Information
    gstVatTaxId: z.string().optional(),

    // Billing Address (Indian Law / Standardized Structured)
    billingAddress: z.string().optional(),
    billingCity: z.string().optional(),
    billingState: z.string().optional(),
    billingStateCode: z.string().optional(),
    billingPincode: z.string().optional(),
    billingCountry: z.string().optional().default('India'),

    // Shipping Address (Standardized / Indian GST Place of Supply compliant)
    shippingAddress: z.string().optional(),
    shippingCity: z.string().optional(),
    shippingState: z.string().optional(),
    shippingStateCode: z.string().optional(),
    shippingPincode: z.string().optional(),
    shippingCountry: z.string().optional().default('India'),
    shippingEnduserName: z.string().optional(),

    // Legacy / Convenience fields
    notes: z.string().optional(),
});




export type CustomerFormData = z.infer<typeof customerSchema>;

// ============================================================================
// User/Employee Schemas
// ============================================================================

export const userSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: emailSchema,
    phone: phoneSchema,
    role: z.enum([
        'SUPER_ADMIN',
        'ADMIN',
        'MANAGER',
        'TEAM_LEADER',
        'EXECUTIVE',
        'FINANCE_ADMIN',
        'CUSTOMER',
        'AGENCY',
        'EDITOR',
        'JOURNAL_MANAGER',
        'PLAGIARISM_CHECKER',
        'QUALITY_CHECKER',
        'EDITOR_IN_CHIEF',
        'SECTION_EDITOR',
        'REVIEWER',
        'IT_MANAGER',
        'IT_ADMIN',
        'HR'
    ]),
    departmentId: z.string().optional(),
    designationId: z.string().optional(),
    companyId: z.string().min(1, 'Company is required'),
});

export type UserFormData = z.infer<typeof userSchema>;

// ============================================================================
// Journal Schemas
// ============================================================================

export const journalSchema = z.object({
    title: z.string().min(3, 'Journal title must be at least 3 characters'),
    abbreviation: z.string().min(2, 'Abbreviation must be at least 2 characters'),
    issn: z.string()
        .regex(/^\d{4}-\d{3}[\dX]$/, 'ISSN must be in format: 1234-567X')
        .optional()
        .or(z.literal('')),
    eissn: z.string()
        .regex(/^\d{4}-\d{3}[\dX]$/, 'E-ISSN must be in format: 1234-567X')
        .optional()
        .or(z.literal('')),
    description: z.string().optional(),
    website: urlSchema.optional(),
    frequency: z.enum([
        'MONTHLY',
        'BIMONTHLY',
        'QUARTERLY',
        'BIANNUAL',
        'ANNUAL',
    ]).optional(),
    status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).default('ACTIVE'),
});

export type JournalFormData = z.infer<typeof journalSchema>;

// ============================================================================
// Invoice Schemas
// ============================================================================

export const invoiceSchema = z.object({
    customerId: z.string().min(1, 'Customer is required'),
    invoiceNumber: z.string().min(1, 'Invoice number is required'),
    invoiceDate: z.string().min(1, 'Invoice date is required'),
    dueDate: z.string().min(1, 'Due date is required'),
    items: z.array(z.object({
        description: z.string().min(1, 'Description is required'),
        quantity: z.number().min(1, 'Quantity must be at least 1'),
        unitPrice: z.number().min(0, 'Unit price must be positive'),
        amount: z.number(),
    })).min(1, 'At least one item is required'),
    subtotal: z.number(),
    tax: z.number().min(0),
    total: z.number(),
    notes: z.string().optional(),
});

export type InvoiceFormData = z.infer<typeof invoiceSchema>;

// ============================================================================
// Subscription Schemas
// ============================================================================

export const subscriptionSchema = z.object({
    customerId: z.string().min(1, 'Customer is required'),
    planId: z.string().min(1, 'Plan is required'),
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().min(1, 'End date is required'),
    status: z.enum(['ACTIVE', 'CANCELLED', 'EXPIRED', 'PENDING']).default('ACTIVE'),
    autoRenew: z.boolean().default(true),
    notes: z.string().optional(),
});

export type SubscriptionFormData = z.infer<typeof subscriptionSchema>;

// ============================================================================
// Manuscript Schemas
// ============================================================================

export const manuscriptSchema = z.object({
    title: z.string().min(5, 'Title must be at least 5 characters'),
    abstract: z.string().min(50, 'Abstract must be at least 50 characters'),
    keywords: z.string().min(1, 'At least one keyword is required'),
    journalId: z.string().min(1, 'Journal is required'),
    manuscriptType: z.enum([
        'RESEARCH_ARTICLE',
        'REVIEW_ARTICLE',
        'CASE_STUDY',
        'SHORT_COMMUNICATION',
        'LETTER',
    ]),
    authors: z.array(z.object({
        name: z.string().min(2, 'Author name is required'),
        email: emailSchema,
        affiliation: z.string().min(2, 'Affiliation is required'),
        isCorresponding: z.boolean().default(false),
    })).min(1, 'At least one author is required'),
});

export type ManuscriptFormData = z.infer<typeof manuscriptSchema>;

// ============================================================================
// Conference Schemas
// ============================================================================

export const conferenceSchema = z.object({
    title: z.string().min(5, 'Conference title must be at least 5 characters'),
    description: z.string().min(20, 'Description must be at least 20 characters'),
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().min(1, 'End date is required'),
    venue: z.string().min(3, 'Venue is required'),
    city: z.string().min(2, 'City is required'),
    country: z.string().min(2, 'Country is required'),
    website: urlSchema.optional(),
    registrationDeadline: z.string().optional(),
    abstractDeadline: z.string().optional(),
    status: z.enum(['UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED']).default('UPCOMING'),
});

export type ConferenceFormData = z.infer<typeof conferenceSchema>;

// ============================================================================
// Course Schemas
// ============================================================================

export const courseSchema = z.object({
    title: z.string().min(5, 'Course title must be at least 5 characters'),
    description: z.string().min(20, 'Description must be at least 20 characters'),
    category: z.string().min(1, 'Category is required'),
    level: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']),
    duration: z.number().min(1, 'Duration must be at least 1 hour'),
    price: z.number().min(0, 'Price must be positive'),
    thumbnail: z.string().optional(),
    status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).default('DRAFT'),
});

export type CourseFormData = z.infer<typeof courseSchema>;

// ============================================================================
// IT Module Schemas
// ============================================================================

export const itProjectSchema = z.object({
    name: z.string().min(3, 'Project name must be at least 3 characters'),
    description: z.string().optional(),
    about: z.string().optional(),
    details: z.string().optional(),
    category: z.enum(['DEVELOPMENT', 'INFRASTRUCTURE', 'SECURITY', 'SUPPORT', 'MAINTENANCE', 'UPGRADE', 'MIGRATION', 'TRAINING', 'CONSULTING', 'RESEARCH']).optional().default('DEVELOPMENT'),
    type: z.enum(['REVENUE', 'SUPPORT', 'MAINTENANCE', 'ENHANCEMENT']).optional().default('SUPPORT'),
    status: z.enum(['PLANNING', 'IN_PROGRESS', 'ON_HOLD', 'TESTING', 'COMPLETED', 'CANCELLED', 'ARCHIVED']).optional().default('PLANNING'),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
    clientId: z.string().optional().nullable(),
    clientType: z.enum(['INTERNAL', 'EXTERNAL', 'CUSTOMER']).optional().nullable(),
    projectManagerId: z.string().optional().nullable(),
    teamLeadId: z.string().optional().nullable(),
    departmentId: z.string().optional().nullable(),
    websiteId: z.string().optional().nullable(),
    startDate: z.string().optional().nullable(),
    endDate: z.string().optional().nullable(),
    estimatedHours: z.number().optional().nullable().or(z.string().optional()),
    isRevenueBased: z.boolean().optional().default(false),
    estimatedRevenue: z.number().optional().default(0).or(z.string().optional()),
    currency: z.string().optional().default('INR'),
    itDepartmentCut: z.number().optional().default(0).or(z.string().optional()),
    billingType: z.enum(['FIXED', 'HOURLY', 'MILESTONE', 'RETAINER']).optional().nullable(),
    hourlyRate: z.number().optional().nullable().or(z.string().optional()),
    tags: z.array(z.string()).optional().default([]),
    keywords: z.array(z.string()).optional().default([]),
    taggedEmployeeIds: z.array(z.string()).optional().default([]),
    visibility: z.enum(['PRIVATE', 'PUBLIC', 'INDIVIDUALS']).default('PRIVATE'),
    sharedWithIds: z.array(z.string()).optional().default([]),
    milestones: z.array(z.object({
        name: z.string(),
        description: z.string().optional(),
        dueDate: z.string().optional(),
        status: z.string().optional(),
    })).optional(),
});

export type ITProjectFormData = z.infer<typeof itProjectSchema>;

export const itTaskSchema = z.object({
    projectId: z.string().optional().nullable(),
    title: z.string().min(3, 'Task title must be at least 3 characters'),
    description: z.string().optional(),
    category: z.enum(['BUG_FIX', 'FEATURE', 'ENHANCEMENT', 'SUPPORT', 'DOCUMENTATION', 'TESTING', 'DEPLOYMENT', 'RESEARCH', 'GENERAL', 'SERVICE_REQUEST']).optional().default('GENERAL'),
    type: z.enum(['REVENUE', 'SUPPORT', 'MAINTENANCE', 'URGENT', 'SERVICE_REQUEST']).optional().default('SUPPORT'),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
    status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'UNDER_REVIEW']).optional().default('PENDING'),
    assignedToId: z.string().optional().nullable(),
    reporterId: z.string().optional().nullable(),
    startDate: z.string().optional().nullable(),
    dueDate: z.string().optional().nullable(),
    estimatedHours: z.number().optional().nullable().or(z.string().optional()),
    isRevenueBased: z.boolean().optional().default(false),
    estimatedValue: z.number().optional().default(0).or(z.string().optional()),
    currency: z.string().optional().default('INR'),
    itDepartmentCut: z.number().optional().default(0).or(z.string().optional()),
    tags: z.array(z.string()).optional().default([]),
    dependencies: z.array(z.string()).optional().default([]),
    serviceId: z.string().optional().nullable(),
    progressPercent: z.number().optional().default(0).or(z.string().optional()),
});

export type ITTaskFormData = z.infer<typeof itTaskSchema>;

// ============================================================================
// Work Plan / Agenda Schemas
// ============================================================================

export const workPlanSchema = z.object({
    employeeId: z.string().optional(),
    date: z.string().min(1, 'Date is required'),
    agenda: z.string().min(3, 'Agenda must be at least 3 characters'),
    strategy: z.string().optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
    estimatedHours: z.string().optional().or(z.number().optional()),
    linkedGoalId: z.string().optional().nullable(),
    projectId: z.string().optional().nullable(),
    taskId: z.string().optional().nullable(),
    itProjectId: z.string().optional().nullable(),
    itTaskId: z.string().optional().nullable(),
    visibility: z.enum(['SELF', 'MANAGER', 'ADMIN', 'ALL']).default('MANAGER'),
});

export type WorkPlanFormData = z.infer<typeof workPlanSchema>;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format Zod errors for display
 */
export function formatZodError(error: z.ZodError): Record<string, string> {
    const formattedErrors: Record<string, string> = {};
    error.issues.forEach((err) => {
        const path = err.path.join('.');
        formattedErrors[path] = err.message;
    });
    return formattedErrors;
}

/**
 * Validate data against a schema
 */
export function validateData<T>(schema: z.ZodSchema<T>, data: unknown): {
    success: boolean;
    data?: T;
    errors?: Record<string, string>;
} {
    const result = schema.safeParse(data);
    if (result.success) {
        return { success: true, data: result.data };
    }
    return { success: false, errors: formatZodError(result.error) };
}

// ============================================================================
// Proforma Invoice Schemas
// ============================================================================

export const proformaLineItemSchema = z.object({
    description: z.string().min(1, 'Item description is required').max(500),
    quantity: z.number().int().min(1, 'Quantity must be at least 1').max(9999),
    unitPrice: z.number().min(0, 'Unit price must be >= 0').max(99_999_999),
    total: z.number().optional(),
    journalId: z.string().uuid().optional().nullable(),
    planId: z.string().uuid().optional().nullable(),
    courseId: z.string().uuid().optional().nullable(),
    workshopId: z.string().uuid().optional().nullable(),
    productId: z.string().uuid().optional().nullable(),
});

export const PROFORMA_SALES_CHANNELS = ['DIRECT', 'AGENCY', 'ONLINE', 'REFERRAL'] as const;
export const PROFORMA_BILLING_FREQUENCIES = ['MONTHLY', 'QUARTERLY', 'ANNUAL', 'BIENNIAL'] as const;
export const PROFORMA_CURRENCIES = ['INR', 'USD', 'EUR', 'GBP'] as const;
export const PROFORMA_DISCOUNT_TYPES = ['PERCENTAGE', 'FIXED'] as const;
export const PROFORMA_PAYMENT_METHODS = ['BANK_TRANSFER', 'CHEQUE', 'ONLINE', 'CASH', 'DD', 'UPI'] as const;

export const proformaCreateSchema = z.object({
    customerProfileId: z.string().uuid('Invalid customer ID'),
    subject: z.string().max(300).optional().default('Proforma Invoice'),
    salesChannel: z.enum(PROFORMA_SALES_CHANNELS).optional().default('DIRECT'),
    agencyId: z.string().uuid().optional().nullable(),
    startDate: z.string().optional().nullable(),
    endDate: z.string().optional().nullable(),
    autoRenew: z.boolean().optional().default(false),
    currency: z.enum(PROFORMA_CURRENCIES).optional().default('INR'),
    billingFrequency: z.enum(PROFORMA_BILLING_FREQUENCIES).optional().default('ANNUAL'),
    taxRate: z.number().min(0).max(100).optional().default(18),
    discountType: z.enum(PROFORMA_DISCOUNT_TYPES).optional().nullable(),
    discountValue: z.number().min(0).optional().default(0),
    notes: z.string().max(2000).optional().nullable(),
    validUntil: z.string().optional().nullable(),
    lineItems: z.array(proformaLineItemSchema)
        .min(1, 'At least one line item is required')
        .max(50, 'Maximum 50 line items per proforma'),
    idempotencyKey: z.string().max(128).optional().nullable(),
}).refine(
    (data) => {
        if (data.discountType === 'PERCENTAGE' && (data.discountValue || 0) > 100) return false;
        return true;
    },
    { message: 'Percentage discount cannot exceed 100%', path: ['discountValue'] }
);

export const proformaUpdateSchema = z.object({
    subject: z.string().max(300).optional(),
    salesChannel: z.enum(PROFORMA_SALES_CHANNELS).optional(),
    agencyId: z.string().uuid().optional().nullable(),
    startDate: z.string().optional().nullable(),
    endDate: z.string().optional().nullable(),
    autoRenew: z.boolean().optional(),
    currency: z.enum(PROFORMA_CURRENCIES).optional(),
    billingFrequency: z.enum(PROFORMA_BILLING_FREQUENCIES).optional(),
    taxRate: z.number().min(0).max(100).optional(),
    discountType: z.enum(PROFORMA_DISCOUNT_TYPES).optional().nullable(),
    discountValue: z.number().min(0).optional(),
    notes: z.string().max(2000).optional().nullable(),
    validUntil: z.string().optional().nullable(),
    lineItems: z.array(proformaLineItemSchema).min(1).max(50).optional(),
});

export const proformaStatusSchema = z.object({
    toStatus: z.enum(['DRAFT', 'PAYMENT_PENDING', 'CANCELLED']).refine(
        (v) => ['DRAFT', 'PAYMENT_PENDING', 'CANCELLED'].includes(v),
        { message: 'toStatus must be DRAFT, PAYMENT_PENDING, or CANCELLED' }
    ),
    reason: z.string().max(500).optional().nullable(),
});

export const proformaConvertSchema = z.object({
    paymentAmount: z.number().positive('Payment amount must be positive'),
    paymentMethod: z.enum(PROFORMA_PAYMENT_METHODS).optional().default('BANK_TRANSFER'),
    paymentReference: z.string().max(200).optional().nullable(),
    paymentDate: z.string().optional().nullable(),
    startDate: z.string().optional().nullable(),
    endDate: z.string().optional().nullable(),
    notes: z.string().max(1000).optional().nullable(),
});

