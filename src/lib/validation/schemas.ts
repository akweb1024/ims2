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
    type: z.enum(['INDIVIDUAL', 'INSTITUTION', 'AGENCY']),

    // Organization (optional for individuals)
    organizationName: z.string().optional(),
    designation: z.string().optional(),

    // Institution Link
    institutionId: z.string().optional(),

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
