import { z } from 'zod';

// --- Enums and Constants ---
// Note: Matches Prisma Schema Enums where available or inferred
export const JobType = z.enum(["FULL_TIME", "PART_TIME", "CONTRACT", "INTERNSHIP"]);
export const JobStatus = z.enum(["OPEN", "CLOSED", "DRAFT"]);
export const AttendanceStatus = z.enum(["PRESENT", "ABSENT", "LEAVE", "HALF_DAY"]);
export const HolidayType = z.enum(["PUBLIC", "OPTIONAL", "COMPANY_SPECIFIC"]);
// FIXED: Match Prisma schema UserRole enum exactly
export const UserRole = z.enum([
    "SUPER_ADMIN",
    "ADMIN",
    "MANAGER",
    "TEAM_LEADER",
    "SALES_EXECUTIVE",
    "FINANCE_ADMIN",
    "CUSTOMER",
    "AGENCY",
    "EDITOR"
]);

// Helper to convert empty strings to null or undefined
const emptyToNull = (val: unknown): unknown => {
    if (val === '' || val === 'null' || val === 'undefined') return null;
    if (val === null || val === undefined) return null;
    return val;
};

const emptyToUndefined = (val: unknown): unknown => {
    if (val === '' || val === 'null' || val === 'undefined') return undefined;
    if (val === null || val === undefined) return undefined;
    return val;
};

// --- Employee Schemas ---
export const createEmployeeSchema = z.object({
    email: z.string().email("Invalid email address"),
    name: z.string().min(1, "Name is required"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    role: UserRole.default("SALES_EXECUTIVE"),
    designation: z.string().min(1, "Designation is required"),
    department: z.string().optional(),
    dateOfJoining: z.coerce.date(),
    baseSalary: z.coerce.number().min(0),
    // Optional profile fields
    phone: z.string().optional(),
    address: z.string().optional(),
    bankName: z.string().optional(),
    accountNumber: z.string().optional(),
    ifscCode: z.string().optional(),
    panNumber: z.string().optional(),
    isActive: z.boolean().optional(),
    employeeId: z.string().optional(), // Custom ID like EMP-001
});

// For updates, all fields are optional and handle empty strings
export const updateEmployeeSchema = z.object({
    // Basic fields
    role: z.preprocess(emptyToUndefined, UserRole.optional()),
    name: z.preprocess(emptyToUndefined, z.string().optional()),
    designation: z.preprocess(emptyToUndefined, z.string().optional()),
    department: z.preprocess(emptyToUndefined, z.string().optional()),
    dateOfJoining: z.preprocess(emptyToNull, z.coerce.date().nullable().optional()),
    baseSalary: z.preprocess(emptyToNull, z.coerce.number().min(0).nullable().optional()),
    phone: z.preprocess(emptyToUndefined, z.string().optional()),
    address: z.preprocess(emptyToUndefined, z.string().optional()),
    bankName: z.preprocess(emptyToUndefined, z.string().optional()),
    accountNumber: z.preprocess(emptyToUndefined, z.string().optional()),
    ifscCode: z.preprocess(emptyToUndefined, z.string().optional()),
    panNumber: z.preprocess(emptyToUndefined, z.string().optional()),
    isActive: z.preprocess(emptyToUndefined, z.boolean().optional()),
    employeeId: z.preprocess(emptyToUndefined, z.string().optional()),

    // Additional EmployeeProfile fields
    dateOfBirth: z.preprocess(emptyToNull, z.coerce.date().nullable().optional()),
    aadharNumber: z.preprocess(emptyToNull, z.string().nullable().optional()),
    uanNumber: z.preprocess(emptyToNull, z.string().nullable().optional()),
    pfNumber: z.preprocess(emptyToNull, z.string().nullable().optional()),
    esicNumber: z.preprocess(emptyToNull, z.string().nullable().optional()),
    personalEmail: z.preprocess(emptyToNull, z.string().email().nullable().optional()).or(z.literal(null)).optional(),
    officialEmail: z.preprocess(emptyToNull, z.string().email().nullable().optional()).or(z.literal(null)).optional(),
    phoneNumber: z.preprocess(emptyToNull, z.string().nullable().optional()),
    officePhone: z.preprocess(emptyToNull, z.string().nullable().optional()),
    emergencyContact: z.preprocess(emptyToNull, z.string().nullable().optional()),
    permanentAddress: z.preprocess(emptyToNull, z.string().nullable().optional()),
    bloodGroup: z.preprocess(emptyToNull, z.string().nullable().optional()),
    profilePicture: z.preprocess(emptyToNull, z.string().nullable().optional()),
    offerLetterUrl: z.preprocess(emptyToNull, z.string().nullable().optional()),
    contractUrl: z.preprocess(emptyToNull, z.string().nullable().optional()),
    jobDescription: z.preprocess(emptyToNull, z.string().nullable().optional()),
    kra: z.preprocess(emptyToNull, z.string().nullable().optional()),
    designationId: z.preprocess(emptyToNull, z.string().uuid().nullable().optional()).or(z.literal(null)).optional(),

    // Experience tracking
    totalExperienceYears: z.preprocess(emptyToNull, z.coerce.number().min(0).nullable().optional()),
    totalExperienceMonths: z.preprocess(emptyToNull, z.coerce.number().min(0).max(11).nullable().optional()),
    relevantExperienceYears: z.preprocess(emptyToNull, z.coerce.number().min(0).nullable().optional()),
    relevantExperienceMonths: z.preprocess(emptyToNull, z.coerce.number().min(0).max(11).nullable().optional()),
    qualification: z.preprocess(emptyToNull, z.string().nullable().optional()),
    educationDetails: z.preprocess(emptyToNull, z.any().nullable().optional()),
    experienceDetails: z.preprocess(emptyToNull, z.any().nullable().optional()),

    // Growth tracking
    grade: z.preprocess(emptyToNull, z.string().nullable().optional()),
    lastPromotionDate: z.preprocess(emptyToNull, z.coerce.date().nullable().optional()),
    lastIncrementDate: z.preprocess(emptyToNull, z.coerce.date().nullable().optional()),
    nextReviewDate: z.preprocess(emptyToNull, z.coerce.date().nullable().optional()),
    lastIncrementPercentage: z.preprocess(emptyToNull, z.coerce.number().nullable().optional()),

    // Leave corrections
    manualLeaveAdjustment: z.preprocess(emptyToNull, z.coerce.number().nullable().optional()),

    // ID field for updates
    id: z.preprocess(emptyToUndefined, z.string().uuid().optional()),
}).passthrough(); // Allow extra fields to pass through


// --- Holiday Schemas ---
export const holidaySchema = z.object({
    name: z.string().min(1, "Holiday name is required"),
    date: z.coerce.date(),
    type: HolidayType.default("PUBLIC"),
    description: z.string().optional(),
});

export const updateHolidaySchema = holidaySchema.partial().extend({
    id: z.string().uuid(),
});

// --- Job Posting Schemas ---
export const jobPostingSchema = z.object({
    title: z.string().min(1, "Job title is required"),
    description: z.string().min(10, "Description must be at least 10 characters"),
    requirements: z.string().optional(),
    location: z.string().optional(),
    salaryRange: z.string().optional(),
    type: JobType.default("FULL_TIME"),
    status: JobStatus.default("OPEN"),
    examQuestions: z.array(z.any()).optional(),
});

export const updateJobPostingSchema = jobPostingSchema.partial().extend({
    id: z.string().uuid(),
});

// --- Performance Review Schemas ---
export const performanceReviewSchema = z.object({
    employeeId: z.string().uuid(),
    rating: z.coerce.number().min(1).max(5),
    feedback: z.string().min(1, "Feedback is required"),
});

// --- Attendance Schemas ---
export const attendanceCorrectionSchema = z.object({
    id: z.string().uuid(), // Attendance ID to correct
    checkIn: z.coerce.date().nullable(), // Nullable allowing clearing? Or just required date? User interface sends date string or null.
    checkOut: z.coerce.date().nullable().optional(),
    status: AttendanceStatus,
});

export const manualAttendanceSchema = z.object({
    employeeId: z.string().uuid(),
    date: z.coerce.date(),
    checkIn: z.coerce.date(),
    checkOut: z.coerce.date().nullable().optional(),
    status: AttendanceStatus,
    workFrom: z.enum(["OFFICE", "HOME", "FIELD"]).default("OFFICE"),
});

export const selfServiceAttendanceSchema = z.object({
    action: z.enum(['check-in', 'check-out']),
    workFrom: z.string().optional(), // 'REMOTE', 'OFFICE', etc. Not strict enum yet as frontend might vary
    latitude: z.union([z.string(), z.number()]).optional(),
    longitude: z.union([z.string(), z.number()]).optional(),
    locationName: z.string().optional()
});

// --- Leave Request Schemas ---
export const leaveRequestSchema = z.object({
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    reason: z.string().min(1, "Reason is required"),
    type: z.enum(['CASUAL', 'SICK', 'EARNED', 'UNPAID']).default('CASUAL'),
});

export const updateLeaveRequestSchema = z.object({
    leaveId: z.string().uuid(),
    status: z.enum(['APPROVED', 'REJECTED', 'PENDING']),
});
