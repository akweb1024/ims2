-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "InvoiceProductType" AS ENUM ('SIMPLE', 'VARIABLE');

-- CreateEnum
CREATE TYPE "InvoiceProductCategory" AS ENUM ('JOURNAL_SUBSCRIPTION', 'COURSE', 'WORKSHOP', 'DOI_SERVICE', 'APC', 'CERTIFICATE', 'DIGITAL_SERVICE', 'REINSTE', 'MISC');

-- CreateEnum
CREATE TYPE "PricingModel" AS ENUM ('FIXED', 'TIERED', 'VOLUME', 'CUSTOM');

-- CreateEnum
CREATE TYPE "TaskCalculationType" AS ENUM ('FLAT', 'SCALED', 'RANGE');

-- CreateEnum
CREATE TYPE "TaskFrequency" AS ENUM ('DAILY', 'MONTHLY', 'QUARTERLY');

-- CreateEnum
CREATE TYPE "TaskTargetUnit" AS ENUM ('COUNT', 'POINTS');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER', 'EXECUTIVE', 'FINANCE_ADMIN', 'CUSTOMER', 'AGENCY', 'EDITOR', 'JOURNAL_MANAGER', 'PLAGIARISM_CHECKER', 'QUALITY_CHECKER', 'EDITOR_IN_CHIEF', 'SECTION_EDITOR', 'REVIEWER', 'IT_MANAGER', 'IT_ADMIN', 'HR', 'HR_MANAGER');

-- CreateEnum
CREATE TYPE "CustomerType" AS ENUM ('INDIVIDUAL', 'ORGANIZATION');

-- CreateEnum
CREATE TYPE "GovernanceType" AS ENUM ('PRIVATE', 'GOVERNMENT');

-- CreateEnum
CREATE TYPE "OrganizationType" AS ENUM ('UNIVERSITY', 'INSTITUTION', 'AGENCY', 'COMPANY');

-- CreateEnum
CREATE TYPE "KnowledgeArticleStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL_SENT', 'NEGOTIATION', 'CONVERTED', 'LOST');

-- CreateEnum
CREATE TYPE "DealStage" AS ENUM ('DISCOVERY', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST');

-- CreateEnum
CREATE TYPE "InstitutionType" AS ENUM ('UNIVERSITY', 'COLLEGE', 'SCHOOL', 'RESEARCH_INSTITUTE', 'CORPORATE', 'LIBRARY', 'GOVERNMENT', 'HOSPITAL', 'NGO', 'AGENCY', 'OTHER');

-- CreateEnum
CREATE TYPE "UniversityCategory" AS ENUM ('CENTRAL_UNIVERSITY', 'STATE_UNIVERSITY', 'GOVERNMENT_UNIVERSITY', 'DEEMED_UNIVERSITY', 'PRIVATE_UNIVERSITY');

-- CreateEnum
CREATE TYPE "CustomerDesignation" AS ENUM ('STUDENT', 'TEACHER', 'FACULTY', 'HOD', 'PRINCIPAL', 'DEAN', 'RESEARCHER', 'LIBRARIAN', 'ACCOUNTANT', 'DIRECTOR', 'REGISTRAR', 'VICE_CHANCELLOR', 'CHANCELLOR', 'STAFF', 'OTHER');

-- CreateEnum
CREATE TYPE "SalesChannel" AS ENUM ('DIRECT', 'AGENCY');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('REQUESTED', 'ACTIVE', 'PENDING_PAYMENT', 'EXPIRED', 'CANCELLED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('PAID', 'UNPAID', 'PARTIALLY_PAID', 'OVERDUE', 'CANCELLED', 'VOID');

-- CreateEnum
CREATE TYPE "ProformaStatus" AS ENUM ('DRAFT', 'PAYMENT_PENDING', 'CONVERTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CommunicationType" AS ENUM ('EMAIL', 'CALL', 'COMMENT', 'INQUIRY', 'INVOICE_SENT', 'CATALOGUE_SENT', 'MEETING');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'UNDER_REVIEW');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "DispatchStatus" AS ENUM ('PENDING', 'PROCESSING', 'READY_TO_SHIP', 'SHIPPED', 'IN_TRANSIT', 'DELIVERED', 'RETURNED', 'LOST');

-- CreateEnum
CREATE TYPE "FulfillmentType" AS ENUM ('PRINT', 'DIGITAL');

-- CreateEnum
CREATE TYPE "IssueStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "APCType" AS ENUM ('OPEN_ACCESS', 'RAPID', 'WOS', 'OTHER');

-- CreateEnum
CREATE TYPE "ArticleStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'REVISION_REQUESTED', 'ACCEPTED', 'REJECTED', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "FinancialType" AS ENUM ('REVENUE', 'EXPENSE');

-- CreateEnum
CREATE TYPE "ThinkTankIdeaCategory" AS ENUM ('PUBLICATION', 'MARKETING', 'SALES', 'ELEARNING', 'CHEMICAL', 'SFT_APPS', 'GLOBAL', 'OTHER', 'ACCOUNTS');

-- CreateEnum
CREATE TYPE "ThinkTankIdeaStatus" AS ENUM ('DRAFT', 'ACTIVE', 'LOCKED', 'REVEALED', 'MERGED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ThinkTankVoteState" AS ENUM ('LIKE', 'UNLIKE', 'NEUTRAL');

-- CreateEnum
CREATE TYPE "ThinkTankParticipantRole" AS ENUM ('PLANNER', 'MERGED_PARTNER', 'SELF_OPTED', 'CO_OPTED');

-- CreateEnum
CREATE TYPE "ThinkTankCycleStatus" AS ENUM ('ACTIVE', 'LOCKED', 'REVEALED');

-- CreateEnum
CREATE TYPE "ThinkTankDuplicateDecision" AS ENUM ('MERGE', 'PROCEED_AS_UNIQUE', 'PENDING_REVIEW');

-- CreateEnum
CREATE TYPE "ProblemSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ProblemStatus" AS ENUM ('SUBMITTED', 'ACKNOWLEDGED', 'NEEDS_INFO', 'IN_REVIEW', 'IN_PROGRESS', 'ESCALATED', 'RESOLVED', 'CLOSED', 'REOPENED', 'MERGED');

-- CreateEnum
CREATE TYPE "ProblemVisibility" AS ENUM ('NAMED', 'ANONYMOUS_TO_PEERS', 'RESTRICTED_ANONYMOUS');

-- CreateEnum
CREATE TYPE "ProblemRecurrence" AS ENUM ('ONE_TIME', 'RECURRING', 'ALWAYS_HAPPENING');

-- CreateEnum
CREATE TYPE "ProblemImpactType" AS ENUM ('PERSONAL_BLOCKER', 'TEAM_BLOCKER', 'CUSTOMER_ISSUE', 'REVENUE_ISSUE', 'COMPLIANCE_RISK', 'SYSTEM_APP_ISSUE', 'OTHER');

-- CreateEnum
CREATE TYPE "EmployeeType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'GIG_WORKIE', 'FREELANCE', 'INTERN', 'TRAINEE');

-- CreateEnum
CREATE TYPE "GoalType" AS ENUM ('MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "RewardType" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT');

-- CreateEnum
CREATE TYPE "CertificateType" AS ENUM ('COURSE_COMPLETION', 'REVIEWER', 'EDITOR', 'AUTHOR', 'BEST_PAPER', 'CONFERENCE_PARTICIPATION');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'SUBMITTED', 'VALIDATED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ReviewPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "Recommendation" AS ENUM ('ACCEPT', 'MINOR_REVISION', 'MAJOR_REVISION', 'REJECT', 'REJECT_RESUBMIT');

-- CreateEnum
CREATE TYPE "ConfigCategory" AS ENUM ('AWS', 'WHATSAPP', 'AI_MODELS', 'PAYMENT_GATEWAY', 'EMAIL_SERVICE', 'SMS_SERVICE', 'CLOUD_STORAGE', 'ANALYTICS', 'SOCIAL_MEDIA', 'OTHER');

-- CreateEnum
CREATE TYPE "ManuscriptStatus" AS ENUM ('SUBMITTED', 'INITIAL_REVIEW', 'PLAGIARISM_CHECK', 'UNDER_REVIEW', 'QUALITY_CHECK', 'REVISION_REQUIRED', 'REVISED_SUBMITTED', 'ACCEPTED', 'REJECTED', 'PUBLISHED', 'WITHDRAWN', 'COPYRIGHT_CHECK', 'FORMATTING', 'GALLEY_PROOF');

-- CreateEnum
CREATE TYPE "PlagiarismStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'PASSED', 'FAILED', 'REQUIRES_REVISION');

-- CreateEnum
CREATE TYPE "QualityStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'APPROVED', 'REJECTED', 'REQUIRES_FORMATTING');

-- CreateEnum
CREATE TYPE "EditorialRole" AS ENUM ('EDITOR_IN_CHIEF', 'MANAGING_EDITOR', 'ASSOCIATE_EDITOR', 'SECTION_EDITOR', 'GUEST_EDITOR', 'REVIEWER', 'EDITORIAL_ASSISTANT', 'ADVISORY_BOARD');

-- CreateEnum
CREATE TYPE "ProjectCategory" AS ENUM ('DEVELOPMENT', 'INFRASTRUCTURE', 'SECURITY', 'SUPPORT', 'MAINTENANCE', 'UPGRADE', 'MIGRATION', 'TRAINING', 'CONSULTING', 'RESEARCH');

-- CreateEnum
CREATE TYPE "ProjectType" AS ENUM ('REVENUE', 'SUPPORT', 'MAINTENANCE', 'ENHANCEMENT');

-- CreateEnum
CREATE TYPE "RevenueType" AS ENUM ('NEW', 'RENEWAL');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('PLANNING', 'IN_PROGRESS', 'ON_HOLD', 'TESTING', 'COMPLETED', 'CANCELLED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ClientType" AS ENUM ('INTERNAL', 'EXTERNAL', 'CUSTOMER');

-- CreateEnum
CREATE TYPE "BillingType" AS ENUM ('FIXED', 'HOURLY', 'MILESTONE', 'RETAINER');

-- CreateEnum
CREATE TYPE "TaskCategory" AS ENUM ('BUG_FIX', 'FEATURE', 'ENHANCEMENT', 'SUPPORT', 'DOCUMENTATION', 'TESTING', 'DEPLOYMENT', 'RESEARCH', 'GENERAL', 'SERVICE_REQUEST');

-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('REVENUE', 'SUPPORT', 'MAINTENANCE', 'URGENT', 'SERVICE_REQUEST');

-- CreateEnum
CREATE TYPE "RevenueStatus" AS ENUM ('PENDING', 'VERIFIED', 'DISPUTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('UNVERIFIED', 'VERIFIED', 'REJECTED', 'NEEDS_PROOF');

-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'DUPLICATE');

-- CreateEnum
CREATE TYPE "CommissionPayoutStatus" AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE');

-- CreateEnum
CREATE TYPE "ReviewType" AS ENUM ('MONTHLY', 'QUARTERLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "ProjectVisibility" AS ENUM ('PRIVATE', 'PUBLIC', 'INDIVIDUALS');

-- CreateEnum
CREATE TYPE "SuggestionStatus" AS ENUM ('PENDING', 'RESOLVED', 'FAILED', 'HOLD');

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "registrationNumber" TEXT,
    "domain" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "logoUrl" TEXT,
    "fiscalYearStart" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "employeeIdPrefix" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "bankAccountHolder" TEXT,
    "bankAccountNumber" TEXT,
    "bankIfscCode" TEXT,
    "bankName" TEXT,
    "bankSwiftCode" TEXT,
    "cinNo" TEXT,
    "gstin" TEXT,
    "iecCode" TEXT,
    "legalEntityName" TEXT,
    "panNo" TEXT,
    "paymentMode" TEXT,
    "stateCode" TEXT,
    "tagline" TEXT,
    "brandRelationType" TEXT DEFAULT 'A Brand of',
    "invoiceCompanyLogoUrl" TEXT,
    "universityId" TEXT,
    "invoiceTerms" TEXT,
    "regdOfficeAddress" TEXT,
    "salesOfficeAddress" TEXT,
    "invoiceNextNumber" INTEGER NOT NULL DEFAULT 1,
    "invoicePrefix" TEXT DEFAULT 'INV-',
    "invoiceEntityCode" TEXT,
    "invoiceYearFormat" TEXT DEFAULT 'CALENDAR',
    "proformaNextNumber" INTEGER NOT NULL DEFAULT 1,
    "proformaPrefix" TEXT DEFAULT 'PRO-',

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyIntegration" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationJob" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "key" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT,
    "icon" TEXT,
    "color" TEXT,
    "scheduleLabel" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "requiresCronKey" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutomationJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationRun" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "companyId" TEXT,
    "triggeredBy" TEXT,
    "status" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "message" TEXT,
    "stats" JSONB,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AutomationRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT,
    "parentDepartmentId" TEXT,
    "headUserId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'EXECUTIVE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "lastLogin" TIMESTAMP(3),
    "theme" TEXT NOT NULL DEFAULT 'light',
    "notificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "companyId" TEXT,
    "departmentId" TEXT,
    "managerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT,
    "signatureUrl" TEXT,
    "allowedModules" TEXT[] DEFAULT ARRAY['CORE']::TEXT[],
    "roles" "UserRole"[] DEFAULT ARRAY['EXECUTIVE']::"UserRole"[],

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamMember" (
    "id" TEXT NOT NULL,
    "managerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "role" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "targetRole" TEXT NOT NULL DEFAULT 'ALL',
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeArticle" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "targetRole" TEXT NOT NULL DEFAULT 'ALL',
    "authorId" TEXT NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastEditedBy" TEXT,
    "publishedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "status" "KnowledgeArticleStatus" NOT NULL DEFAULT 'PUBLISHED',
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "KnowledgeArticle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeArticleRevision" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "editorId" TEXT,
    "version" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "targetRole" TEXT NOT NULL,
    "status" "KnowledgeArticleStatus" NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KnowledgeArticleRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "customerType" "CustomerType" NOT NULL DEFAULT 'INDIVIDUAL',
    "governanceType" "GovernanceType",
    "organizationType" "OrganizationType",
    "universityCategory" "UniversityCategory",
    "affiliatedUniversityId" TEXT,
    "associatedAgencyId" TEXT,
    "discountOffered" DOUBLE PRECISION DEFAULT 10,
    "region" TEXT,
    "assignedToUserId" TEXT,
    "name" TEXT NOT NULL,
    "organizationName" TEXT,
    "primaryEmail" TEXT NOT NULL,
    "secondaryEmail" TEXT,
    "primaryPhone" TEXT NOT NULL,
    "secondaryPhone" TEXT,
    "gstVatTaxId" TEXT,
    "billingAddress" TEXT,
    "shippingAddress" TEXT,
    "country" TEXT,
    "state" TEXT,
    "city" TEXT,
    "pincode" TEXT,
    "preferredChannel" TEXT,
    "notes" TEXT,
    "tags" TEXT,
    "leadStatus" "LeadStatus" DEFAULT 'NEW',
    "leadScore" INTEGER DEFAULT 0,
    "source" TEXT DEFAULT 'DIRECT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "companyId" TEXT,
    "designation" TEXT,
    "institutionId" TEXT,
    "billingCity" TEXT,
    "billingCountry" TEXT DEFAULT 'India',
    "billingPincode" TEXT,
    "billingState" TEXT,
    "billingStateCode" TEXT,
    "shippingCity" TEXT,
    "shippingCountry" TEXT DEFAULT 'India',
    "shippingPincode" TEXT,
    "shippingState" TEXT,
    "shippingStateCode" TEXT,
    "shippingEnduserName" TEXT,
    "zoneCode" TEXT,
    "agencyId" TEXT,

    CONSTRAINT "CustomerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommissionPayout" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "agencyProfileId" TEXT NOT NULL,
    "requestedByUserId" TEXT NOT NULL,
    "reviewedByUserId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "CommissionPayoutStatus" NOT NULL DEFAULT 'REQUESTED',
    "method" TEXT DEFAULT 'Bank Transfer',
    "notes" TEXT,
    "paymentReference" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommissionPayout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstitutionDetails" (
    "id" TEXT NOT NULL,
    "customerProfileId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "department" TEXT,
    "libraryContact" TEXT,
    "ipRange" TEXT,
    "numberOfUsers" INTEGER,
    "numberOfSeats" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstitutionDetails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgencyDetails" (
    "id" TEXT NOT NULL,
    "customerProfileId" TEXT NOT NULL,
    "companyInfo" TEXT,
    "territory" TEXT,
    "region" TEXT,
    "primaryContact" TEXT,
    "commissionTerms" TEXT,
    "yearsOfExperience" INTEGER,
    "workingRegions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "institutionTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "agreementSigned" BOOLEAN NOT NULL DEFAULT false,
    "gstNumber" TEXT,
    "hasPaymentDisputes" BOOLEAN NOT NULL DEFAULT false,
    "creditLimit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "riskFlag" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "discountRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discountTier" TEXT DEFAULT 'GOLD',
    "tierMetadata" JSONB,

    CONSTRAINT "AgencyDetails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgencyPerformance" (
    "id" TEXT NOT NULL,
    "agencyDetailsId" TEXT NOT NULL,
    "businessLastYear" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "targetCurrentYear" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgOrdersPerMonth" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "category" TEXT NOT NULL DEFAULT 'MODERATE',
    "strategicFitScore" INTEGER NOT NULL DEFAULT 0,
    "managementRecommendation" TEXT NOT NULL DEFAULT 'MAINTAIN',
    "profileCompletion" INTEGER NOT NULL DEFAULT 0,
    "renewalSuccessRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastAuditDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgencyPerformance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Institution" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "InstitutionType" NOT NULL,
    "category" TEXT,
    "establishedYear" INTEGER,
    "accreditation" TEXT,
    "primaryEmail" TEXT,
    "secondaryEmail" TEXT,
    "primaryPhone" TEXT,
    "secondaryPhone" TEXT,
    "website" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT NOT NULL DEFAULT 'India',
    "zoneCode" TEXT,
    "pincode" TEXT,
    "billingAddress" TEXT,
    "billingCity" TEXT,
    "billingState" TEXT,
    "billingCountry" TEXT DEFAULT 'India',
    "billingPincode" TEXT,
    "shippingAddress" TEXT,
    "shippingCity" TEXT,
    "shippingState" TEXT,
    "shippingCountry" TEXT DEFAULT 'India',
    "shippingPincode" TEXT,
    "totalStudents" INTEGER,
    "totalFaculty" INTEGER,
    "totalStaff" INTEGER,
    "libraryBudget" DOUBLE PRECISION,
    "ipRange" TEXT,
    "notes" TEXT,
    "logo" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "companyId" TEXT,
    "assignedToUserId" TEXT,
    "domain" TEXT,
    "agencyId" TEXT,
    "universityId" TEXT,
    "universityCategory" "UniversityCategory",

    CONSTRAINT "Institution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerAssignment" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedBy" TEXT,
    "role" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,

    CONSTRAINT "CustomerAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Journal" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "issnPrint" TEXT,
    "issnOnline" TEXT,
    "frequency" TEXT NOT NULL,
    "formatAvailable" TEXT,
    "subjectCategory" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priceINR" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "priceUSD" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "apcOpenAccessINR" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "apcOpenAccessUSD" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "apcOtherINR" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "apcOtherUSD" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "apcRapidINR" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "apcRapidUSD" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "apcWoSINR" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "apcWoSUSD" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "editorId" TEXT,
    "citationScore" INTEGER,
    "domainId" TEXT,
    "hIndex" INTEGER,
    "impactFactor" DOUBLE PRECISION,
    "journalManagerId" TEXT,
    "publisherId" TEXT,
    "abbreviation" TEXT,
    "frequencyTrack" TEXT DEFAULT 'TRACK_A',
    "subscriptionYear" INTEGER,

    CONSTRAINT "Journal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "journalId" TEXT NOT NULL,
    "planType" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "institutionTier" TEXT,
    "duration" INTEGER NOT NULL,
    "priceINR" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "priceUSD" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "startDateRule" TEXT,
    "gracePeriod" INTEGER NOT NULL DEFAULT 30,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "issue" TEXT,
    "subscriptionYear" INTEGER,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceProduct" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "sku" TEXT,
    "name" TEXT NOT NULL,
    "category" "InvoiceProductCategory" NOT NULL DEFAULT 'MISC',
    "pricingModel" "PricingModel" NOT NULL DEFAULT 'FIXED',
    "description" TEXT,
    "shortDesc" TEXT,
    "priceINR" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "priceUSD" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "priceTiers" JSONB,
    "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 18,
    "taxIncluded" BOOLEAN NOT NULL DEFAULT false,
    "hsnCode" TEXT,
    "sacCode" TEXT,
    "billingCycle" TEXT,
    "unit" TEXT NOT NULL DEFAULT 'unit',
    "minQuantity" INTEGER NOT NULL DEFAULT 1,
    "maxQuantity" INTEGER,
    "journalId" TEXT,
    "courseId" TEXT,
    "workshopId" TEXT,
    "certificateId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "productAttributes" JSONB,
    "basePrice" DOUBLE PRECISION,
    "type" "InvoiceProductType" NOT NULL DEFAULT 'SIMPLE',
    "domain" TEXT,

    CONSTRAINT "InvoiceProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductAttribute" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "productId" TEXT NOT NULL,

    CONSTRAINT "ProductAttribute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductAttributeValue" (
    "id" TEXT NOT NULL,
    "attributeId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductAttributeValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductVariant" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sku" TEXT,
    "priceINR" DOUBLE PRECISION,
    "priceUSD" DOUBLE PRECISION,
    "stockQuantity" INTEGER,
    "manageStock" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "imageUrl" TEXT,
    "attributes" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VariantAttributeMapping" (
    "variantId" TEXT NOT NULL,
    "attributeValueId" TEXT NOT NULL,

    CONSTRAINT "VariantAttributeMapping_pkey" PRIMARY KEY ("variantId","attributeValueId")
);

-- CreateTable
CREATE TABLE "ProductPricingTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "InvoiceProductCategory" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductPricingTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingTemplateVariant" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priceINR" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "priceUSD" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "year" INTEGER,
    "duration" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricingTemplateVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProformaInvoice" (
    "id" TEXT NOT NULL,
    "proformaNumber" TEXT NOT NULL,
    "customerProfileId" TEXT NOT NULL,
    "companyId" TEXT,
    "brandId" TEXT,
    "status" "ProformaStatus" NOT NULL DEFAULT 'DRAFT',
    "salesChannel" TEXT NOT NULL DEFAULT 'DIRECT',
    "agencyId" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "autoRenew" BOOLEAN NOT NULL DEFAULT false,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "billingFrequency" TEXT NOT NULL DEFAULT 'ANNUAL',
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discountType" TEXT,
    "discountValue" DOUBLE PRECISION DEFAULT 0,
    "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 18,
    "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cgst" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sgst" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "igst" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cgstRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sgstRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "igstRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "placeOfSupply" TEXT,
    "placeOfSupplyCode" TEXT,
    "companyStateCode" TEXT,
    "lineItems" JSONB,
    "notes" TEXT,
    "validUntil" TIMESTAMP(3),
    "subject" TEXT DEFAULT 'Proforma Invoice',
    "idempotencyKey" TEXT,
    "convertedInvoiceId" TEXT,
    "convertedSubId" TEXT,
    "convertedAt" TIMESTAMP(3),
    "convertedByUserId" TEXT,
    "billingAddress" TEXT,
    "billingCity" TEXT,
    "billingState" TEXT,
    "billingStateCode" TEXT,
    "billingPincode" TEXT,
    "billingCountry" TEXT DEFAULT 'India',
    "createdByUserId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "deletedByUserId" TEXT,
    "deleteReason" TEXT,

    CONSTRAINT "ProformaInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProformaAuditEvent" (
    "id" TEXT NOT NULL,
    "proformaId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "actorEmail" TEXT,
    "fromStatus" "ProformaStatus",
    "toStatus" "ProformaStatus" NOT NULL,
    "action" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProformaAuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "customerProfileId" TEXT NOT NULL,
    "salesChannel" "SalesChannel" NOT NULL,
    "agencyId" TEXT,
    "salesExecutiveId" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "autoRenew" BOOLEAN NOT NULL DEFAULT false,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "subtotal" DOUBLE PRECISION NOT NULL,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tax" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL,
    "invoiceReference" TEXT,
    "parentSubscriptionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "companyId" TEXT,
    "institutionId" TEXT,
    "subtotalInINR" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "subtotalInUSD" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalInINR" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalInUSD" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionItem" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "journalId" TEXT,
    "planId" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "seats" INTEGER,
    "price" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "courseId" TEXT,
    "productId" TEXT,
    "workshopId" TEXT,
    "invoiceProductId" TEXT,

    CONSTRAINT "SubscriptionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "invoiceNumber" TEXT NOT NULL,
    "purchaseOrderNumber" TEXT,
    "invoiceDate" TIMESTAMP(3),
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "amount" DOUBLE PRECISION NOT NULL,
    "tax" DOUBLE PRECISION NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'UNPAID',
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paidDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "companyId" TEXT,
    "customerProfileId" TEXT,
    "description" TEXT,
    "lineItems" JSONB,
    "billingAddress" TEXT,
    "billingCity" TEXT,
    "billingCountry" TEXT DEFAULT 'India',
    "billingPincode" TEXT,
    "billingState" TEXT,
    "billingStateCode" TEXT,
    "gstNumber" TEXT,
    "placeOfSupply" TEXT,
    "placeOfSupplyCode" TEXT,
    "shippingAddress" TEXT,
    "shippingCity" TEXT,
    "shippingCountry" TEXT DEFAULT 'India',
    "shippingPincode" TEXT,
    "shippingState" TEXT,
    "shippingStateCode" TEXT,
    "taxRate" DOUBLE PRECISION DEFAULT 18.0,
    "brandId" TEXT,
    "couponCode" TEXT,
    "couponId" TEXT,
    "discountAmount" DOUBLE PRECISION DEFAULT 0,
    "discountType" TEXT,
    "discountValue" DOUBLE PRECISION DEFAULT 0,
    "brandAddress" TEXT,
    "brandCompanyLogoUrl" TEXT,
    "brandLogoUrl" TEXT,
    "brandRelationType" TEXT DEFAULT 'A Brand of',
    "cgst" DOUBLE PRECISION DEFAULT 0,
    "cgstRate" DOUBLE PRECISION DEFAULT 0,
    "companyStateCode" TEXT,
    "igst" DOUBLE PRECISION DEFAULT 0,
    "igstRate" DOUBLE PRECISION DEFAULT 0,
    "invoiceBrandEmail" TEXT,
    "invoiceBrandWebsite" TEXT,
    "sgst" DOUBLE PRECISION DEFAULT 0,
    "sgstRate" DOUBLE PRECISION DEFAULT 0,
    "brandBankHolder" TEXT,
    "brandBankIfsc" TEXT,
    "brandBankName" TEXT,
    "brandBankNumber" TEXT,
    "brandBankSwift" TEXT,
    "brandCin" TEXT,
    "brandGstin" TEXT,
    "brandIec" TEXT,
    "brandLegalName" TEXT,
    "brandPan" TEXT,
    "brandPaymentMode" TEXT,
    "brandTagline" TEXT,
    "brandInvoiceTerms" TEXT,
    "brandRegdOfficeAddress" TEXT,
    "brandSalesOfficeAddress" TEXT,
    "proformaNumber" TEXT,
    "lmsParticipantId" TEXT,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Coupon" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "discountType" TEXT NOT NULL,
    "discountValue" DOUBLE PRECISION NOT NULL,
    "minOrderValue" DOUBLE PRECISION DEFAULT 0,
    "maxDiscountCap" DOUBLE PRECISION,
    "usageLimit" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "companyId" TEXT NOT NULL,
    "brandId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Brand" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "logoUrl" TEXT,
    "companyLogoUrl" TEXT,
    "description" TEXT,
    "address" TEXT,
    "email" TEXT,
    "website" TEXT,
    "tagline" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "brandRelationType" TEXT DEFAULT 'A Brand of',
    "bankAccountHolder" TEXT,
    "bankAccountNumber" TEXT,
    "bankIfscCode" TEXT,
    "bankName" TEXT,
    "bankSwiftCode" TEXT,
    "cinNo" TEXT,
    "gstin" TEXT,
    "iecCode" TEXT,
    "legalEntityName" TEXT,
    "panNo" TEXT,
    "paymentMode" TEXT DEFAULT 'Online',
    "invoiceTerms" TEXT,
    "regdOfficeAddress" TEXT,
    "salesOfficeAddress" TEXT,
    "invoiceNextNumber" INTEGER DEFAULT 1,
    "invoicePrefix" TEXT DEFAULT 'INV-',
    "invoiceEntityCode" TEXT,
    "invoiceYearFormat" TEXT DEFAULT 'CALENDAR',
    "proformaNextNumber" INTEGER DEFAULT 1,
    "proformaPrefix" TEXT DEFAULT 'PRO-',

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "paymentMethod" TEXT,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "transactionId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "companyId" TEXT,
    "razorpayOrderId" TEXT,
    "razorpayPaymentId" TEXT,
    "razorpaySignature" TEXT,
    "status" TEXT,
    "conversionRate" DOUBLE PRECISION DEFAULT 1.0,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "metadata" TEXT,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RazorpaySync" (
    "id" TEXT NOT NULL,
    "lastSyncAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "syncedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RazorpaySync_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunicationLog" (
    "id" TEXT NOT NULL,
    "customerProfileId" TEXT NOT NULL,
    "userId" TEXT,
    "type" "CommunicationType" NOT NULL DEFAULT 'COMMENT',
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "channel" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "notes" TEXT NOT NULL,
    "outcome" TEXT,
    "duration" INTEGER,
    "recordingUrl" TEXT,
    "referenceId" TEXT,
    "nextFollowUpDate" TIMESTAMP(3),
    "isFollowUpCompleted" BOOLEAN NOT NULL DEFAULT false,
    "category" TEXT,
    "attachments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "companyId" TEXT,
    "institutionId" TEXT,

    CONSTRAINT "CommunicationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationChecklist" (
    "id" TEXT NOT NULL,
    "communicationLogId" TEXT NOT NULL,
    "checkedItems" JSONB NOT NULL,
    "renewalLikelihood" DOUBLE PRECISION,
    "upsellPotential" DOUBLE PRECISION,
    "churnRisk" DOUBLE PRECISION,
    "customerHealth" TEXT,
    "insights" JSONB,
    "recommendedActions" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "companyId" TEXT,

    CONSTRAINT "ConversationChecklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assignedById" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "estimatedEffort" DOUBLE PRECISION,
    "actualEffort" DOUBLE PRECISION,
    "relatedCustomerId" TEXT,
    "relatedSubscriptionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "companyId" TEXT,
    "projectId" TEXT,
    "inventoryItemId" TEXT,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "changes" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatRoom" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "isGroup" BOOLEAN NOT NULL DEFAULT false,
    "companyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatParticipant" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastViewedAt" TIMESTAMP(3),

    CONSTRAINT "ChatParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attachments" JSONB,
    "reactions" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportTicket" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "customerProfileId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "assignedToId" TEXT,
    "chatRoomId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'INFO',
    "link" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "maintenanceMode" BOOLEAN NOT NULL DEFAULT false,
    "supportEmail" TEXT NOT NULL DEFAULT 'support@stm.com',
    "defaultCurrency" TEXT NOT NULL DEFAULT 'INR',
    "companyName" TEXT NOT NULL DEFAULT 'STM Journal Solutions',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "brandName" TEXT DEFAULT 'STM Journal Solutions',
    "faviconUrl" TEXT,
    "logoUrl" TEXT,
    "primaryColor" TEXT DEFAULT '#3b82f6',

    CONSTRAINT "SystemSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Designation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "jobDescription" TEXT,
    "kra" TEXT,
    "expectedExperience" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "promotionWaitPeriod" INTEGER NOT NULL DEFAULT 12,
    "incrementGuidelines" TEXT,
    "level" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Designation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GlobalDepartment" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GlobalDepartment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GlobalDesignation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "jobDescription" TEXT,
    "kra" TEXT,
    "expectedExperience" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GlobalDesignation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "employeeId" TEXT,
    "designation" TEXT,
    "dateOfJoining" TIMESTAMP(3),
    "dateOfBirth" TIMESTAMP(3),
    "baseSalary" DOUBLE PRECISION,
    "fixedSalary" DOUBLE PRECISION,
    "variableSalary" DOUBLE PRECISION,
    "hasVariable" BOOLEAN NOT NULL DEFAULT false,
    "variablePerTarget" DOUBLE PRECISION,
    "variableUpperCap" DOUBLE PRECISION,
    "variableDefinition" TEXT,
    "incentiveSalary" DOUBLE PRECISION,
    "hasIncentive" BOOLEAN NOT NULL DEFAULT false,
    "incentivePercentage" DOUBLE PRECISION,
    "incentiveDefinition" TEXT,
    "monthlyTarget" DOUBLE PRECISION DEFAULT 0,
    "yearlyTarget" DOUBLE PRECISION DEFAULT 0,
    "salaryFixed" DOUBLE PRECISION DEFAULT 0,
    "baseTarget" DOUBLE PRECISION DEFAULT 0,
    "salaryVariable" DOUBLE PRECISION DEFAULT 0,
    "variableRate" DOUBLE PRECISION DEFAULT 0,
    "variableUnit" DOUBLE PRECISION DEFAULT 0,
    "salaryIncentive" DOUBLE PRECISION DEFAULT 0,
    "skills" TEXT[],
    "expertise" TEXT[],
    "bankName" TEXT,
    "accountNumber" TEXT,
    "ifscCode" TEXT,
    "panNumber" TEXT,
    "personalEmail" TEXT,
    "phoneNumber" TEXT,
    "emergencyContact" TEXT,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "contractUrl" TEXT,
    "offerLetterUrl" TEXT,
    "jobDescription" TEXT,
    "kra" TEXT,
    "bloodGroup" TEXT,
    "profilePicture" TEXT,
    "designationId" TEXT,
    "grade" TEXT,
    "lastIncrementDate" TIMESTAMP(3),
    "lastIncrementPercentage" DOUBLE PRECISION,
    "designationJustification" TEXT,
    "taskTemplateLink" TEXT,
    "lastPromotionDate" TIMESTAMP(3),
    "nextReviewDate" TIMESTAMP(3),
    "qualification" TEXT,
    "relevantExperienceMonths" INTEGER NOT NULL DEFAULT 0,
    "relevantExperienceYears" INTEGER NOT NULL DEFAULT 0,
    "totalExperienceMonths" INTEGER NOT NULL DEFAULT 0,
    "totalExperienceYears" INTEGER NOT NULL DEFAULT 0,
    "aadharNumber" TEXT,
    "educationDetails" JSONB,
    "esicNumber" TEXT,
    "experienceDetails" JSONB,
    "officePhone" TEXT,
    "officialEmail" TEXT,
    "permanentAddress" TEXT,
    "pfNumber" TEXT,
    "uanNumber" TEXT,
    "manualLeaveAdjustment" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "leaveBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "initialLeaveBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currentLeaveBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "metrics" JSONB,
    "employeeType" "EmployeeType" NOT NULL DEFAULT 'FULL_TIME',

    CONSTRAINT "EmployeeProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeCompanyDesignation" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "designationId" TEXT,

    CONSTRAINT "EmployeeCompanyDesignation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalaryAdvance" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "totalEmis" INTEGER NOT NULL DEFAULT 1,
    "paidEmis" INTEGER NOT NULL DEFAULT 0,
    "emiAmount" DOUBLE PRECISION NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "companyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalaryAdvance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdvanceEMI" (
    "id" TEXT NOT NULL,
    "advanceId" TEXT NOT NULL,
    "salarySlipId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdvanceEMI_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalaryIncrementRecord" (
    "id" TEXT NOT NULL,
    "employeeProfileId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "oldSalary" DOUBLE PRECISION NOT NULL,
    "oldFixed" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "oldVariable" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "oldIncentive" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "newSalary" DOUBLE PRECISION NOT NULL,
    "newFixed" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "newVariable" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "newIncentive" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "oldBaseTarget" DOUBLE PRECISION DEFAULT 0,
    "newBaseTarget" DOUBLE PRECISION DEFAULT 0,
    "oldVariableRate" DOUBLE PRECISION DEFAULT 0,
    "newVariableRate" DOUBLE PRECISION DEFAULT 0,
    "oldVariableUnit" DOUBLE PRECISION DEFAULT 0,
    "newVariableUnit" DOUBLE PRECISION DEFAULT 0,
    "currentMonthlyTarget" DOUBLE PRECISION DEFAULT 0,
    "newMonthlyTarget" DOUBLE PRECISION DEFAULT 0,
    "currentYearlyTarget" DOUBLE PRECISION DEFAULT 0,
    "newYearlyTarget" DOUBLE PRECISION DEFAULT 0,
    "variableDefinition" TEXT,
    "incentiveDefinition" TEXT,
    "incrementAmount" DOUBLE PRECISION NOT NULL,
    "percentage" DOUBLE PRECISION NOT NULL,
    "optInVariable" BOOLEAN NOT NULL DEFAULT false,
    "optInIncentive" BOOLEAN NOT NULL DEFAULT false,
    "oldVariablePerTarget" DOUBLE PRECISION,
    "newVariablePerTarget" DOUBLE PRECISION,
    "oldVariableUpperCap" DOUBLE PRECISION,
    "newVariableUpperCap" DOUBLE PRECISION,
    "oldIncentivePercentage" DOUBLE PRECISION,
    "newIncentivePercentage" DOUBLE PRECISION,
    "oldHealthCare" DOUBLE PRECISION,
    "newHealthCare" DOUBLE PRECISION,
    "oldTravelling" DOUBLE PRECISION,
    "newTravelling" DOUBLE PRECISION,
    "oldMobile" DOUBLE PRECISION,
    "newMobile" DOUBLE PRECISION,
    "oldInternet" DOUBLE PRECISION,
    "newInternet" DOUBLE PRECISION,
    "oldBooksAndPeriodicals" DOUBLE PRECISION,
    "newBooksAndPeriodicals" DOUBLE PRECISION,
    "type" TEXT NOT NULL DEFAULT 'INCREMENT',
    "previousDesignation" TEXT,
    "newDesignation" TEXT,
    "oldJobDescription" TEXT,
    "newJobDescription" TEXT,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "isDraft" BOOLEAN NOT NULL DEFAULT true,
    "recommendedByUserId" TEXT,
    "managerReviewDate" TIMESTAMP(3),
    "managerComments" TEXT,
    "managerApproved" BOOLEAN NOT NULL DEFAULT false,
    "approvedByUserId" TEXT,
    "adminReviewDate" TIMESTAMP(3),
    "adminComments" TEXT,
    "adminApproved" BOOLEAN NOT NULL DEFAULT false,
    "oldKRA" TEXT,
    "oldKPI" JSONB,
    "newKRA" TEXT,
    "newKPI" JSONB,
    "performanceNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "fiscalYear" TEXT,
    "previousFiscalYear" TEXT,
    "q1Target" DOUBLE PRECISION DEFAULT 0,
    "q2Target" DOUBLE PRECISION DEFAULT 0,
    "q3Target" DOUBLE PRECISION DEFAULT 0,
    "q4Target" DOUBLE PRECISION DEFAULT 0,
    "monthlyFixSalary" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "monthlyFixTarget" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "monthlyTotalSalary" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "monthlyTotalTarget" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "monthlyVariableSalary" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "monthlyVariableTarget" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "monthlyTargets" JSONB,
    "monthlyVariableTargets" JSONB,
    "monthlyFixedSalaries" JSONB,
    "monthlyVariableSalaries" JSONB,
    "newDesignationId" TEXT,
    "previousDesignationId" TEXT,

    CONSTRAINT "SalaryIncrementRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeComment" (
    "id" TEXT NOT NULL,
    "employeeProfileId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'GENERAL',
    "isVisibleToEmployee" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeDocument" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileType" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmployeeDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attendance" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checkIn" TIMESTAMP(3),
    "checkOut" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PRESENT',
    "workFrom" TEXT NOT NULL DEFAULT 'OFFICE',
    "deviceInfo" TEXT,
    "isGeofenced" BOOLEAN NOT NULL DEFAULT false,
    "latitude" DOUBLE PRECISION,
    "locationName" TEXT,
    "longitude" DOUBLE PRECISION,
    "companyId" TEXT,
    "lateMinutes" INTEGER NOT NULL DEFAULT 0,
    "shortMinutes" INTEGER NOT NULL DEFAULT 0,
    "otMinutes" INTEGER NOT NULL DEFAULT 0,
    "isLate" BOOLEAN NOT NULL DEFAULT false,
    "isShort" BOOLEAN NOT NULL DEFAULT false,
    "shiftId" TEXT,
    "remarks" TEXT,

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkReport" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "title" TEXT NOT NULL,
    "content" TEXT,
    "hoursSpent" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "managerComment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "category" TEXT NOT NULL DEFAULT 'GENERAL',
    "keyOutcome" TEXT,
    "managerRating" INTEGER,
    "selfRating" INTEGER DEFAULT 5,
    "revenueGenerated" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tasksCompleted" INTEGER NOT NULL DEFAULT 0,
    "chatsHandled" INTEGER NOT NULL DEFAULT 0,
    "followUpsCompleted" INTEGER NOT NULL DEFAULT 0,
    "ticketsResolved" INTEGER NOT NULL DEFAULT 0,
    "companyId" TEXT,
    "kraMatchRatio" DOUBLE PRECISION,
    "metrics" JSONB,
    "evaluation" JSONB,
    "pointsEarned" INTEGER NOT NULL DEFAULT 0,
    "tasksSnapshot" JSONB,
    "attendanceStatus" TEXT,
    "disciplineStatus" TEXT,

    CONSTRAINT "WorkReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkReportComment" (
    "id" TEXT NOT NULL,
    "workReportId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkReportComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Holiday" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'PUBLIC',
    "description" TEXT,
    "companyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Holiday_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vendor" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "taxId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrder" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "poNumber" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "expectedDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrderItem" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "inventoryItemId" TEXT,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "PurchaseOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Warehouse" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "managerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Warehouse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'GENERAL',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "companyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT,
    "minStockLevel" INTEGER NOT NULL DEFAULT 0,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "warehouseId" TEXT,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "referenceId" TEXT,
    "notes" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionOrder" (
    "id" TEXT NOT NULL,
    "itemSku" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "reason" TEXT,
    "targetDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "companyId" TEXT,

    CONSTRAINT "ProductionOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalarySlip" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "amountPaid" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'GENERATED',
    "fileUrl" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "companyId" TEXT,
    "advanceDeduction" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lwpDeduction" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "basicSalary" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "conveyance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ctc" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "esicEmployee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "esicEmployer" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "grossSalary" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "hra" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "medical" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "otherAllowances" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pfEmployee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pfEmployer" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "professionalTax" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "specialAllowance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "statutoryBonus" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tds" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalDeductions" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "arrears" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "expenses" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "gratuity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netPayable" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "healthCare" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "travelling" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "mobile" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "internet" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "booksAndPeriodicals" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "salaryFixed" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "salaryVariable" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "salaryIncentive" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isFinalSettlement" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "isPFDeducted" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "SalarySlip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArrearRecord" (
    "id" TEXT NOT NULL,
    "salarySlipId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArrearRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DepartmentBudget" (
    "id" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "fiscalYear" INTEGER NOT NULL,
    "month" INTEGER,
    "allocated" DOUBLE PRECISION NOT NULL,
    "spent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "category" TEXT NOT NULL DEFAULT 'SALARY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DepartmentBudget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StatutoryConfig" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "pfEmployeeRate" DOUBLE PRECISION NOT NULL DEFAULT 12.0,
    "pfEmployerRate" DOUBLE PRECISION NOT NULL DEFAULT 12.0,
    "pfCeilingAmount" DOUBLE PRECISION NOT NULL DEFAULT 15000.0,
    "pfAdminCharges" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "esicEmployeeRate" DOUBLE PRECISION NOT NULL DEFAULT 0.75,
    "esicEmployerRate" DOUBLE PRECISION NOT NULL DEFAULT 3.25,
    "esicLimitAmount" DOUBLE PRECISION NOT NULL DEFAULT 21000.0,
    "ptEnabled" BOOLEAN NOT NULL DEFAULT true,
    "state" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StatutoryConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxDeclaration" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "fiscalYear" TEXT NOT NULL,
    "regime" TEXT NOT NULL DEFAULT 'NEW',
    "section80C" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "section80D" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "nps" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "hraRentPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "homeLoanInterest" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "otherIncome" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "adminComment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxDeclaration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeclarationProof" (
    "id" TEXT NOT NULL,
    "taxDeclarationId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeclarationProof_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shift" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "gracePeriod" INTEGER NOT NULL DEFAULT 15,
    "isNightShift" BOOLEAN NOT NULL DEFAULT false,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "evaluation" JSONB,
    "metrics" JSONB,

    CONSTRAINT "Shift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShiftRoster" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShiftRoster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalaryStructure" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "basicSalary" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "hra" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "conveyance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "medical" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "specialAllowance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "statutoryBonus" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "otherAllowances" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "grossSalary" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pfEmployee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "esicEmployee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "professionalTax" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tds" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalDeductions" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pfEmployer" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "esicEmployer" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "gratuity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "insurance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netSalary" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "healthCare" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "travelling" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "mobile" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "internet" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "booksAndPeriodicals" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "salaryFixed" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "salaryVariable" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "salaryIncentive" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ctc" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deductPF" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "SalaryStructure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PerformanceReview" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rating" INTEGER NOT NULL,
    "feedback" TEXT,
    "period" TEXT,
    "companyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "salaryIncrementRecordId" TEXT,

    CONSTRAINT "PerformanceReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeKPI" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "target" DOUBLE PRECISION NOT NULL,
    "current" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'GENERAL',
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmployeeKPI_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PerformanceInsight" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "companyId" TEXT NOT NULL,

    CONSTRAINT "PerformanceInsight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveRequest" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "managerComment" TEXT,
    "approvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "companyId" TEXT,

    CONSTRAINT "LeaveRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkPlan" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "agenda" TEXT NOT NULL,
    "strategy" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "estimatedHours" DOUBLE PRECISION,
    "actualHours" DOUBLE PRECISION,
    "completionStatus" TEXT NOT NULL DEFAULT 'PLANNED',
    "linkedGoalId" TEXT,
    "visibility" TEXT NOT NULL DEFAULT 'MANAGER',
    "status" TEXT NOT NULL DEFAULT 'SHARED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "companyId" TEXT,
    "projectId" TEXT,
    "taskId" TEXT,
    "itProjectId" TEXT,
    "itTaskId" TEXT,

    CONSTRAINT "WorkPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnboardingModule" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "content" TEXT NOT NULL,
    "departmentId" TEXT,
    "companyId" TEXT,
    "requiredForDesignation" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnboardingModule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizQuestion" (
    "id" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "options" TEXT[],
    "correctAnswer" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuizQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnboardingProgress" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'LOCKED',
    "score" DOUBLE PRECISION,
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnboardingProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkPlanComment" (
    "id" TEXT NOT NULL,
    "workPlanId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkPlanComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentTemplate" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DigitalDocument" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "signedAt" TIMESTAMP(3),
    "signatureIp" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DigitalDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobPosting" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "requirements" TEXT,
    "location" TEXT,
    "salaryRange" TEXT,
    "type" TEXT NOT NULL DEFAULT 'FULL_TIME',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "departmentId" TEXT,

    CONSTRAINT "JobPosting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobApplication" (
    "id" TEXT NOT NULL,
    "jobPostingId" TEXT NOT NULL,
    "applicantName" TEXT NOT NULL,
    "applicantEmail" TEXT NOT NULL,
    "applicantPhone" TEXT,
    "resumeUrl" TEXT,
    "aiMatchScore" INTEGER NOT NULL DEFAULT 0,
    "aiTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" TEXT NOT NULL DEFAULT 'APPLIED',
    "offerLetterUrl" TEXT,
    "contractUrl" TEXT,
    "notes" TEXT,
    "rating" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "departmentId" TEXT,

    CONSTRAINT "JobApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecruitmentExam" (
    "id" TEXT NOT NULL,
    "jobPostingId" TEXT NOT NULL,
    "questions" JSONB NOT NULL,
    "timeLimit" INTEGER NOT NULL DEFAULT 30,
    "passPercentage" DOUBLE PRECISION NOT NULL DEFAULT 75.0,

    CONSTRAINT "RecruitmentExam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamAttempt" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "isPassed" BOOLEAN NOT NULL,
    "answers" JSONB NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ExamAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecruitmentInterview" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "interviewerId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "result" TEXT NOT NULL DEFAULT 'PENDING',
    "feedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "duration" INTEGER NOT NULL DEFAULT 30,
    "location" TEXT,
    "meetingLink" TEXT,
    "rating" INTEGER,
    "type" TEXT NOT NULL DEFAULT 'VIRTUAL',

    CONSTRAINT "RecruitmentInterview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Courier" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "website" TEXT,
    "apiEndpoint" TEXT,
    "apiKey" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Courier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DispatchOrder" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "invoiceId" TEXT,
    "recipientName" TEXT NOT NULL,
    "shippingAddress" TEXT,
    "shippingCity" TEXT,
    "shippingState" TEXT,
    "shippingPincode" TEXT,
    "shippingCountry" TEXT,
    "billingAddress" TEXT,
    "billingCity" TEXT,
    "billingState" TEXT,
    "billingPincode" TEXT,
    "billingCountry" TEXT,
    "phone" TEXT,
    "items" JSONB NOT NULL,
    "weight" DOUBLE PRECISION,
    "courierId" TEXT,
    "trackingNumber" TEXT,
    "status" "DispatchStatus" NOT NULL DEFAULT 'PENDING',
    "shippedDate" TIMESTAMP(3),
    "deliveredDate" TIMESTAMP(3),
    "generatedLabelUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "companyId" TEXT,
    "accessEndDate" TIMESTAMP(3),
    "accessStartDate" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "customerProfileId" TEXT,
    "cycleLabel" TEXT,
    "cycleNumber" INTEGER NOT NULL DEFAULT 1,
    "fulfillmentType" "FulfillmentType" NOT NULL DEFAULT 'PRINT',
    "packedDate" TIMESTAMP(3),
    "partnerName" TEXT,
    "plannedDispatchDate" TIMESTAMP(3),
    "remarks" TEXT,
    "totalCycles" INTEGER NOT NULL DEFAULT 1,
    "updatedByUserId" TEXT,

    CONSTRAINT "DispatchOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalVolume" (
    "id" TEXT NOT NULL,
    "journalId" TEXT NOT NULL,
    "volumeNumber" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "JournalVolume_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeTaskTemplate" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "points" INTEGER NOT NULL DEFAULT 0,
    "departmentId" TEXT,
    "designationId" TEXT,
    "companyId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "calculationType" "TaskCalculationType" NOT NULL DEFAULT 'FLAT',
    "maxThreshold" DOUBLE PRECISION,
    "minThreshold" DOUBLE PRECISION DEFAULT 1,
    "pointsPerUnit" DOUBLE PRECISION DEFAULT 1,
    "departmentIds" JSONB,
    "designationIds" JSONB,
    "employeeId" TEXT,
    "endDate" TIMESTAMP(3),
    "frequency" "TaskFrequency" NOT NULL DEFAULT 'DAILY',
    "startDate" TIMESTAMP(3),
    "targetUnit" "TaskTargetUnit" NOT NULL DEFAULT 'COUNT',
    "targetValue" DOUBLE PRECISION DEFAULT 1,
    "employeeIds" JSONB,

    CONSTRAINT "EmployeeTaskTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeePointLog" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "reason" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "companyId" TEXT NOT NULL,
    "awardedBy" TEXT,

    CONSTRAINT "EmployeePointLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyTaskCompletion" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyTaskCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonthlyPerformanceSnapshot" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "departmentId" TEXT,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "totalWorkingDays" INTEGER NOT NULL DEFAULT 0,
    "daysPresent" INTEGER NOT NULL DEFAULT 0,
    "daysAbsent" INTEGER NOT NULL DEFAULT 0,
    "daysLate" INTEGER NOT NULL DEFAULT 0,
    "totalLateMinutes" INTEGER NOT NULL DEFAULT 0,
    "averageWorkHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "overtimeHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "leavesTaken" INTEGER NOT NULL DEFAULT 0,
    "attendanceScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalPointsEarned" INTEGER NOT NULL DEFAULT 0,
    "tasksCompleted" INTEGER NOT NULL DEFAULT 0,
    "tasksAssigned" INTEGER NOT NULL DEFAULT 0,
    "taskCompletionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "averageTaskQuality" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reportsSubmitted" INTEGER NOT NULL DEFAULT 0,
    "reportsExpected" INTEGER NOT NULL DEFAULT 0,
    "reportSubmissionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "averageSelfRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "averageManagerRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalRevenueGenerated" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "revenueTarget" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "revenueAchievement" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "deadlinesMet" INTEGER NOT NULL DEFAULT 0,
    "deadlinesMissed" INTEGER NOT NULL DEFAULT 0,
    "initiativesCount" INTEGER NOT NULL DEFAULT 0,
    "improvementScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "communicationScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "teamCollaboration" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "overallScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "performanceGrade" TEXT,
    "trend" TEXT,
    "needsAttention" BOOLEAN NOT NULL DEFAULT false,
    "isTopPerformer" BOOLEAN NOT NULL DEFAULT false,
    "warningFlags" JSONB,
    "predictedNextMonth" JSONB,
    "retentionRisk" DOUBLE PRECISION,
    "promotionReadiness" DOUBLE PRECISION,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonthlyPerformanceSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DepartmentPerformance" (
    "id" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "totalEmployees" INTEGER NOT NULL DEFAULT 0,
    "activeEmployees" INTEGER NOT NULL DEFAULT 0,
    "averageAttendance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "averagePerformance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalPointsEarned" INTEGER NOT NULL DEFAULT 0,
    "totalRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "topPerformersCount" INTEGER NOT NULL DEFAULT 0,
    "underperformersCount" INTEGER NOT NULL DEFAULT 0,
    "attritionCount" INTEGER NOT NULL DEFAULT 0,
    "newHiresCount" INTEGER NOT NULL DEFAULT 0,
    "taskCompletionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reportSubmissionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "averageWorkHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "budgetAllocated" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "budgetUtilized" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "revenuePerEmployee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "roi" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "departmentScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rank" INTEGER,
    "trend" TEXT,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DepartmentPerformance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyPerformance" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "totalEmployees" INTEGER NOT NULL DEFAULT 0,
    "totalDepartments" INTEGER NOT NULL DEFAULT 0,
    "averagePerformance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalPointsEarned" INTEGER NOT NULL DEFAULT 0,
    "attendanceRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "attritionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "satisfactionScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taskCompletionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reportSubmissionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "averageWorkHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "revenuePerEmployee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "profitMargin" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "monthOverMonthGrowth" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "yearOverYearGrowth" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "topDepartment" TEXT,
    "topPerformer" TEXT,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanyPerformance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalIssue" (
    "id" TEXT NOT NULL,
    "volumeId" TEXT NOT NULL,
    "issueNumber" INTEGER NOT NULL,
    "month" TEXT,
    "title" TEXT,
    "status" "IssueStatus" NOT NULL DEFAULT 'PLANNED',
    "publishedAt" TIMESTAMP(3),
    "expectedManuscripts" INTEGER NOT NULL DEFAULT 0,
    "isComplete" BOOLEAN NOT NULL DEFAULT false,
    "validationStatus" TEXT,

    CONSTRAINT "JournalIssue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Article" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "abstract" TEXT,
    "keywords" TEXT,
    "journalId" TEXT NOT NULL,
    "issueId" TEXT,
    "submissionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptanceDate" TIMESTAMP(3),
    "publicationDate" TIMESTAMP(3),
    "status" "ArticleStatus" NOT NULL DEFAULT 'SUBMITTED',
    "fileUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "apcAmountINR" DOUBLE PRECISION DEFAULT 0,
    "apcAmountUSD" DOUBLE PRECISION DEFAULT 0,
    "apcInvoiceId" TEXT,
    "apcPaymentStatus" TEXT NOT NULL DEFAULT 'UNPAID',
    "apcType" "APCType",
    "currentRound" INTEGER NOT NULL DEFAULT 1,
    "doi" TEXT,
    "manuscriptId" TEXT,
    "manuscriptStatus" "ManuscriptStatus" DEFAULT 'SUBMITTED',
    "volumeId" TEXT,
    "year" INTEGER,

    CONSTRAINT "Article_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "rating" INTEGER,
    "commentsToEditor" TEXT,
    "commentsToAuthor" TEXT,
    "recommendation" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "dueDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "round" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArticleAuthor" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "affiliation" TEXT,
    "isCorresponding" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ArticleAuthor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conference" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "venue" TEXT,
    "organizer" TEXT,
    "website" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "companyId" TEXT,
    "bannerUrl" TEXT,
    "cfpEndDate" TIMESTAMP(3),
    "cfpStartDate" TIMESTAMP(3),
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "logoUrl" TEXT,
    "maxAttendees" INTEGER,
    "mode" TEXT NOT NULL DEFAULT 'IN_PERSON',
    "primaryColor" TEXT DEFAULT '#3B82F6',
    "registrationFee" DOUBLE PRECISION DEFAULT 0,
    "reviewDeadline" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "timezone" TEXT NOT NULL DEFAULT 'UTC',

    CONSTRAINT "Conference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConferenceTicketType" (
    "id" TEXT NOT NULL,
    "conferenceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "limit" INTEGER,
    "soldCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ConferenceTicketType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConferenceRegistration" (
    "id" TEXT NOT NULL,
    "conferenceId" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "organization" TEXT,
    "ticketTypeId" TEXT NOT NULL,
    "amountPaid" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'REGISTERED',
    "paymentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "certificateIssued" BOOLEAN NOT NULL DEFAULT false,
    "checkInTime" TIMESTAMP(3),
    "dietaryRequirements" TEXT,
    "notes" TEXT,
    "phone" TEXT,
    "tshirtSize" TEXT,

    CONSTRAINT "ConferenceRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConferencePaper" (
    "id" TEXT NOT NULL,
    "conferenceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "abstract" TEXT NOT NULL,
    "authors" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "presenterName" TEXT,
    "presentedAt" TIMESTAMP(3),
    "fileUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finalDecision" TEXT,
    "keywords" TEXT,
    "reviewStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "submissionType" TEXT NOT NULL DEFAULT 'ABSTRACT',
    "trackId" TEXT,
    "userId" TEXT,

    CONSTRAINT "ConferencePaper_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaperReview" (
    "id" TEXT NOT NULL,
    "paperId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "comments" TEXT,
    "decision" TEXT NOT NULL DEFAULT 'PENDING',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaperReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConferenceTrack" (
    "id" TEXT NOT NULL,
    "conferenceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT DEFAULT '#3B82F6',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConferenceTrack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConferenceSponsor" (
    "id" TEXT NOT NULL,
    "conferenceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logo" TEXT,
    "tier" TEXT NOT NULL DEFAULT 'BRONZE',
    "website" TEXT,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConferenceSponsor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Course" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "instructorId" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "companyId" TEXT,
    "category" TEXT,
    "estimatedHours" INTEGER,
    "language" TEXT DEFAULT 'English',
    "level" TEXT DEFAULT 'BEGINNER',
    "prerequisites" TEXT,
    "emailCount" INTEGER NOT NULL DEFAULT 0,
    "mentorId" TEXT,
    "mentorReward" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workshop" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "duration" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "mentorId" TEXT,
    "mentorReward" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "emailCount" INTEGER NOT NULL DEFAULT 0,
    "maxAttendees" INTEGER,
    "venue" TEXT,
    "meetingLink" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "companyId" TEXT,

    CONSTRAINT "Workshop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkshopEnrollment" (
    "id" TEXT NOT NULL,
    "workshopId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "amountPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" TEXT NOT NULL DEFAULT 'CONFIRMED',
    "invoiceId" TEXT,

    CONSTRAINT "WorkshopEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Internship" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "duration" TEXT,
    "stipend" DOUBLE PRECISION,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "mentorId" TEXT,
    "mentorReward" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "emailCount" INTEGER NOT NULL DEFAULT 0,
    "department" TEXT,
    "type" TEXT NOT NULL DEFAULT 'REMOTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "companyId" TEXT,

    CONSTRAINT "Internship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InternshipApplication" (
    "id" TEXT NOT NULL,
    "internshipId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'APPLIED',
    "resumeUrl" TEXT,
    "coverLetter" TEXT,

    CONSTRAINT "InternshipApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LMSEmailLog" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "content" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'SENT',
    "userId" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LMSEmailLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LMSDailyRevenue" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "enrollments" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LMSDailyRevenue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LMSExpenseConfig" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "minExpense" DOUBLE PRECISION NOT NULL DEFAULT 30000,
    "expensePercentage" DOUBLE PRECISION NOT NULL DEFAULT 0.30,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LMSExpenseConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LMSMentorPayment" (
    "id" TEXT NOT NULL,
    "mentorId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "period" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LMSMentorPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseModule" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT,

    CONSTRAINT "CourseModule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseLesson" (
    "id" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'VIDEO',
    "contentUrl" TEXT,
    "textContent" TEXT,
    "duration" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT,
    "isFree" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "CourseLesson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseEnrollment" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "certificateUrl" TEXT,
    "lastAccessedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "CourseEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserLessonProgress" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "lastPosition" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "timeSpent" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "UserLessonProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quiz" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "passingScore" INTEGER NOT NULL DEFAULT 70,
    "timeLimit" INTEGER,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "shuffleQuestions" BOOLEAN NOT NULL DEFAULT false,
    "showAnswers" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Quiz_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseQuizQuestion" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'MULTIPLE_CHOICE',
    "options" JSONB,
    "correctAnswer" TEXT NOT NULL,
    "explanation" TEXT,
    "points" INTEGER NOT NULL DEFAULT 1,
    "order" INTEGER NOT NULL,

    CONSTRAINT "CourseQuizQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizAttempt" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "answers" JSONB NOT NULL,
    "timeSpent" INTEGER,
    "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuizAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseNote" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "timestamp" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseDiscussion" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseDiscussion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscussionReply" (
    "id" TEXT NOT NULL,
    "discussionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiscussionReply_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseAnnouncement" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CourseAnnouncement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Certificate" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT,
    "userId" TEXT NOT NULL,
    "courseId" TEXT,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "certificateUrl" TEXT,
    "verificationCode" TEXT NOT NULL,
    "description" TEXT,
    "recipientName" TEXT,
    "title" TEXT,
    "type" "CertificateType" DEFAULT 'COURSE_COMPLETION',

    CONSTRAINT "Certificate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ITAsset" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "serialNumber" TEXT,
    "purchaseDate" TIMESTAMP(3),
    "warrantyExpiry" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "assignedToId" TEXT,
    "details" TEXT,
    "value" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ITAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ITSupportTicket" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "assignedToId" TEXT,
    "assetId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "category" TEXT,
    "resolution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ITSupportTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialRecord" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "type" "FinancialType" NOT NULL DEFAULT 'EXPENSE',
    "category" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "paymentMethod" TEXT,
    "referenceId" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveLedger" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "openingBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "takenLeaves" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "closingBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "remarks" TEXT,
    "autoCredit" DOUBLE PRECISION,
    "lateArrivalCount" INTEGER NOT NULL DEFAULT 0,
    "shortLeaveCount" INTEGER NOT NULL DEFAULT 0,
    "lateDeductions" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "shortLeaveDeductions" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "companyId" TEXT,

    CONSTRAINT "LeaveLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeGoal" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "kra" TEXT,
    "targetValue" DOUBLE PRECISION NOT NULL,
    "currentValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "achievementPercentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL,
    "type" "GoalType" NOT NULL DEFAULT 'MONTHLY',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "visibility" TEXT NOT NULL DEFAULT 'MANAGER',
    "reviewerId" TEXT,
    "reviewNotes" TEXT,
    "companyId" TEXT NOT NULL,
    "kpiId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeGoal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncentiveSchema" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "RewardType" NOT NULL DEFAULT 'PERCENTAGE',
    "value" DOUBLE PRECISION NOT NULL,
    "criteria" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IncentiveSchema_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BonusSchema" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "frequency" TEXT NOT NULL DEFAULT 'YEARLY',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BonusSchema_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeIncentive" (
    "id" TEXT NOT NULL,
    "employeeProfileId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "reason" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "salarySlipId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeIncentive_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyPotential" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "monthlyPotential" DOUBLE PRECISION,
    "quarterlyPotential" DOUBLE PRECISION,
    "halfYearlyPotential" DOUBLE PRECISION,
    "yearlyPotential" DOUBLE PRECISION,
    "twoYearPotential" DOUBLE PRECISION,
    "threeYearPotential" DOUBLE PRECISION,
    "fiveYearPotential" DOUBLE PRECISION,
    "growthFactors" JSONB,
    "marketData" JSONB,
    "lastCalculated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyPotential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EditorialBoardMember" (
    "id" TEXT NOT NULL,
    "journalId" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "designation" TEXT,
    "affiliation" TEXT,
    "bio" TEXT,
    "profilePicture" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "joinedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "role" "EditorialRole" NOT NULL DEFAULT 'REVIEWER',
    "specialization" TEXT,

    CONSTRAINT "EditorialBoardMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArticleVersion" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changelog" TEXT,

    CONSTRAINT "ArticleVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConferenceCommitteeMember" (
    "id" TEXT NOT NULL,
    "conferenceId" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "affiliation" TEXT,
    "bio" TEXT,
    "photoUrl" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConferenceCommitteeMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalReviewer" (
    "id" TEXT NOT NULL,
    "journalId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "specialization" TEXT[],
    "bio" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "joinedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalReviews" INTEGER NOT NULL DEFAULT 0,
    "completedReviews" INTEGER NOT NULL DEFAULT 0,
    "averageRating" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JournalReviewer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewAssignment" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "assignedBy" TEXT NOT NULL,
    "assignedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "priority" "ReviewPriority" NOT NULL DEFAULT 'NORMAL',
    "round" INTEGER NOT NULL DEFAULT 1,
    "reminderSent" BOOLEAN NOT NULL DEFAULT false,
    "lastReminderDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReviewAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewReport" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "overallRating" INTEGER NOT NULL,
    "originality" INTEGER NOT NULL,
    "methodology" INTEGER NOT NULL,
    "clarity" INTEGER NOT NULL,
    "significance" INTEGER NOT NULL,
    "commentsToEditor" TEXT NOT NULL,
    "commentsToAuthor" TEXT,
    "recommendation" "Recommendation" NOT NULL,
    "confidentialComments" TEXT,
    "submittedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validatedBy" TEXT,
    "validatedDate" TIMESTAMP(3),
    "isValidated" BOOLEAN NOT NULL DEFAULT false,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReviewReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewCertificate" (
    "id" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "journalId" TEXT NOT NULL,
    "certificateNumber" TEXT NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewDate" TIMESTAMP(3) NOT NULL,
    "articleTitle" TEXT NOT NULL,
    "reviewerName" TEXT NOT NULL,
    "journalName" TEXT NOT NULL,
    "pdfUrl" TEXT,
    "issuedBy" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewCertificate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConferenceFeedback" (
    "id" TEXT NOT NULL,
    "conferenceId" TEXT NOT NULL,
    "userId" TEXT,
    "rating" INTEGER NOT NULL DEFAULT 5,
    "content" TEXT NOT NULL,
    "category" TEXT DEFAULT 'GENERAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConferenceFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebsiteMonitor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "frequency" INTEGER NOT NULL DEFAULT 5,
    "isPaused" BOOLEAN NOT NULL DEFAULT false,
    "lastCheck" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "upsince" TIMESTAMP(3),
    "dailyUptime" DOUBLE PRECISION,
    "totalDowntime" INTEGER NOT NULL DEFAULT 0,
    "notifyEmail" BOOLEAN NOT NULL DEFAULT true,
    "notifyWhatsapp" BOOLEAN NOT NULL DEFAULT true,
    "companyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "category" TEXT,

    CONSTRAINT "WebsiteMonitor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebsiteMonitorLog" (
    "id" TEXT NOT NULL,
    "monitorId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "statusCode" INTEGER,
    "responseTime" INTEGER,
    "reason" TEXT,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebsiteMonitorLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppConfiguration" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "category" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "AppConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalDomain" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JournalDomain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalIndexing" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "tier" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JournalIndexing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalIndexingTracking" (
    "id" TEXT NOT NULL,
    "journalId" TEXT NOT NULL,
    "indexingId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "submissionDate" TIMESTAMP(3),
    "decisionDate" TIMESTAMP(3),
    "indexedDate" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "embargoEndDate" TIMESTAMP(3),
    "reApplicationDate" TIMESTAMP(3),
    "publicUrl" TEXT,
    "auditScore" DOUBLE PRECISION,
    "auditData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JournalIndexingTracking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Publisher" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "country" TEXT,
    "website" TEXT,
    "email" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Publisher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlagiarismReport" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "journalId" TEXT NOT NULL,
    "checkedBy" TEXT NOT NULL,
    "status" "PlagiarismStatus" NOT NULL DEFAULT 'PENDING',
    "similarityScore" DOUBLE PRECISION,
    "toolUsed" TEXT,
    "reportUrl" TEXT,
    "comments" TEXT,
    "checkedDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlagiarismReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QualityReport" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "journalId" TEXT NOT NULL,
    "checkedBy" TEXT NOT NULL,
    "status" "QualityStatus" NOT NULL DEFAULT 'PENDING',
    "formattingScore" INTEGER,
    "languageScore" INTEGER,
    "structureScore" INTEGER,
    "overallScore" INTEGER,
    "comments" TEXT,
    "issues" TEXT[],
    "checkedDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QualityReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManuscriptStatusHistory" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "fromStatus" "ManuscriptStatus",
    "toStatus" "ManuscriptStatus" NOT NULL,
    "changedBy" TEXT NOT NULL,
    "reason" TEXT,
    "comments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ManuscriptStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManuscriptDraft" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "journalId" TEXT NOT NULL,
    "title" TEXT,
    "abstract" TEXT,
    "keywords" TEXT,
    "fileUrl" TEXT,
    "metadata" JSONB,
    "step" INTEGER NOT NULL DEFAULT 1,
    "isSubmitted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManuscriptDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PerformanceEvaluation" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "evaluatorId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "periodType" TEXT NOT NULL,
    "scores" JSONB NOT NULL,
    "feedback" TEXT,
    "rating" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PerformanceEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManuscriptRevision" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "revisionNumber" INTEGER NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "coverLetter" TEXT,
    "responseToReviewers" TEXT,
    "changesDescription" TEXT,
    "submittedBy" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "ManuscriptRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManuscriptCommunication" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "fromUserId" TEXT,
    "toUserId" TEXT,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ManuscriptCommunication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "variables" TEXT[],
    "category" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "companyId" TEXT,
    "designState" JSONB,

    CONSTRAINT "EmailTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoAuthorInvitation" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "affiliation" TEXT,
    "invitedBy" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoAuthorInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ITProject" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "projectCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "ProjectCategory" NOT NULL DEFAULT 'DEVELOPMENT',
    "type" "ProjectType" NOT NULL DEFAULT 'SUPPORT',
    "status" "ProjectStatus" NOT NULL DEFAULT 'PLANNING',
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "clientId" TEXT,
    "clientType" "ClientType",
    "projectManagerId" TEXT,
    "teamLeadId" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "estimatedHours" DOUBLE PRECISION,
    "actualHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isRevenueBased" BOOLEAN NOT NULL DEFAULT false,
    "estimatedRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "actualRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "itDepartmentCut" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "itRevenueEarned" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "billingType" "BillingType",
    "hourlyRate" DOUBLE PRECISION,
    "isBilled" BOOLEAN NOT NULL DEFAULT false,
    "invoiceId" TEXT,
    "tags" TEXT[],
    "attachments" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "about" TEXT,
    "departmentId" TEXT,
    "details" TEXT,
    "keywords" TEXT[],
    "websiteId" TEXT,
    "sharedWithIds" TEXT[],
    "visibility" "ProjectVisibility" NOT NULL DEFAULT 'PRIVATE',

    CONSTRAINT "ITProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ITTask" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "projectId" TEXT,
    "taskCode" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" "TaskCategory" NOT NULL DEFAULT 'GENERAL',
    "type" "TaskType" NOT NULL DEFAULT 'SUPPORT',
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "assignedToId" TEXT,
    "createdById" TEXT NOT NULL,
    "reporterId" TEXT,
    "startDate" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "estimatedHours" DOUBLE PRECISION,
    "actualHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isRevenueBased" BOOLEAN NOT NULL DEFAULT false,
    "estimatedValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "actualValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "itDepartmentCut" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "itRevenueEarned" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "paymentDate" TIMESTAMP(3),
    "progressPercent" INTEGER NOT NULL DEFAULT 0,
    "blockers" TEXT,
    "dependencies" TEXT[],
    "tags" TEXT[],
    "attachments" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "serviceId" TEXT,

    CONSTRAINT "ITTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ITProjectDocument" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "url" TEXT,
    "fileType" TEXT,
    "fileSize" INTEGER DEFAULT 0,
    "category" TEXT NOT NULL DEFAULT 'GENERAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "content" TEXT,

    CONSTRAINT "ITProjectDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ITProjectMilestone" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paymentAmount" DOUBLE PRECISION,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ITProjectMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ITTimeEntry" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "projectId" TEXT,
    "taskId" TEXT,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hours" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "isBillable" BOOLEAN NOT NULL DEFAULT false,
    "hourlyRate" DOUBLE PRECISION,
    "amount" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ITTimeEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ITTaskStatusHistory" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "changedById" TEXT NOT NULL,
    "previousStatus" "TaskStatus" NOT NULL,
    "newStatus" "TaskStatus" NOT NULL,
    "comment" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ITTaskStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ITProjectComment" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "parentId" TEXT,

    CONSTRAINT "ITProjectComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ITTaskComment" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ITTaskComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ITDepartmentRevenue" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "totalRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "projectRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taskRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalProjects" INTEGER NOT NULL DEFAULT 0,
    "totalTasks" INTEGER NOT NULL DEFAULT 0,
    "completedTasks" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ITDepartmentRevenue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ITPerformanceMetric" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "tasksCompleted" INTEGER NOT NULL DEFAULT 0,
    "tasksInProgress" INTEGER NOT NULL DEFAULT 0,
    "tasksCreated" INTEGER NOT NULL DEFAULT 0,
    "averageCompletionTime" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "revenueGenerated" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "billableHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "nonBillableHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "productivityScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ITPerformanceMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ITServiceDefinition" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'GENERAL',
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL DEFAULT 'each',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "estimatedDays" INTEGER,

    CONSTRAINT "ITServiceDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RevenueTransaction" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "transactionNumber" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "paymentMethod" TEXT NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "customerName" TEXT,
    "customerEmail" TEXT,
    "customerPhone" TEXT,
    "customerProfileId" TEXT,
    "institutionId" TEXT,
    "referenceNumber" TEXT,
    "bankName" TEXT,
    "proofDocument" TEXT,
    "claimedByEmployeeId" TEXT,
    "approvedByManagerId" TEXT,
    "departmentId" TEXT,
    "status" "RevenueStatus" NOT NULL DEFAULT 'PENDING',
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "verifiedAt" TIMESTAMP(3),
    "workReportId" TEXT,
    "invoiceId" TEXT,
    "paymentId" TEXT,
    "description" TEXT,
    "notes" TEXT,
    "tags" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "revenueType" "RevenueType" DEFAULT 'NEW',
    "source" TEXT DEFAULT 'Subscription',
    "sourceOther" TEXT,

    CONSTRAINT "RevenueTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseAllocationRule" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "percentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExpenseAllocationRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeExpenseAllocation" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "employeeProfileId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "revenueTransactionId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "percentage" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeExpenseAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RevenueClaim" (
    "id" TEXT NOT NULL,
    "revenueTransactionId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "workReportId" TEXT,
    "claimDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "claimAmount" DOUBLE PRECISION NOT NULL,
    "claimReason" TEXT,
    "status" "ClaimStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RevenueClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AccountType" NOT NULL,
    "description" TEXT,
    "parentAccountId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalEntry" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "entryNumber" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "reference" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "postedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JournalEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalLine" (
    "id" TEXT NOT NULL,
    "journalEntryId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "description" TEXT,
    "debit" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "credit" DECIMAL(20,2) NOT NULL DEFAULT 0,

    CONSTRAINT "JournalLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankReconciliationSession" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "uploadedByUserId" TEXT,
    "sourceFileName" TEXT,
    "sourceType" TEXT NOT NULL DEFAULT 'CSV',
    "status" TEXT NOT NULL DEFAULT 'ANALYZED',
    "totalTransactions" INTEGER NOT NULL DEFAULT 0,
    "matchedCount" INTEGER NOT NULL DEFAULT 0,
    "pendingCount" INTEGER NOT NULL DEFAULT 0,
    "unmatchedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "BankReconciliationSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankReconciliationLine" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "journalEntryId" TEXT,
    "lineNumber" INTEGER NOT NULL,
    "externalId" TEXT,
    "transactionDate" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "transactionType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "matchConfidence" DOUBLE PRECISION,
    "notes" TEXT,
    "rawData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "reconciledAt" TIMESTAMP(3),
    "ignoredAt" TIMESTAMP(3),

    CONSTRAINT "BankReconciliationLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxRate" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "rate" DECIMAL(5,2) NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemEmailLog" (
    "id" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "messageId" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "SystemEmailLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StageAssignment" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "stage" "ManuscriptStatus" NOT NULL,
    "assigneeId" TEXT NOT NULL,
    "assignedById" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "comments" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),

    CONSTRAINT "StageAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deal" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "stage" "DealStage" NOT NULL DEFAULT 'DISCOVERY',
    "probability" INTEGER NOT NULL DEFAULT 20,
    "expectedCloseDate" TIMESTAMP(3),
    "customerId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "companyId" TEXT,

    CONSTRAINT "Deal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoalEvaluation" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "evaluatorId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "feedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GoalEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalaryIncrementReview" (
    "id" TEXT NOT NULL,
    "incrementRecordId" TEXT NOT NULL,
    "type" "ReviewType" NOT NULL DEFAULT 'MONTHLY',
    "month" INTEGER,
    "year" INTEGER,
    "period" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewerId" TEXT NOT NULL,
    "revenueAchievement" DOUBLE PRECISION DEFAULT 0,
    "kraProgress" TEXT,
    "kpiProgress" JSONB,
    "rating" DOUBLE PRECISION,
    "comments" TEXT,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalaryIncrementReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "companyId" TEXT NOT NULL,
    "managerId" TEXT,
    "leadId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectMember" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Issue" (
    "id" TEXT NOT NULL,
    "projectId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "type" TEXT NOT NULL DEFAULT 'BUG',
    "assigneeId" TEXT,
    "reporterId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3),

    CONSTRAINT "Issue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IssueFollowUp" (
    "id" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IssueFollowUp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScreeningTemplate" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "companyId" TEXT,
    "jobRoleId" TEXT,
    "department" TEXT,
    "jobType" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "categories" JSONB NOT NULL,
    "questions" JSONB NOT NULL,
    "weights" JSONB,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScreeningTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewScreening" (
    "id" TEXT NOT NULL,
    "interviewId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "templateVersion" INTEGER NOT NULL,
    "overallScore" DOUBLE PRECISION,
    "categoryScores" JSONB,
    "recommendation" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "submittedBy" TEXT,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InterviewScreening_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScreeningResponse" (
    "id" TEXT NOT NULL,
    "screeningId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "rating" INTEGER,
    "checkboxStatus" TEXT,
    "notes" TEXT,
    "flags" TEXT,
    "followupsUsed" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScreeningResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RedGreenDiary" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "recordedById" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RedGreenDiary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ITProjectSuggestion" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "authorName" TEXT,
    "authorEmail" TEXT,
    "userId" TEXT,
    "content" TEXT NOT NULL,
    "status" "SuggestionStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "attachments" JSONB,

    CONSTRAINT "ITProjectSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MentorSession" (
    "id" TEXT NOT NULL,
    "workshopId" TEXT NOT NULL,
    "mentorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "durationMins" INTEGER NOT NULL DEFAULT 60,
    "meetingLink" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MentorSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PeerReview" (
    "id" TEXT NOT NULL,
    "performanceReviewId" TEXT NOT NULL,
    "peerId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "feedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PeerReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnonymousFeedback" (
    "id" TEXT NOT NULL,
    "performanceReviewId" TEXT NOT NULL,
    "feedback" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'GENERAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnonymousFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketingCampaign" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "type" TEXT NOT NULL DEFAULT 'EMAIL',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "audienceId" TEXT,
    "templateId" TEXT,
    "companyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketingCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignAudience" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "queryFilter" JSONB,
    "companyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignAudience_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "categoryId" TEXT,
    "priceINR" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "priceUSD" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserFeedback" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyId" TEXT,
    "category" TEXT NOT NULL DEFAULT 'GENERAL',
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "UserFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeedbackMessage" (
    "id" TEXT NOT NULL,
    "feedbackId" TEXT NOT NULL,
    "senderId" TEXT,
    "content" TEXT NOT NULL,
    "isAdminReply" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeedbackMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeedbackAttachment" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeedbackAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FileRecord" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "storedName" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "context" TEXT,
    "checksum" TEXT,
    "syncedAt" TIMESTAMP(3),
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FileRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThinkTankIdeaCycle" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "windowEnd" TIMESTAMP(3) NOT NULL,
    "revealAt" TIMESTAMP(3) NOT NULL,
    "cycleLabel" TEXT,
    "renewalAt" TIMESTAMP(3),
    "status" "ThinkTankCycleStatus" NOT NULL DEFAULT 'ACTIVE',
    "revealedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ThinkTankIdeaCycle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThinkTankIdea" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "ThinkTankIdeaCategory" NOT NULL,
    "status" "ThinkTankIdeaStatus" NOT NULL DEFAULT 'DRAFT',
    "reviewStage" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "plannerEncrypted" TEXT NOT NULL,
    "plannerHash" TEXT NOT NULL,
    "visibleAuthorId" TEXT,
    "revealedAt" TIMESTAMP(3),
    "duplicateDecision" "ThinkTankDuplicateDecision",
    "weightedScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "voteCount" INTEGER NOT NULL DEFAULT 0,
    "implementationStatus" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "decisionNotes" TEXT,
    "shortlistedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "implementedAt" TIMESTAMP(3),
    "decisionById" TEXT,
    "finalScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "communityScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reviewerScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ideaReadinessScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "questionCount" INTEGER NOT NULL DEFAULT 0,
    "isVetoed" BOOLEAN NOT NULL DEFAULT false,
    "vetoedAt" TIMESTAMP(3),
    "vetoedById" TEXT,
    "vetoReason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ThinkTankIdea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThinkTankIdeaPartner" (
    "id" TEXT NOT NULL,
    "ideaId" TEXT NOT NULL,
    "userEncrypted" TEXT NOT NULL,
    "userHash" TEXT NOT NULL,
    "visibleUserId" TEXT,
    "roleType" "ThinkTankParticipantRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ThinkTankIdeaPartner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThinkTankIdeaTeamMember" (
    "id" TEXT NOT NULL,
    "ideaId" TEXT NOT NULL,
    "userEncrypted" TEXT NOT NULL,
    "userHash" TEXT NOT NULL,
    "visibleUserId" TEXT,
    "roleType" "ThinkTankParticipantRole" NOT NULL DEFAULT 'CO_OPTED',
    "sourceCategory" "ThinkTankIdeaCategory",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ThinkTankIdeaTeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThinkTankIdeaVote" (
    "id" TEXT NOT NULL,
    "ideaId" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "voterEncrypted" TEXT NOT NULL,
    "voterHash" TEXT NOT NULL,
    "vote" "ThinkTankVoteState" NOT NULL,
    "weight" INTEGER NOT NULL,
    "weightedValue" INTEGER NOT NULL,
    "pointAllocation" INTEGER NOT NULL DEFAULT 0,
    "maxAllowedPoints" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ThinkTankIdeaVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThinkTankPointAccount" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "basePoints" INTEGER NOT NULL,
    "maxPerIdeaPoints" INTEGER NOT NULL,
    "allocatedPoints" INTEGER NOT NULL DEFAULT 0,
    "remainingPoints" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ThinkTankPointAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThinkTankIdeaAttachment" (
    "id" TEXT NOT NULL,
    "ideaId" TEXT NOT NULL,
    "fileRecordId" TEXT,
    "url" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "scrubStatus" TEXT DEFAULT 'SCRUBBED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ThinkTankIdeaAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThinkTankIdeaAuditEvent" (
    "id" TEXT NOT NULL,
    "ideaId" TEXT,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ThinkTankIdeaAuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThinkTankIdeaDuplicateMatch" (
    "id" TEXT NOT NULL,
    "ideaId" TEXT NOT NULL,
    "matchedIdeaId" TEXT NOT NULL,
    "similarityScore" DOUBLE PRECISION NOT NULL,
    "decision" "ThinkTankDuplicateDecision",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ThinkTankIdeaDuplicateMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThinkTankIdeaComment" (
    "id" TEXT NOT NULL,
    "ideaId" TEXT NOT NULL,
    "authorUserId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isInternal" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ThinkTankIdeaComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThinkTankIdeaQuestion" (
    "id" TEXT NOT NULL,
    "ideaId" TEXT NOT NULL,
    "askedByUserId" TEXT NOT NULL,
    "answeredByUserId" TEXT,
    "question" TEXT NOT NULL,
    "answer" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "answeredAt" TIMESTAMP(3),

    CONSTRAINT "ThinkTankIdeaQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThinkTankIdeaReviewerScore" (
    "id" TEXT NOT NULL,
    "ideaId" TEXT NOT NULL,
    "reviewerUserId" TEXT NOT NULL,
    "impactScore" INTEGER NOT NULL DEFAULT 0,
    "feasibilityScore" INTEGER NOT NULL DEFAULT 0,
    "costScore" INTEGER NOT NULL DEFAULT 0,
    "speedScore" INTEGER NOT NULL DEFAULT 0,
    "strategicFitScore" INTEGER NOT NULL DEFAULT 0,
    "scalabilityScore" INTEGER NOT NULL DEFAULT 0,
    "totalScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ThinkTankIdeaReviewerScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThinkTankPointsMapping" (
    "id" TEXT NOT NULL,
    "ideaId" TEXT NOT NULL,
    "userEncrypted" TEXT NOT NULL,
    "userHash" TEXT NOT NULL,
    "visibleUserId" TEXT,
    "points" DOUBLE PRECISION NOT NULL,
    "awardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ThinkTankPointsMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProblemIssue" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "severity" "ProblemSeverity" NOT NULL DEFAULT 'MEDIUM',
    "status" "ProblemStatus" NOT NULL DEFAULT 'SUBMITTED',
    "visibility" "ProblemVisibility" NOT NULL DEFAULT 'NAMED',
    "recurrence" "ProblemRecurrence" NOT NULL DEFAULT 'ONE_TIME',
    "impactType" "ProblemImpactType" NOT NULL DEFAULT 'OTHER',
    "location" TEXT,
    "affectedArea" TEXT,
    "departmentName" TEXT,
    "isSensitive" BOOLEAN NOT NULL DEFAULT false,
    "aiSummary" TEXT,
    "rootCauseSummary" TEXT,
    "resolutionSummary" TEXT,
    "dueAt" TIMESTAMP(3),
    "acknowledgedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "reopenedAt" TIMESTAMP(3),
    "mergedIntoId" TEXT,
    "reportedById" TEXT NOT NULL,
    "assignedToId" TEXT,
    "resolvedById" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProblemIssue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProblemIssueComment" (
    "id" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "authorUserId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProblemIssueComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProblemIssueInternalNote" (
    "id" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "authorUserId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProblemIssueInternalNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProblemIssueAttachment" (
    "id" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "fileRecordId" TEXT,
    "url" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProblemIssueAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProblemIssueWatcher" (
    "id" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProblemIssueWatcher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProblemIssueAssignmentHistory" (
    "id" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "previousAssigneeId" TEXT,
    "newAssigneeId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProblemIssueAssignmentHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProblemIssueStatusHistory" (
    "id" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "fromStatus" "ProblemStatus",
    "toStatus" "ProblemStatus" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProblemIssueStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProblemIssueDuplicateLink" (
    "id" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "matchedIssueId" TEXT NOT NULL,
    "similarityScore" DOUBLE PRECISION NOT NULL,
    "decision" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProblemIssueDuplicateLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProblemIssueAuditEvent" (
    "id" TEXT NOT NULL,
    "issueId" TEXT,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProblemIssueAuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProblemIssueResolutionFeedback" (
    "id" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProblemIssueResolutionFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VaultKeyring" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "encryptedPrivKey" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "salt" TEXT NOT NULL,
    "iv" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VaultKeyring_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VaultFolder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT DEFAULT '#3b82f6',
    "icon" TEXT DEFAULT 'folder',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VaultFolder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VaultItem" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "folderId" TEXT,
    "type" TEXT NOT NULL DEFAULT 'LOGIN',
    "title" TEXT NOT NULL,
    "username" TEXT,
    "website" TEXT,
    "icon" TEXT,
    "encryptedData" TEXT NOT NULL,
    "iv" TEXT NOT NULL,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "isShared" BOOLEAN NOT NULL DEFAULT false,
    "lastPasswordUpdate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "encryptedKey" TEXT NOT NULL,

    CONSTRAINT "VaultItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VaultAccess" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "grantedToId" TEXT NOT NULL,
    "grantedById" TEXT NOT NULL,
    "encryptedKey" TEXT NOT NULL,
    "canEdit" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VaultAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LMSParticipant" (
    "id" TEXT NOT NULL,
    "pid" TEXT NOT NULL,
    "workshopTitle" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "mobileNumber" TEXT,
    "currentAffiliation" TEXT,
    "profession" TEXT,
    "designation" TEXT,
    "address" TEXT,
    "state" TEXT,
    "country" TEXT,
    "pinCode" TEXT,
    "gstVatNo" TEXT,
    "courseFee" DOUBLE PRECISION DEFAULT 0,
    "hasCoupon" BOOLEAN NOT NULL DEFAULT false,
    "couponCode" TEXT,
    "payableAmount" DOUBLE PRECISION DEFAULT 0,
    "otherCurrency" TEXT,
    "referralSource" TEXT,
    "paymentStatus" TEXT,
    "razorpayOrderId" TEXT,
    "razorpayPaymentId" TEXT,
    "razorpaySignature" TEXT,
    "learningMode" TEXT,
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LMSParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReimbursementRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "healthCare" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "travelling" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "mobile" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "internet" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "booksAndPeriodicals" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "employeeSignatureUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReimbursementRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_CompanyToDesignation" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CompanyToDesignation_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_UserCompanies" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_UserCompanies_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_DepartmentToDesignation" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_DepartmentToDesignation_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_CustomerToExecutives" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CustomerToExecutives_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_JournalToIndexing" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_JournalToIndexing_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_ProjectTaggedEmployees" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ProjectTaggedEmployees_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "CompanyIntegration_companyId_idx" ON "CompanyIntegration"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyIntegration_companyId_provider_key" ON "CompanyIntegration"("companyId", "provider");

-- CreateIndex
CREATE INDEX "AutomationJob_companyId_idx" ON "AutomationJob"("companyId");

-- CreateIndex
CREATE INDEX "AutomationJob_action_idx" ON "AutomationJob"("action");

-- CreateIndex
CREATE UNIQUE INDEX "AutomationJob_companyId_key_key" ON "AutomationJob"("companyId", "key");

-- CreateIndex
CREATE INDEX "AutomationRun_jobId_idx" ON "AutomationRun"("jobId");

-- CreateIndex
CREATE INDEX "AutomationRun_companyId_idx" ON "AutomationRun"("companyId");

-- CreateIndex
CREATE INDEX "AutomationRun_triggeredBy_idx" ON "AutomationRun"("triggeredBy");

-- CreateIndex
CREATE INDEX "AutomationRun_startedAt_idx" ON "AutomationRun"("startedAt");

-- CreateIndex
CREATE INDEX "Department_companyId_idx" ON "Department"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Department_companyId_code_key" ON "Department"("companyId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_companyId_idx" ON "User"("companyId");

-- CreateIndex
CREATE INDEX "User_departmentId_idx" ON "User"("departmentId");

-- CreateIndex
CREATE INDEX "TeamMember_managerId_idx" ON "TeamMember"("managerId");

-- CreateIndex
CREATE INDEX "TeamMember_userId_idx" ON "TeamMember"("userId");

-- CreateIndex
CREATE INDEX "TeamMember_companyId_idx" ON "TeamMember"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamMember_managerId_userId_companyId_key" ON "TeamMember"("managerId", "userId", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_token_key" ON "PasswordResetToken"("token");

-- CreateIndex
CREATE INDEX "PasswordResetToken_token_idx" ON "PasswordResetToken"("token");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- CreateIndex
CREATE INDEX "KnowledgeArticle_category_idx" ON "KnowledgeArticle"("category");

-- CreateIndex
CREATE INDEX "KnowledgeArticle_status_idx" ON "KnowledgeArticle"("status");

-- CreateIndex
CREATE INDEX "KnowledgeArticle_targetRole_idx" ON "KnowledgeArticle"("targetRole");

-- CreateIndex
CREATE INDEX "KnowledgeArticleRevision_articleId_idx" ON "KnowledgeArticleRevision"("articleId");

-- CreateIndex
CREATE INDEX "KnowledgeArticleRevision_editorId_idx" ON "KnowledgeArticleRevision"("editorId");

-- CreateIndex
CREATE INDEX "KnowledgeArticleRevision_createdAt_idx" ON "KnowledgeArticleRevision"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerProfile_userId_key" ON "CustomerProfile"("userId");

-- CreateIndex
CREATE INDEX "CustomerProfile_customerType_idx" ON "CustomerProfile"("customerType");

-- CreateIndex
CREATE INDEX "CustomerProfile_primaryEmail_idx" ON "CustomerProfile"("primaryEmail");

-- CreateIndex
CREATE INDEX "CustomerProfile_companyId_idx" ON "CustomerProfile"("companyId");

-- CreateIndex
CREATE INDEX "CustomerProfile_institutionId_idx" ON "CustomerProfile"("institutionId");

-- CreateIndex
CREATE INDEX "CustomerProfile_agencyId_idx" ON "CustomerProfile"("agencyId");

-- CreateIndex
CREATE INDEX "CustomerProfile_designation_idx" ON "CustomerProfile"("designation");

-- CreateIndex
CREATE INDEX "CommissionPayout_agencyProfileId_idx" ON "CommissionPayout"("agencyProfileId");

-- CreateIndex
CREATE INDEX "CommissionPayout_companyId_idx" ON "CommissionPayout"("companyId");

-- CreateIndex
CREATE INDEX "CommissionPayout_status_idx" ON "CommissionPayout"("status");

-- CreateIndex
CREATE INDEX "CommissionPayout_requestedByUserId_idx" ON "CommissionPayout"("requestedByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "InstitutionDetails_customerProfileId_key" ON "InstitutionDetails"("customerProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "AgencyDetails_customerProfileId_key" ON "AgencyDetails"("customerProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "AgencyPerformance_agencyDetailsId_key" ON "AgencyPerformance"("agencyDetailsId");

-- CreateIndex
CREATE UNIQUE INDEX "Institution_code_key" ON "Institution"("code");

-- CreateIndex
CREATE INDEX "Institution_code_idx" ON "Institution"("code");

-- CreateIndex
CREATE INDEX "Institution_type_idx" ON "Institution"("type");

-- CreateIndex
CREATE INDEX "Institution_companyId_idx" ON "Institution"("companyId");

-- CreateIndex
CREATE INDEX "CustomerAssignment_customerId_idx" ON "CustomerAssignment"("customerId");

-- CreateIndex
CREATE INDEX "CustomerAssignment_employeeId_idx" ON "CustomerAssignment"("employeeId");

-- CreateIndex
CREATE INDEX "CustomerAssignment_isActive_idx" ON "CustomerAssignment"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerAssignment_customerId_employeeId_key" ON "CustomerAssignment"("customerId", "employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "Journal_abbreviation_key" ON "Journal"("abbreviation");

-- CreateIndex
CREATE INDEX "Journal_isActive_idx" ON "Journal"("isActive");

-- CreateIndex
CREATE INDEX "Journal_name_idx" ON "Journal"("name");

-- CreateIndex
CREATE INDEX "Journal_domainId_idx" ON "Journal"("domainId");

-- CreateIndex
CREATE INDEX "Journal_publisherId_idx" ON "Journal"("publisherId");

-- CreateIndex
CREATE INDEX "Journal_journalManagerId_idx" ON "Journal"("journalManagerId");

-- CreateIndex
CREATE INDEX "Plan_journalId_idx" ON "Plan"("journalId");

-- CreateIndex
CREATE INDEX "Plan_isActive_idx" ON "Plan"("isActive");

-- CreateIndex
CREATE INDEX "Plan_subscriptionYear_idx" ON "Plan"("subscriptionYear");

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceProduct_sku_key" ON "InvoiceProduct"("sku");

-- CreateIndex
CREATE INDEX "InvoiceProduct_companyId_category_idx" ON "InvoiceProduct"("companyId", "category");

-- CreateIndex
CREATE INDEX "InvoiceProduct_isActive_idx" ON "InvoiceProduct"("isActive");

-- CreateIndex
CREATE INDEX "InvoiceProduct_name_idx" ON "InvoiceProduct"("name");

-- CreateIndex
CREATE INDEX "ProductAttribute_productId_idx" ON "ProductAttribute"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductAttribute_productId_name_key" ON "ProductAttribute"("productId", "name");

-- CreateIndex
CREATE INDEX "ProductAttributeValue_attributeId_idx" ON "ProductAttributeValue"("attributeId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductAttributeValue_attributeId_value_key" ON "ProductAttributeValue"("attributeId", "value");

-- CreateIndex
CREATE UNIQUE INDEX "ProductVariant_sku_key" ON "ProductVariant"("sku");

-- CreateIndex
CREATE INDEX "ProductVariant_productId_idx" ON "ProductVariant"("productId");

-- CreateIndex
CREATE INDEX "ProductVariant_isActive_idx" ON "ProductVariant"("isActive");

-- CreateIndex
CREATE INDEX "VariantAttributeMapping_variantId_idx" ON "VariantAttributeMapping"("variantId");

-- CreateIndex
CREATE INDEX "VariantAttributeMapping_attributeValueId_idx" ON "VariantAttributeMapping"("attributeValueId");

-- CreateIndex
CREATE INDEX "ProductPricingTemplate_category_idx" ON "ProductPricingTemplate"("category");

-- CreateIndex
CREATE INDEX "PricingTemplateVariant_templateId_idx" ON "PricingTemplateVariant"("templateId");

-- CreateIndex
CREATE UNIQUE INDEX "ProformaInvoice_proformaNumber_key" ON "ProformaInvoice"("proformaNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ProformaInvoice_idempotencyKey_key" ON "ProformaInvoice"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "ProformaInvoice_convertedInvoiceId_key" ON "ProformaInvoice"("convertedInvoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "ProformaInvoice_convertedSubId_key" ON "ProformaInvoice"("convertedSubId");

-- CreateIndex
CREATE INDEX "ProformaInvoice_customerProfileId_idx" ON "ProformaInvoice"("customerProfileId");

-- CreateIndex
CREATE INDEX "ProformaInvoice_status_idx" ON "ProformaInvoice"("status");

-- CreateIndex
CREATE INDEX "ProformaInvoice_companyId_idx" ON "ProformaInvoice"("companyId");

-- CreateIndex
CREATE INDEX "ProformaInvoice_createdAt_idx" ON "ProformaInvoice"("createdAt");

-- CreateIndex
CREATE INDEX "ProformaAuditEvent_proformaId_idx" ON "ProformaAuditEvent"("proformaId");

-- CreateIndex
CREATE INDEX "ProformaAuditEvent_createdAt_idx" ON "ProformaAuditEvent"("createdAt");

-- CreateIndex
CREATE INDEX "Subscription_customerProfileId_idx" ON "Subscription"("customerProfileId");

-- CreateIndex
CREATE INDEX "Subscription_status_idx" ON "Subscription"("status");

-- CreateIndex
CREATE INDEX "Subscription_salesChannel_idx" ON "Subscription"("salesChannel");

-- CreateIndex
CREATE INDEX "Subscription_startDate_endDate_idx" ON "Subscription"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "Subscription_companyId_idx" ON "Subscription"("companyId");

-- CreateIndex
CREATE INDEX "Subscription_institutionId_idx" ON "Subscription"("institutionId");

-- CreateIndex
CREATE INDEX "SubscriptionItem_subscriptionId_idx" ON "SubscriptionItem"("subscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_proformaNumber_key" ON "Invoice"("proformaNumber");

-- CreateIndex
CREATE INDEX "Invoice_subscriptionId_idx" ON "Invoice"("subscriptionId");

-- CreateIndex
CREATE INDEX "Invoice_customerProfileId_idx" ON "Invoice"("customerProfileId");

-- CreateIndex
CREATE INDEX "Invoice_status_idx" ON "Invoice"("status");

-- CreateIndex
CREATE INDEX "Invoice_invoiceNumber_idx" ON "Invoice"("invoiceNumber");

-- CreateIndex
CREATE INDEX "Invoice_companyId_idx" ON "Invoice"("companyId");

-- CreateIndex
CREATE INDEX "Invoice_brandId_idx" ON "Invoice"("brandId");

-- CreateIndex
CREATE INDEX "Invoice_couponId_idx" ON "Invoice"("couponId");

-- CreateIndex
CREATE UNIQUE INDEX "Coupon_code_key" ON "Coupon"("code");

-- CreateIndex
CREATE INDEX "Coupon_code_idx" ON "Coupon"("code");

-- CreateIndex
CREATE INDEX "Coupon_companyId_idx" ON "Coupon"("companyId");

-- CreateIndex
CREATE INDEX "Coupon_isActive_idx" ON "Coupon"("isActive");

-- CreateIndex
CREATE INDEX "Brand_companyId_idx" ON "Brand"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_razorpayPaymentId_key" ON "Payment"("razorpayPaymentId");

-- CreateIndex
CREATE INDEX "Payment_invoiceId_idx" ON "Payment"("invoiceId");

-- CreateIndex
CREATE INDEX "Payment_companyId_idx" ON "Payment"("companyId");

-- CreateIndex
CREATE INDEX "CommunicationLog_customerProfileId_idx" ON "CommunicationLog"("customerProfileId");

-- CreateIndex
CREATE INDEX "CommunicationLog_type_idx" ON "CommunicationLog"("type");

-- CreateIndex
CREATE INDEX "CommunicationLog_date_idx" ON "CommunicationLog"("date");

-- CreateIndex
CREATE INDEX "CommunicationLog_nextFollowUpDate_idx" ON "CommunicationLog"("nextFollowUpDate");

-- CreateIndex
CREATE INDEX "CommunicationLog_companyId_idx" ON "CommunicationLog"("companyId");

-- CreateIndex
CREATE INDEX "CommunicationLog_institutionId_idx" ON "CommunicationLog"("institutionId");

-- CreateIndex
CREATE UNIQUE INDEX "ConversationChecklist_communicationLogId_key" ON "ConversationChecklist"("communicationLogId");

-- CreateIndex
CREATE INDEX "ConversationChecklist_communicationLogId_idx" ON "ConversationChecklist"("communicationLogId");

-- CreateIndex
CREATE INDEX "ConversationChecklist_companyId_idx" ON "ConversationChecklist"("companyId");

-- CreateIndex
CREATE INDEX "ConversationChecklist_customerHealth_idx" ON "ConversationChecklist"("customerHealth");

-- CreateIndex
CREATE INDEX "Task_userId_idx" ON "Task"("userId");

-- CreateIndex
CREATE INDEX "Task_assignedById_idx" ON "Task"("assignedById");

-- CreateIndex
CREATE INDEX "Task_status_idx" ON "Task"("status");

-- CreateIndex
CREATE INDEX "Task_dueDate_idx" ON "Task"("dueDate");

-- CreateIndex
CREATE INDEX "Task_companyId_idx" ON "Task"("companyId");

-- CreateIndex
CREATE INDEX "Task_inventoryItemId_idx" ON "Task"("inventoryItemId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "ChatRoom_companyId_idx" ON "ChatRoom"("companyId");

-- CreateIndex
CREATE INDEX "ChatParticipant_roomId_idx" ON "ChatParticipant"("roomId");

-- CreateIndex
CREATE INDEX "ChatParticipant_userId_idx" ON "ChatParticipant"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ChatParticipant_roomId_userId_key" ON "ChatParticipant"("roomId", "userId");

-- CreateIndex
CREATE INDEX "ChatMessage_roomId_idx" ON "ChatMessage"("roomId");

-- CreateIndex
CREATE INDEX "ChatMessage_senderId_idx" ON "ChatMessage"("senderId");

-- CreateIndex
CREATE UNIQUE INDEX "SupportTicket_chatRoomId_key" ON "SupportTicket"("chatRoomId");

-- CreateIndex
CREATE INDEX "SupportTicket_companyId_idx" ON "SupportTicket"("companyId");

-- CreateIndex
CREATE INDEX "SupportTicket_customerProfileId_idx" ON "SupportTicket"("customerProfileId");

-- CreateIndex
CREATE INDEX "SupportTicket_status_idx" ON "SupportTicket"("status");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_isRead_idx" ON "Notification"("isRead");

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");

-- CreateIndex
CREATE INDEX "PushSubscription_userId_idx" ON "PushSubscription"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "GlobalDepartment_name_key" ON "GlobalDepartment"("name");

-- CreateIndex
CREATE UNIQUE INDEX "GlobalDesignation_name_key" ON "GlobalDesignation"("name");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeProfile_userId_key" ON "EmployeeProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeProfile_employeeId_key" ON "EmployeeProfile"("employeeId");

-- CreateIndex
CREATE INDEX "EmployeeCompanyDesignation_employeeId_idx" ON "EmployeeCompanyDesignation"("employeeId");

-- CreateIndex
CREATE INDEX "EmployeeCompanyDesignation_companyId_idx" ON "EmployeeCompanyDesignation"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeCompanyDesignation_employeeId_companyId_key" ON "EmployeeCompanyDesignation"("employeeId", "companyId");

-- CreateIndex
CREATE INDEX "SalaryAdvance_employeeId_idx" ON "SalaryAdvance"("employeeId");

-- CreateIndex
CREATE INDEX "SalaryAdvance_companyId_idx" ON "SalaryAdvance"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "AdvanceEMI_salarySlipId_key" ON "AdvanceEMI"("salarySlipId");

-- CreateIndex
CREATE INDEX "SalaryIncrementRecord_employeeProfileId_idx" ON "SalaryIncrementRecord"("employeeProfileId");

-- CreateIndex
CREATE INDEX "SalaryIncrementRecord_status_idx" ON "SalaryIncrementRecord"("status");

-- CreateIndex
CREATE INDEX "Attendance_companyId_idx" ON "Attendance"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_employeeId_date_key" ON "Attendance"("employeeId", "date");

-- CreateIndex
CREATE INDEX "WorkReport_companyId_idx" ON "WorkReport"("companyId");

-- CreateIndex
CREATE INDEX "WorkReport_employeeId_idx" ON "WorkReport"("employeeId");

-- CreateIndex
CREATE INDEX "WorkReportComment_workReportId_idx" ON "WorkReportComment"("workReportId");

-- CreateIndex
CREATE INDEX "Holiday_companyId_idx" ON "Holiday"("companyId");

-- CreateIndex
CREATE INDEX "Holiday_date_idx" ON "Holiday"("date");

-- CreateIndex
CREATE INDEX "Vendor_companyId_idx" ON "Vendor"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrder_poNumber_key" ON "PurchaseOrder"("poNumber");

-- CreateIndex
CREATE INDEX "PurchaseOrder_companyId_idx" ON "PurchaseOrder"("companyId");

-- CreateIndex
CREATE INDEX "PurchaseOrder_vendorId_idx" ON "PurchaseOrder"("vendorId");

-- CreateIndex
CREATE INDEX "PurchaseOrder_status_idx" ON "PurchaseOrder"("status");

-- CreateIndex
CREATE INDEX "PurchaseOrderItem_purchaseOrderId_idx" ON "PurchaseOrderItem"("purchaseOrderId");

-- CreateIndex
CREATE INDEX "PurchaseOrderItem_inventoryItemId_idx" ON "PurchaseOrderItem"("inventoryItemId");

-- CreateIndex
CREATE INDEX "Warehouse_companyId_idx" ON "Warehouse"("companyId");

-- CreateIndex
CREATE INDEX "InventoryItem_companyId_idx" ON "InventoryItem"("companyId");

-- CreateIndex
CREATE INDEX "InventoryItem_warehouseId_idx" ON "InventoryItem"("warehouseId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryItem_sku_companyId_key" ON "InventoryItem"("sku", "companyId");

-- CreateIndex
CREATE INDEX "StockMovement_inventoryItemId_idx" ON "StockMovement"("inventoryItemId");

-- CreateIndex
CREATE INDEX "ProductionOrder_companyId_idx" ON "ProductionOrder"("companyId");

-- CreateIndex
CREATE INDEX "SalarySlip_companyId_idx" ON "SalarySlip"("companyId");

-- CreateIndex
CREATE INDEX "ArrearRecord_salarySlipId_idx" ON "ArrearRecord"("salarySlipId");

-- CreateIndex
CREATE INDEX "DepartmentBudget_departmentId_idx" ON "DepartmentBudget"("departmentId");

-- CreateIndex
CREATE INDEX "DepartmentBudget_companyId_idx" ON "DepartmentBudget"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "StatutoryConfig_companyId_key" ON "StatutoryConfig"("companyId");

-- CreateIndex
CREATE INDEX "TaxDeclaration_employeeId_idx" ON "TaxDeclaration"("employeeId");

-- CreateIndex
CREATE INDEX "Shift_companyId_idx" ON "Shift"("companyId");

-- CreateIndex
CREATE INDEX "ShiftRoster_companyId_idx" ON "ShiftRoster"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "ShiftRoster_employeeId_date_key" ON "ShiftRoster"("employeeId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "SalaryStructure_employeeId_key" ON "SalaryStructure"("employeeId");

-- CreateIndex
CREATE INDEX "PerformanceReview_companyId_idx" ON "PerformanceReview"("companyId");

-- CreateIndex
CREATE INDEX "PerformanceReview_salaryIncrementRecordId_idx" ON "PerformanceReview"("salaryIncrementRecordId");

-- CreateIndex
CREATE INDEX "EmployeeKPI_employeeId_idx" ON "EmployeeKPI"("employeeId");

-- CreateIndex
CREATE INDEX "EmployeeKPI_companyId_idx" ON "EmployeeKPI"("companyId");

-- CreateIndex
CREATE INDEX "PerformanceInsight_employeeId_idx" ON "PerformanceInsight"("employeeId");

-- CreateIndex
CREATE INDEX "PerformanceInsight_companyId_idx" ON "PerformanceInsight"("companyId");

-- CreateIndex
CREATE INDEX "LeaveRequest_companyId_idx" ON "LeaveRequest"("companyId");

-- CreateIndex
CREATE INDEX "WorkPlan_companyId_idx" ON "WorkPlan"("companyId");

-- CreateIndex
CREATE INDEX "WorkPlan_linkedGoalId_idx" ON "WorkPlan"("linkedGoalId");

-- CreateIndex
CREATE INDEX "WorkPlan_projectId_idx" ON "WorkPlan"("projectId");

-- CreateIndex
CREATE INDEX "WorkPlan_taskId_idx" ON "WorkPlan"("taskId");

-- CreateIndex
CREATE INDEX "WorkPlan_itProjectId_idx" ON "WorkPlan"("itProjectId");

-- CreateIndex
CREATE INDEX "WorkPlan_itTaskId_idx" ON "WorkPlan"("itTaskId");

-- CreateIndex
CREATE INDEX "WorkPlan_completionStatus_idx" ON "WorkPlan"("completionStatus");

-- CreateIndex
CREATE INDEX "WorkPlan_date_idx" ON "WorkPlan"("date");

-- CreateIndex
CREATE UNIQUE INDEX "WorkPlan_employeeId_date_key" ON "WorkPlan"("employeeId", "date");

-- CreateIndex
CREATE INDEX "OnboardingModule_companyId_idx" ON "OnboardingModule"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "OnboardingProgress_employeeId_moduleId_key" ON "OnboardingProgress"("employeeId", "moduleId");

-- CreateIndex
CREATE INDEX "DocumentTemplate_companyId_idx" ON "DocumentTemplate"("companyId");

-- CreateIndex
CREATE INDEX "DigitalDocument_employeeId_idx" ON "DigitalDocument"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "RecruitmentExam_jobPostingId_key" ON "RecruitmentExam"("jobPostingId");

-- CreateIndex
CREATE UNIQUE INDEX "ExamAttempt_applicationId_key" ON "ExamAttempt"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "RecruitmentInterview_applicationId_level_key" ON "RecruitmentInterview"("applicationId", "level");

-- CreateIndex
CREATE INDEX "DispatchOrder_companyId_idx" ON "DispatchOrder"("companyId");

-- CreateIndex
CREATE INDEX "DispatchOrder_customerProfileId_idx" ON "DispatchOrder"("customerProfileId");

-- CreateIndex
CREATE INDEX "DispatchOrder_invoiceId_idx" ON "DispatchOrder"("invoiceId");

-- CreateIndex
CREATE INDEX "DispatchOrder_status_idx" ON "DispatchOrder"("status");

-- CreateIndex
CREATE INDEX "DispatchOrder_trackingNumber_idx" ON "DispatchOrder"("trackingNumber");

-- CreateIndex
CREATE INDEX "DispatchOrder_fulfillmentType_idx" ON "DispatchOrder"("fulfillmentType");

-- CreateIndex
CREATE INDEX "DispatchOrder_plannedDispatchDate_idx" ON "DispatchOrder"("plannedDispatchDate");

-- CreateIndex
CREATE INDEX "DispatchOrder_invoiceId_fulfillmentType_cycleNumber_idx" ON "DispatchOrder"("invoiceId", "fulfillmentType", "cycleNumber");

-- CreateIndex
CREATE INDEX "EmployeeTaskTemplate_companyId_idx" ON "EmployeeTaskTemplate"("companyId");

-- CreateIndex
CREATE INDEX "EmployeeTaskTemplate_departmentId_idx" ON "EmployeeTaskTemplate"("departmentId");

-- CreateIndex
CREATE INDEX "EmployeeTaskTemplate_designationId_idx" ON "EmployeeTaskTemplate"("designationId");

-- CreateIndex
CREATE INDEX "EmployeeTaskTemplate_employeeId_idx" ON "EmployeeTaskTemplate"("employeeId");

-- CreateIndex
CREATE INDEX "EmployeePointLog_employeeId_idx" ON "EmployeePointLog"("employeeId");

-- CreateIndex
CREATE INDEX "EmployeePointLog_companyId_idx" ON "EmployeePointLog"("companyId");

-- CreateIndex
CREATE INDEX "EmployeePointLog_type_idx" ON "EmployeePointLog"("type");

-- CreateIndex
CREATE INDEX "DailyTaskCompletion_employeeId_idx" ON "DailyTaskCompletion"("employeeId");

-- CreateIndex
CREATE INDEX "DailyTaskCompletion_taskId_idx" ON "DailyTaskCompletion"("taskId");

-- CreateIndex
CREATE INDEX "DailyTaskCompletion_completedAt_idx" ON "DailyTaskCompletion"("completedAt");

-- CreateIndex
CREATE UNIQUE INDEX "DailyTaskCompletion_employeeId_taskId_completedAt_key" ON "DailyTaskCompletion"("employeeId", "taskId", "completedAt");

-- CreateIndex
CREATE INDEX "MonthlyPerformanceSnapshot_companyId_month_year_idx" ON "MonthlyPerformanceSnapshot"("companyId", "month", "year");

-- CreateIndex
CREATE INDEX "MonthlyPerformanceSnapshot_departmentId_month_year_idx" ON "MonthlyPerformanceSnapshot"("departmentId", "month", "year");

-- CreateIndex
CREATE INDEX "MonthlyPerformanceSnapshot_overallScore_idx" ON "MonthlyPerformanceSnapshot"("overallScore");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyPerformanceSnapshot_employeeId_month_year_key" ON "MonthlyPerformanceSnapshot"("employeeId", "month", "year");

-- CreateIndex
CREATE INDEX "DepartmentPerformance_companyId_month_year_idx" ON "DepartmentPerformance"("companyId", "month", "year");

-- CreateIndex
CREATE UNIQUE INDEX "DepartmentPerformance_departmentId_month_year_key" ON "DepartmentPerformance"("departmentId", "month", "year");

-- CreateIndex
CREATE INDEX "CompanyPerformance_month_year_idx" ON "CompanyPerformance"("month", "year");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyPerformance_companyId_month_year_key" ON "CompanyPerformance"("companyId", "month", "year");

-- CreateIndex
CREATE UNIQUE INDEX "Article_doi_key" ON "Article"("doi");

-- CreateIndex
CREATE UNIQUE INDEX "Article_manuscriptId_key" ON "Article"("manuscriptId");

-- CreateIndex
CREATE INDEX "Article_manuscriptId_idx" ON "Article"("manuscriptId");

-- CreateIndex
CREATE INDEX "Article_manuscriptStatus_idx" ON "Article"("manuscriptStatus");

-- CreateIndex
CREATE INDEX "Article_volumeId_idx" ON "Article"("volumeId");

-- CreateIndex
CREATE INDEX "Article_year_idx" ON "Article"("year");

-- CreateIndex
CREATE INDEX "Review_articleId_idx" ON "Review"("articleId");

-- CreateIndex
CREATE INDEX "Review_reviewerId_idx" ON "Review"("reviewerId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkshopEnrollment_userId_workshopId_key" ON "WorkshopEnrollment"("userId", "workshopId");

-- CreateIndex
CREATE UNIQUE INDEX "InternshipApplication_userId_internshipId_key" ON "InternshipApplication"("userId", "internshipId");

-- CreateIndex
CREATE INDEX "LMSEmailLog_type_referenceId_date_idx" ON "LMSEmailLog"("type", "referenceId", "date");

-- CreateIndex
CREATE INDEX "LMSDailyRevenue_type_referenceId_date_idx" ON "LMSDailyRevenue"("type", "referenceId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "LMSExpenseConfig_type_referenceId_key" ON "LMSExpenseConfig"("type", "referenceId");

-- CreateIndex
CREATE INDEX "LMSMentorPayment_mentorId_status_idx" ON "LMSMentorPayment"("mentorId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CourseEnrollment_userId_courseId_key" ON "CourseEnrollment"("userId", "courseId");

-- CreateIndex
CREATE UNIQUE INDEX "UserLessonProgress_userId_lessonId_key" ON "UserLessonProgress"("userId", "lessonId");

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_enrollmentId_key" ON "Certificate"("enrollmentId");

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_verificationCode_key" ON "Certificate"("verificationCode");

-- CreateIndex
CREATE INDEX "ITAsset_companyId_idx" ON "ITAsset"("companyId");

-- CreateIndex
CREATE INDEX "ITAsset_assignedToId_idx" ON "ITAsset"("assignedToId");

-- CreateIndex
CREATE INDEX "ITSupportTicket_companyId_idx" ON "ITSupportTicket"("companyId");

-- CreateIndex
CREATE INDEX "ITSupportTicket_requesterId_idx" ON "ITSupportTicket"("requesterId");

-- CreateIndex
CREATE INDEX "ITSupportTicket_assignedToId_idx" ON "ITSupportTicket"("assignedToId");

-- CreateIndex
CREATE INDEX "ITSupportTicket_status_idx" ON "ITSupportTicket"("status");

-- CreateIndex
CREATE INDEX "ITSupportTicket_priority_idx" ON "ITSupportTicket"("priority");

-- CreateIndex
CREATE INDEX "FinancialRecord_companyId_idx" ON "FinancialRecord"("companyId");

-- CreateIndex
CREATE INDEX "FinancialRecord_type_idx" ON "FinancialRecord"("type");

-- CreateIndex
CREATE INDEX "FinancialRecord_category_idx" ON "FinancialRecord"("category");

-- CreateIndex
CREATE INDEX "FinancialRecord_date_idx" ON "FinancialRecord"("date");

-- CreateIndex
CREATE INDEX "LeaveLedger_companyId_idx" ON "LeaveLedger"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "LeaveLedger_employeeId_month_year_key" ON "LeaveLedger"("employeeId", "month", "year");

-- CreateIndex
CREATE INDEX "EmployeeGoal_employeeId_idx" ON "EmployeeGoal"("employeeId");

-- CreateIndex
CREATE INDEX "EmployeeGoal_companyId_idx" ON "EmployeeGoal"("companyId");

-- CreateIndex
CREATE INDEX "EmployeeGoal_reviewerId_idx" ON "EmployeeGoal"("reviewerId");

-- CreateIndex
CREATE INDEX "EmployeeGoal_type_idx" ON "EmployeeGoal"("type");

-- CreateIndex
CREATE INDEX "EmployeeGoal_status_idx" ON "EmployeeGoal"("status");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyPotential_companyId_key" ON "CompanyPotential"("companyId");

-- CreateIndex
CREATE INDEX "EditorialBoardMember_journalId_idx" ON "EditorialBoardMember"("journalId");

-- CreateIndex
CREATE INDEX "EditorialBoardMember_role_idx" ON "EditorialBoardMember"("role");

-- CreateIndex
CREATE INDEX "ArticleVersion_articleId_idx" ON "ArticleVersion"("articleId");

-- CreateIndex
CREATE INDEX "JournalReviewer_journalId_idx" ON "JournalReviewer"("journalId");

-- CreateIndex
CREATE INDEX "JournalReviewer_userId_idx" ON "JournalReviewer"("userId");

-- CreateIndex
CREATE INDEX "JournalReviewer_isActive_idx" ON "JournalReviewer"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "JournalReviewer_journalId_userId_key" ON "JournalReviewer"("journalId", "userId");

-- CreateIndex
CREATE INDEX "ReviewAssignment_articleId_idx" ON "ReviewAssignment"("articleId");

-- CreateIndex
CREATE INDEX "ReviewAssignment_reviewerId_idx" ON "ReviewAssignment"("reviewerId");

-- CreateIndex
CREATE INDEX "ReviewAssignment_status_idx" ON "ReviewAssignment"("status");

-- CreateIndex
CREATE INDEX "ReviewAssignment_dueDate_idx" ON "ReviewAssignment"("dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewReport_assignmentId_key" ON "ReviewReport"("assignmentId");

-- CreateIndex
CREATE INDEX "ReviewReport_assignmentId_idx" ON "ReviewReport"("assignmentId");

-- CreateIndex
CREATE INDEX "ReviewReport_isValidated_idx" ON "ReviewReport"("isValidated");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewCertificate_certificateNumber_key" ON "ReviewCertificate"("certificateNumber");

-- CreateIndex
CREATE INDEX "ReviewCertificate_reviewerId_idx" ON "ReviewCertificate"("reviewerId");

-- CreateIndex
CREATE INDEX "ReviewCertificate_certificateNumber_idx" ON "ReviewCertificate"("certificateNumber");

-- CreateIndex
CREATE INDEX "ReviewCertificate_journalId_idx" ON "ReviewCertificate"("journalId");

-- CreateIndex
CREATE INDEX "ConferenceFeedback_conferenceId_idx" ON "ConferenceFeedback"("conferenceId");

-- CreateIndex
CREATE INDEX "WebsiteMonitorLog_monitorId_idx" ON "WebsiteMonitorLog"("monitorId");

-- CreateIndex
CREATE INDEX "WebsiteMonitorLog_checkedAt_idx" ON "WebsiteMonitorLog"("checkedAt");

-- CreateIndex
CREATE INDEX "AppConfiguration_companyId_idx" ON "AppConfiguration"("companyId");

-- CreateIndex
CREATE INDEX "AppConfiguration_category_idx" ON "AppConfiguration"("category");

-- CreateIndex
CREATE UNIQUE INDEX "AppConfiguration_companyId_category_key_key" ON "AppConfiguration"("companyId", "category", "key");

-- CreateIndex
CREATE UNIQUE INDEX "JournalDomain_name_key" ON "JournalDomain"("name");

-- CreateIndex
CREATE UNIQUE INDEX "JournalDomain_code_key" ON "JournalDomain"("code");

-- CreateIndex
CREATE INDEX "JournalDomain_code_idx" ON "JournalDomain"("code");

-- CreateIndex
CREATE UNIQUE INDEX "JournalIndexing_name_key" ON "JournalIndexing"("name");

-- CreateIndex
CREATE UNIQUE INDEX "JournalIndexing_code_key" ON "JournalIndexing"("code");

-- CreateIndex
CREATE INDEX "JournalIndexing_code_idx" ON "JournalIndexing"("code");

-- CreateIndex
CREATE INDEX "JournalIndexing_tier_idx" ON "JournalIndexing"("tier");

-- CreateIndex
CREATE INDEX "JournalIndexingTracking_journalId_idx" ON "JournalIndexingTracking"("journalId");

-- CreateIndex
CREATE INDEX "JournalIndexingTracking_status_idx" ON "JournalIndexingTracking"("status");

-- CreateIndex
CREATE UNIQUE INDEX "JournalIndexingTracking_journalId_indexingId_key" ON "JournalIndexingTracking"("journalId", "indexingId");

-- CreateIndex
CREATE UNIQUE INDEX "Publisher_name_key" ON "Publisher"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Publisher_code_key" ON "Publisher"("code");

-- CreateIndex
CREATE INDEX "Publisher_code_idx" ON "Publisher"("code");

-- CreateIndex
CREATE UNIQUE INDEX "PlagiarismReport_articleId_key" ON "PlagiarismReport"("articleId");

-- CreateIndex
CREATE INDEX "PlagiarismReport_articleId_idx" ON "PlagiarismReport"("articleId");

-- CreateIndex
CREATE INDEX "PlagiarismReport_journalId_idx" ON "PlagiarismReport"("journalId");

-- CreateIndex
CREATE INDEX "PlagiarismReport_status_idx" ON "PlagiarismReport"("status");

-- CreateIndex
CREATE INDEX "PlagiarismReport_checkedBy_idx" ON "PlagiarismReport"("checkedBy");

-- CreateIndex
CREATE UNIQUE INDEX "QualityReport_articleId_key" ON "QualityReport"("articleId");

-- CreateIndex
CREATE INDEX "QualityReport_articleId_idx" ON "QualityReport"("articleId");

-- CreateIndex
CREATE INDEX "QualityReport_journalId_idx" ON "QualityReport"("journalId");

-- CreateIndex
CREATE INDEX "QualityReport_status_idx" ON "QualityReport"("status");

-- CreateIndex
CREATE INDEX "QualityReport_checkedBy_idx" ON "QualityReport"("checkedBy");

-- CreateIndex
CREATE INDEX "ManuscriptStatusHistory_articleId_idx" ON "ManuscriptStatusHistory"("articleId");

-- CreateIndex
CREATE INDEX "ManuscriptStatusHistory_createdAt_idx" ON "ManuscriptStatusHistory"("createdAt");

-- CreateIndex
CREATE INDEX "ManuscriptDraft_authorId_idx" ON "ManuscriptDraft"("authorId");

-- CreateIndex
CREATE INDEX "ManuscriptDraft_journalId_idx" ON "ManuscriptDraft"("journalId");

-- CreateIndex
CREATE INDEX "ManuscriptDraft_isSubmitted_idx" ON "ManuscriptDraft"("isSubmitted");

-- CreateIndex
CREATE INDEX "PerformanceEvaluation_employeeId_idx" ON "PerformanceEvaluation"("employeeId");

-- CreateIndex
CREATE INDEX "PerformanceEvaluation_evaluatorId_idx" ON "PerformanceEvaluation"("evaluatorId");

-- CreateIndex
CREATE INDEX "PerformanceEvaluation_period_idx" ON "PerformanceEvaluation"("period");

-- CreateIndex
CREATE UNIQUE INDEX "PerformanceEvaluation_employeeId_period_key" ON "PerformanceEvaluation"("employeeId", "period");

-- CreateIndex
CREATE INDEX "ManuscriptRevision_articleId_idx" ON "ManuscriptRevision"("articleId");

-- CreateIndex
CREATE INDEX "ManuscriptRevision_status_idx" ON "ManuscriptRevision"("status");

-- CreateIndex
CREATE INDEX "ManuscriptCommunication_articleId_idx" ON "ManuscriptCommunication"("articleId");

-- CreateIndex
CREATE INDEX "ManuscriptCommunication_toUserId_idx" ON "ManuscriptCommunication"("toUserId");

-- CreateIndex
CREATE INDEX "ManuscriptCommunication_isRead_idx" ON "ManuscriptCommunication"("isRead");

-- CreateIndex
CREATE UNIQUE INDEX "EmailTemplate_name_key" ON "EmailTemplate"("name");

-- CreateIndex
CREATE INDEX "EmailTemplate_category_idx" ON "EmailTemplate"("category");

-- CreateIndex
CREATE INDEX "EmailTemplate_isActive_idx" ON "EmailTemplate"("isActive");

-- CreateIndex
CREATE INDEX "EmailTemplate_companyId_idx" ON "EmailTemplate"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "CoAuthorInvitation_token_key" ON "CoAuthorInvitation"("token");

-- CreateIndex
CREATE INDEX "CoAuthorInvitation_articleId_idx" ON "CoAuthorInvitation"("articleId");

-- CreateIndex
CREATE INDEX "CoAuthorInvitation_email_idx" ON "CoAuthorInvitation"("email");

-- CreateIndex
CREATE INDEX "CoAuthorInvitation_token_idx" ON "CoAuthorInvitation"("token");

-- CreateIndex
CREATE INDEX "CoAuthorInvitation_status_idx" ON "CoAuthorInvitation"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ITProject_projectCode_key" ON "ITProject"("projectCode");

-- CreateIndex
CREATE INDEX "ITProject_companyId_idx" ON "ITProject"("companyId");

-- CreateIndex
CREATE INDEX "ITProject_status_idx" ON "ITProject"("status");

-- CreateIndex
CREATE INDEX "ITProject_type_idx" ON "ITProject"("type");

-- CreateIndex
CREATE INDEX "ITProject_projectManagerId_idx" ON "ITProject"("projectManagerId");

-- CreateIndex
CREATE INDEX "ITProject_isRevenueBased_idx" ON "ITProject"("isRevenueBased");

-- CreateIndex
CREATE INDEX "ITProject_departmentId_idx" ON "ITProject"("departmentId");

-- CreateIndex
CREATE INDEX "ITProject_websiteId_idx" ON "ITProject"("websiteId");

-- CreateIndex
CREATE UNIQUE INDEX "ITTask_taskCode_key" ON "ITTask"("taskCode");

-- CreateIndex
CREATE INDEX "ITTask_companyId_idx" ON "ITTask"("companyId");

-- CreateIndex
CREATE INDEX "ITTask_projectId_idx" ON "ITTask"("projectId");

-- CreateIndex
CREATE INDEX "ITTask_assignedToId_idx" ON "ITTask"("assignedToId");

-- CreateIndex
CREATE INDEX "ITTask_createdById_idx" ON "ITTask"("createdById");

-- CreateIndex
CREATE INDEX "ITTask_status_idx" ON "ITTask"("status");

-- CreateIndex
CREATE INDEX "ITTask_type_idx" ON "ITTask"("type");

-- CreateIndex
CREATE INDEX "ITTask_isRevenueBased_idx" ON "ITTask"("isRevenueBased");

-- CreateIndex
CREATE INDEX "ITTask_priority_idx" ON "ITTask"("priority");

-- CreateIndex
CREATE INDEX "ITProjectDocument_projectId_idx" ON "ITProjectDocument"("projectId");

-- CreateIndex
CREATE INDEX "ITProjectDocument_category_idx" ON "ITProjectDocument"("category");

-- CreateIndex
CREATE INDEX "ITProjectMilestone_projectId_idx" ON "ITProjectMilestone"("projectId");

-- CreateIndex
CREATE INDEX "ITProjectMilestone_status_idx" ON "ITProjectMilestone"("status");

-- CreateIndex
CREATE INDEX "ITTimeEntry_companyId_idx" ON "ITTimeEntry"("companyId");

-- CreateIndex
CREATE INDEX "ITTimeEntry_projectId_idx" ON "ITTimeEntry"("projectId");

-- CreateIndex
CREATE INDEX "ITTimeEntry_taskId_idx" ON "ITTimeEntry"("taskId");

-- CreateIndex
CREATE INDEX "ITTimeEntry_userId_idx" ON "ITTimeEntry"("userId");

-- CreateIndex
CREATE INDEX "ITTimeEntry_date_idx" ON "ITTimeEntry"("date");

-- CreateIndex
CREATE INDEX "ITTaskStatusHistory_taskId_idx" ON "ITTaskStatusHistory"("taskId");

-- CreateIndex
CREATE INDEX "ITTaskStatusHistory_changedById_idx" ON "ITTaskStatusHistory"("changedById");

-- CreateIndex
CREATE INDEX "ITProjectComment_projectId_idx" ON "ITProjectComment"("projectId");

-- CreateIndex
CREATE INDEX "ITProjectComment_userId_idx" ON "ITProjectComment"("userId");

-- CreateIndex
CREATE INDEX "ITProjectComment_parentId_idx" ON "ITProjectComment"("parentId");

-- CreateIndex
CREATE INDEX "ITTaskComment_taskId_idx" ON "ITTaskComment"("taskId");

-- CreateIndex
CREATE INDEX "ITTaskComment_userId_idx" ON "ITTaskComment"("userId");

-- CreateIndex
CREATE INDEX "ITDepartmentRevenue_companyId_idx" ON "ITDepartmentRevenue"("companyId");

-- CreateIndex
CREATE INDEX "ITDepartmentRevenue_year_month_idx" ON "ITDepartmentRevenue"("year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "ITDepartmentRevenue_companyId_month_year_key" ON "ITDepartmentRevenue"("companyId", "month", "year");

-- CreateIndex
CREATE INDEX "ITPerformanceMetric_companyId_idx" ON "ITPerformanceMetric"("companyId");

-- CreateIndex
CREATE INDEX "ITPerformanceMetric_userId_idx" ON "ITPerformanceMetric"("userId");

-- CreateIndex
CREATE INDEX "ITPerformanceMetric_year_month_idx" ON "ITPerformanceMetric"("year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "ITPerformanceMetric_companyId_userId_month_year_key" ON "ITPerformanceMetric"("companyId", "userId", "month", "year");

-- CreateIndex
CREATE INDEX "ITServiceDefinition_companyId_idx" ON "ITServiceDefinition"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "RevenueTransaction_transactionNumber_key" ON "RevenueTransaction"("transactionNumber");

-- CreateIndex
CREATE INDEX "RevenueTransaction_companyId_idx" ON "RevenueTransaction"("companyId");

-- CreateIndex
CREATE INDEX "RevenueTransaction_transactionNumber_idx" ON "RevenueTransaction"("transactionNumber");

-- CreateIndex
CREATE INDEX "RevenueTransaction_claimedByEmployeeId_idx" ON "RevenueTransaction"("claimedByEmployeeId");

-- CreateIndex
CREATE INDEX "RevenueTransaction_status_idx" ON "RevenueTransaction"("status");

-- CreateIndex
CREATE INDEX "RevenueTransaction_paymentDate_idx" ON "RevenueTransaction"("paymentDate");

-- CreateIndex
CREATE INDEX "RevenueTransaction_customerProfileId_idx" ON "RevenueTransaction"("customerProfileId");

-- CreateIndex
CREATE INDEX "ExpenseAllocationRule_companyId_idx" ON "ExpenseAllocationRule"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseAllocationRule_companyId_departmentId_key" ON "ExpenseAllocationRule"("companyId", "departmentId");

-- CreateIndex
CREATE INDEX "EmployeeExpenseAllocation_companyId_idx" ON "EmployeeExpenseAllocation"("companyId");

-- CreateIndex
CREATE INDEX "EmployeeExpenseAllocation_employeeProfileId_idx" ON "EmployeeExpenseAllocation"("employeeProfileId");

-- CreateIndex
CREATE INDEX "EmployeeExpenseAllocation_departmentId_idx" ON "EmployeeExpenseAllocation"("departmentId");

-- CreateIndex
CREATE INDEX "EmployeeExpenseAllocation_revenueTransactionId_idx" ON "EmployeeExpenseAllocation"("revenueTransactionId");

-- CreateIndex
CREATE INDEX "RevenueClaim_revenueTransactionId_idx" ON "RevenueClaim"("revenueTransactionId");

-- CreateIndex
CREATE INDEX "RevenueClaim_employeeId_idx" ON "RevenueClaim"("employeeId");

-- CreateIndex
CREATE INDEX "RevenueClaim_status_idx" ON "RevenueClaim"("status");

-- CreateIndex
CREATE INDEX "Account_companyId_idx" ON "Account"("companyId");

-- CreateIndex
CREATE INDEX "Account_type_idx" ON "Account"("type");

-- CreateIndex
CREATE UNIQUE INDEX "Account_companyId_code_key" ON "Account"("companyId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "JournalEntry_entryNumber_key" ON "JournalEntry"("entryNumber");

-- CreateIndex
CREATE INDEX "JournalEntry_companyId_idx" ON "JournalEntry"("companyId");

-- CreateIndex
CREATE INDEX "JournalEntry_date_idx" ON "JournalEntry"("date");

-- CreateIndex
CREATE INDEX "JournalEntry_entryNumber_idx" ON "JournalEntry"("entryNumber");

-- CreateIndex
CREATE INDEX "JournalLine_journalEntryId_idx" ON "JournalLine"("journalEntryId");

-- CreateIndex
CREATE INDEX "JournalLine_accountId_idx" ON "JournalLine"("accountId");

-- CreateIndex
CREATE INDEX "BankReconciliationSession_companyId_createdAt_idx" ON "BankReconciliationSession"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "BankReconciliationSession_uploadedByUserId_idx" ON "BankReconciliationSession"("uploadedByUserId");

-- CreateIndex
CREATE INDEX "BankReconciliationSession_status_idx" ON "BankReconciliationSession"("status");

-- CreateIndex
CREATE INDEX "BankReconciliationLine_sessionId_status_idx" ON "BankReconciliationLine"("sessionId", "status");

-- CreateIndex
CREATE INDEX "BankReconciliationLine_journalEntryId_idx" ON "BankReconciliationLine"("journalEntryId");

-- CreateIndex
CREATE INDEX "BankReconciliationLine_transactionDate_idx" ON "BankReconciliationLine"("transactionDate");

-- CreateIndex
CREATE UNIQUE INDEX "TaxRate_companyId_code_key" ON "TaxRate"("companyId", "code");

-- CreateIndex
CREATE INDEX "StageAssignment_articleId_idx" ON "StageAssignment"("articleId");

-- CreateIndex
CREATE INDEX "StageAssignment_assigneeId_idx" ON "StageAssignment"("assigneeId");

-- CreateIndex
CREATE INDEX "StageAssignment_stage_idx" ON "StageAssignment"("stage");

-- CreateIndex
CREATE INDEX "Deal_customerId_idx" ON "Deal"("customerId");

-- CreateIndex
CREATE INDEX "Deal_ownerId_idx" ON "Deal"("ownerId");

-- CreateIndex
CREATE INDEX "Deal_stage_idx" ON "Deal"("stage");

-- CreateIndex
CREATE INDEX "Deal_companyId_idx" ON "Deal"("companyId");

-- CreateIndex
CREATE INDEX "SalaryIncrementReview_incrementRecordId_idx" ON "SalaryIncrementReview"("incrementRecordId");

-- CreateIndex
CREATE INDEX "SalaryIncrementReview_reviewerId_idx" ON "SalaryIncrementReview"("reviewerId");

-- CreateIndex
CREATE INDEX "Project_companyId_idx" ON "Project"("companyId");

-- CreateIndex
CREATE INDEX "Project_managerId_idx" ON "Project"("managerId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectMember_projectId_userId_key" ON "ProjectMember"("projectId", "userId");

-- CreateIndex
CREATE INDEX "Issue_projectId_idx" ON "Issue"("projectId");

-- CreateIndex
CREATE INDEX "Issue_companyId_idx" ON "Issue"("companyId");

-- CreateIndex
CREATE INDEX "Issue_assigneeId_idx" ON "Issue"("assigneeId");

-- CreateIndex
CREATE INDEX "IssueFollowUp_issueId_idx" ON "IssueFollowUp"("issueId");

-- CreateIndex
CREATE UNIQUE INDEX "InterviewScreening_interviewId_key" ON "InterviewScreening"("interviewId");

-- CreateIndex
CREATE INDEX "InterviewScreening_applicationId_idx" ON "InterviewScreening"("applicationId");

-- CreateIndex
CREATE INDEX "InterviewScreening_templateId_idx" ON "InterviewScreening"("templateId");

-- CreateIndex
CREATE INDEX "ScreeningResponse_screeningId_idx" ON "ScreeningResponse"("screeningId");

-- CreateIndex
CREATE INDEX "RedGreenDiary_companyId_idx" ON "RedGreenDiary"("companyId");

-- CreateIndex
CREATE INDEX "RedGreenDiary_userId_idx" ON "RedGreenDiary"("userId");

-- CreateIndex
CREATE INDEX "RedGreenDiary_type_idx" ON "RedGreenDiary"("type");

-- CreateIndex
CREATE INDEX "ITProjectSuggestion_projectId_idx" ON "ITProjectSuggestion"("projectId");

-- CreateIndex
CREATE INDEX "ITProjectSuggestion_status_idx" ON "ITProjectSuggestion"("status");

-- CreateIndex
CREATE INDEX "MentorSession_workshopId_idx" ON "MentorSession"("workshopId");

-- CreateIndex
CREATE INDEX "MentorSession_mentorId_idx" ON "MentorSession"("mentorId");

-- CreateIndex
CREATE INDEX "PeerReview_performanceReviewId_idx" ON "PeerReview"("performanceReviewId");

-- CreateIndex
CREATE INDEX "PeerReview_peerId_idx" ON "PeerReview"("peerId");

-- CreateIndex
CREATE UNIQUE INDEX "PeerReview_performanceReviewId_peerId_key" ON "PeerReview"("performanceReviewId", "peerId");

-- CreateIndex
CREATE INDEX "AnonymousFeedback_performanceReviewId_idx" ON "AnonymousFeedback"("performanceReviewId");

-- CreateIndex
CREATE INDEX "MarketingCampaign_companyId_idx" ON "MarketingCampaign"("companyId");

-- CreateIndex
CREATE INDEX "MarketingCampaign_status_idx" ON "MarketingCampaign"("status");

-- CreateIndex
CREATE INDEX "CampaignAudience_companyId_idx" ON "CampaignAudience"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductCategory_name_key" ON "ProductCategory"("name");

-- CreateIndex
CREATE INDEX "UserFeedback_userId_idx" ON "UserFeedback"("userId");

-- CreateIndex
CREATE INDEX "UserFeedback_status_idx" ON "UserFeedback"("status");

-- CreateIndex
CREATE INDEX "UserFeedback_companyId_idx" ON "UserFeedback"("companyId");

-- CreateIndex
CREATE INDEX "FeedbackMessage_feedbackId_idx" ON "FeedbackMessage"("feedbackId");

-- CreateIndex
CREATE INDEX "FeedbackMessage_senderId_idx" ON "FeedbackMessage"("senderId");

-- CreateIndex
CREATE INDEX "FeedbackAttachment_messageId_idx" ON "FeedbackAttachment"("messageId");

-- CreateIndex
CREATE INDEX "FileRecord_uploadedById_idx" ON "FileRecord"("uploadedById");

-- CreateIndex
CREATE INDEX "FileRecord_category_idx" ON "FileRecord"("category");

-- CreateIndex
CREATE INDEX "FileRecord_context_idx" ON "FileRecord"("context");

-- CreateIndex
CREATE INDEX "FileRecord_createdAt_idx" ON "FileRecord"("createdAt");

-- CreateIndex
CREATE INDEX "ThinkTankIdeaCycle_companyId_revealAt_idx" ON "ThinkTankIdeaCycle"("companyId", "revealAt");

-- CreateIndex
CREATE INDEX "ThinkTankIdeaCycle_status_idx" ON "ThinkTankIdeaCycle"("status");

-- CreateIndex
CREATE INDEX "ThinkTankIdea_companyId_status_idx" ON "ThinkTankIdea"("companyId", "status");

-- CreateIndex
CREATE INDEX "ThinkTankIdea_cycleId_idx" ON "ThinkTankIdea"("cycleId");

-- CreateIndex
CREATE INDEX "ThinkTankIdea_category_idx" ON "ThinkTankIdea"("category");

-- CreateIndex
CREATE INDEX "ThinkTankIdea_plannerHash_idx" ON "ThinkTankIdea"("plannerHash");

-- CreateIndex
CREATE INDEX "ThinkTankIdea_revealedAt_idx" ON "ThinkTankIdea"("revealedAt");

-- CreateIndex
CREATE INDEX "ThinkTankIdea_reviewStage_idx" ON "ThinkTankIdea"("reviewStage");

-- CreateIndex
CREATE INDEX "ThinkTankIdea_implementationStatus_idx" ON "ThinkTankIdea"("implementationStatus");

-- CreateIndex
CREATE INDEX "ThinkTankIdea_isVetoed_idx" ON "ThinkTankIdea"("isVetoed");

-- CreateIndex
CREATE INDEX "ThinkTankIdeaPartner_ideaId_roleType_idx" ON "ThinkTankIdeaPartner"("ideaId", "roleType");

-- CreateIndex
CREATE UNIQUE INDEX "ThinkTankIdeaPartner_ideaId_userHash_key" ON "ThinkTankIdeaPartner"("ideaId", "userHash");

-- CreateIndex
CREATE INDEX "ThinkTankIdeaTeamMember_ideaId_idx" ON "ThinkTankIdeaTeamMember"("ideaId");

-- CreateIndex
CREATE UNIQUE INDEX "ThinkTankIdeaTeamMember_ideaId_userHash_key" ON "ThinkTankIdeaTeamMember"("ideaId", "userHash");

-- CreateIndex
CREATE INDEX "ThinkTankIdeaVote_ideaId_idx" ON "ThinkTankIdeaVote"("ideaId");

-- CreateIndex
CREATE INDEX "ThinkTankIdeaVote_cycleId_idx" ON "ThinkTankIdeaVote"("cycleId");

-- CreateIndex
CREATE UNIQUE INDEX "ThinkTankIdeaVote_ideaId_cycleId_voterHash_key" ON "ThinkTankIdeaVote"("ideaId", "cycleId", "voterHash");

-- CreateIndex
CREATE INDEX "ThinkTankPointAccount_companyId_cycleId_idx" ON "ThinkTankPointAccount"("companyId", "cycleId");

-- CreateIndex
CREATE UNIQUE INDEX "ThinkTankPointAccount_cycleId_userId_key" ON "ThinkTankPointAccount"("cycleId", "userId");

-- CreateIndex
CREATE INDEX "ThinkTankIdeaAttachment_ideaId_idx" ON "ThinkTankIdeaAttachment"("ideaId");

-- CreateIndex
CREATE INDEX "ThinkTankIdeaAttachment_fileRecordId_idx" ON "ThinkTankIdeaAttachment"("fileRecordId");

-- CreateIndex
CREATE INDEX "ThinkTankIdeaAuditEvent_ideaId_createdAt_idx" ON "ThinkTankIdeaAuditEvent"("ideaId", "createdAt");

-- CreateIndex
CREATE INDEX "ThinkTankIdeaAuditEvent_actorUserId_idx" ON "ThinkTankIdeaAuditEvent"("actorUserId");

-- CreateIndex
CREATE INDEX "ThinkTankIdeaDuplicateMatch_ideaId_idx" ON "ThinkTankIdeaDuplicateMatch"("ideaId");

-- CreateIndex
CREATE INDEX "ThinkTankIdeaDuplicateMatch_matchedIdeaId_idx" ON "ThinkTankIdeaDuplicateMatch"("matchedIdeaId");

-- CreateIndex
CREATE INDEX "ThinkTankIdeaComment_ideaId_createdAt_idx" ON "ThinkTankIdeaComment"("ideaId", "createdAt");

-- CreateIndex
CREATE INDEX "ThinkTankIdeaComment_authorUserId_idx" ON "ThinkTankIdeaComment"("authorUserId");

-- CreateIndex
CREATE INDEX "ThinkTankIdeaQuestion_ideaId_createdAt_idx" ON "ThinkTankIdeaQuestion"("ideaId", "createdAt");

-- CreateIndex
CREATE INDEX "ThinkTankIdeaQuestion_askedByUserId_idx" ON "ThinkTankIdeaQuestion"("askedByUserId");

-- CreateIndex
CREATE INDEX "ThinkTankIdeaQuestion_status_idx" ON "ThinkTankIdeaQuestion"("status");

-- CreateIndex
CREATE INDEX "ThinkTankIdeaReviewerScore_reviewerUserId_idx" ON "ThinkTankIdeaReviewerScore"("reviewerUserId");

-- CreateIndex
CREATE UNIQUE INDEX "ThinkTankIdeaReviewerScore_ideaId_reviewerUserId_key" ON "ThinkTankIdeaReviewerScore"("ideaId", "reviewerUserId");

-- CreateIndex
CREATE INDEX "ThinkTankPointsMapping_ideaId_idx" ON "ThinkTankPointsMapping"("ideaId");

-- CreateIndex
CREATE INDEX "ThinkTankPointsMapping_visibleUserId_idx" ON "ThinkTankPointsMapping"("visibleUserId");

-- CreateIndex
CREATE INDEX "ProblemIssue_companyId_status_severity_idx" ON "ProblemIssue"("companyId", "status", "severity");

-- CreateIndex
CREATE INDEX "ProblemIssue_reportedById_createdAt_idx" ON "ProblemIssue"("reportedById", "createdAt");

-- CreateIndex
CREATE INDEX "ProblemIssue_assignedToId_status_idx" ON "ProblemIssue"("assignedToId", "status");

-- CreateIndex
CREATE INDEX "ProblemIssue_mergedIntoId_idx" ON "ProblemIssue"("mergedIntoId");

-- CreateIndex
CREATE INDEX "ProblemIssueComment_issueId_createdAt_idx" ON "ProblemIssueComment"("issueId", "createdAt");

-- CreateIndex
CREATE INDEX "ProblemIssueComment_authorUserId_idx" ON "ProblemIssueComment"("authorUserId");

-- CreateIndex
CREATE INDEX "ProblemIssueInternalNote_issueId_createdAt_idx" ON "ProblemIssueInternalNote"("issueId", "createdAt");

-- CreateIndex
CREATE INDEX "ProblemIssueInternalNote_authorUserId_idx" ON "ProblemIssueInternalNote"("authorUserId");

-- CreateIndex
CREATE INDEX "ProblemIssueAttachment_issueId_idx" ON "ProblemIssueAttachment"("issueId");

-- CreateIndex
CREATE INDEX "ProblemIssueAttachment_fileRecordId_idx" ON "ProblemIssueAttachment"("fileRecordId");

-- CreateIndex
CREATE INDEX "ProblemIssueWatcher_userId_idx" ON "ProblemIssueWatcher"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ProblemIssueWatcher_issueId_userId_key" ON "ProblemIssueWatcher"("issueId", "userId");

-- CreateIndex
CREATE INDEX "ProblemIssueAssignmentHistory_issueId_createdAt_idx" ON "ProblemIssueAssignmentHistory"("issueId", "createdAt");

-- CreateIndex
CREATE INDEX "ProblemIssueAssignmentHistory_actorUserId_idx" ON "ProblemIssueAssignmentHistory"("actorUserId");

-- CreateIndex
CREATE INDEX "ProblemIssueStatusHistory_issueId_createdAt_idx" ON "ProblemIssueStatusHistory"("issueId", "createdAt");

-- CreateIndex
CREATE INDEX "ProblemIssueStatusHistory_actorUserId_idx" ON "ProblemIssueStatusHistory"("actorUserId");

-- CreateIndex
CREATE INDEX "ProblemIssueDuplicateLink_issueId_idx" ON "ProblemIssueDuplicateLink"("issueId");

-- CreateIndex
CREATE INDEX "ProblemIssueDuplicateLink_matchedIssueId_idx" ON "ProblemIssueDuplicateLink"("matchedIssueId");

-- CreateIndex
CREATE INDEX "ProblemIssueAuditEvent_issueId_createdAt_idx" ON "ProblemIssueAuditEvent"("issueId", "createdAt");

-- CreateIndex
CREATE INDEX "ProblemIssueAuditEvent_actorUserId_idx" ON "ProblemIssueAuditEvent"("actorUserId");

-- CreateIndex
CREATE INDEX "ProblemIssueResolutionFeedback_issueId_createdAt_idx" ON "ProblemIssueResolutionFeedback"("issueId", "createdAt");

-- CreateIndex
CREATE INDEX "ProblemIssueResolutionFeedback_userId_idx" ON "ProblemIssueResolutionFeedback"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VaultKeyring_userId_key" ON "VaultKeyring"("userId");

-- CreateIndex
CREATE INDEX "VaultFolder_userId_idx" ON "VaultFolder"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VaultFolder_userId_name_key" ON "VaultFolder"("userId", "name");

-- CreateIndex
CREATE INDEX "VaultItem_ownerId_idx" ON "VaultItem"("ownerId");

-- CreateIndex
CREATE INDEX "VaultItem_folderId_idx" ON "VaultItem"("folderId");

-- CreateIndex
CREATE INDEX "VaultAccess_grantedToId_idx" ON "VaultAccess"("grantedToId");

-- CreateIndex
CREATE UNIQUE INDEX "VaultAccess_itemId_grantedToId_key" ON "VaultAccess"("itemId", "grantedToId");

-- CreateIndex
CREATE UNIQUE INDEX "LMSParticipant_pid_key" ON "LMSParticipant"("pid");

-- CreateIndex
CREATE UNIQUE INDEX "LMSParticipant_razorpayOrderId_key" ON "LMSParticipant"("razorpayOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "LMSParticipant_razorpayPaymentId_key" ON "LMSParticipant"("razorpayPaymentId");

-- CreateIndex
CREATE INDEX "LMSParticipant_email_idx" ON "LMSParticipant"("email");

-- CreateIndex
CREATE INDEX "LMSParticipant_workshopTitle_idx" ON "LMSParticipant"("workshopTitle");

-- CreateIndex
CREATE INDEX "LMSParticipant_paymentStatus_idx" ON "LMSParticipant"("paymentStatus");

-- CreateIndex
CREATE INDEX "ReimbursementRecord_userId_idx" ON "ReimbursementRecord"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ReimbursementRecord_userId_month_year_key" ON "ReimbursementRecord"("userId", "month", "year");

-- CreateIndex
CREATE INDEX "_CompanyToDesignation_B_index" ON "_CompanyToDesignation"("B");

-- CreateIndex
CREATE INDEX "_UserCompanies_B_index" ON "_UserCompanies"("B");

-- CreateIndex
CREATE INDEX "_DepartmentToDesignation_B_index" ON "_DepartmentToDesignation"("B");

-- CreateIndex
CREATE INDEX "_CustomerToExecutives_B_index" ON "_CustomerToExecutives"("B");

-- CreateIndex
CREATE INDEX "_JournalToIndexing_B_index" ON "_JournalToIndexing"("B");

-- CreateIndex
CREATE INDEX "_ProjectTaggedEmployees_B_index" ON "_ProjectTaggedEmployees"("B");

-- AddForeignKey
ALTER TABLE "CompanyIntegration" ADD CONSTRAINT "CompanyIntegration_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationJob" ADD CONSTRAINT "AutomationJob_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationRun" ADD CONSTRAINT "AutomationRun_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationRun" ADD CONSTRAINT "AutomationRun_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "AutomationJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationRun" ADD CONSTRAINT "AutomationRun_triggeredBy_fkey" FOREIGN KEY ("triggeredBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_headUserId_fkey" FOREIGN KEY ("headUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_parentDepartmentId_fkey" FOREIGN KEY ("parentDepartmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeArticle" ADD CONSTRAINT "KnowledgeArticle_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeArticleRevision" ADD CONSTRAINT "KnowledgeArticleRevision_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "KnowledgeArticle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeArticleRevision" ADD CONSTRAINT "KnowledgeArticleRevision_editorId_fkey" FOREIGN KEY ("editorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerProfile" ADD CONSTRAINT "CustomerProfile_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "CustomerProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerProfile" ADD CONSTRAINT "CustomerProfile_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerProfile" ADD CONSTRAINT "CustomerProfile_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerProfile" ADD CONSTRAINT "CustomerProfile_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerProfile" ADD CONSTRAINT "CustomerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerProfile" ADD CONSTRAINT "CustomerProfile_affiliatedUniversityId_fkey" FOREIGN KEY ("affiliatedUniversityId") REFERENCES "CustomerProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerProfile" ADD CONSTRAINT "CustomerProfile_associatedAgencyId_fkey" FOREIGN KEY ("associatedAgencyId") REFERENCES "CustomerProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionPayout" ADD CONSTRAINT "CommissionPayout_agencyProfileId_fkey" FOREIGN KEY ("agencyProfileId") REFERENCES "CustomerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionPayout" ADD CONSTRAINT "CommissionPayout_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionPayout" ADD CONSTRAINT "CommissionPayout_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionPayout" ADD CONSTRAINT "CommissionPayout_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstitutionDetails" ADD CONSTRAINT "InstitutionDetails_customerProfileId_fkey" FOREIGN KEY ("customerProfileId") REFERENCES "CustomerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgencyDetails" ADD CONSTRAINT "AgencyDetails_customerProfileId_fkey" FOREIGN KEY ("customerProfileId") REFERENCES "CustomerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgencyPerformance" ADD CONSTRAINT "AgencyPerformance_agencyDetailsId_fkey" FOREIGN KEY ("agencyDetailsId") REFERENCES "AgencyDetails"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Institution" ADD CONSTRAINT "Institution_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "CustomerProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Institution" ADD CONSTRAINT "Institution_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Institution" ADD CONSTRAINT "Institution_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Institution" ADD CONSTRAINT "Institution_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "Institution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerAssignment" ADD CONSTRAINT "CustomerAssignment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "CustomerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerAssignment" ADD CONSTRAINT "CustomerAssignment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Journal" ADD CONSTRAINT "Journal_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "JournalDomain"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Journal" ADD CONSTRAINT "Journal_editorId_fkey" FOREIGN KEY ("editorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Journal" ADD CONSTRAINT "Journal_journalManagerId_fkey" FOREIGN KEY ("journalManagerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Journal" ADD CONSTRAINT "Journal_publisherId_fkey" FOREIGN KEY ("publisherId") REFERENCES "Publisher"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Plan" ADD CONSTRAINT "Plan_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "Journal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductAttribute" ADD CONSTRAINT "ProductAttribute_productId_fkey" FOREIGN KEY ("productId") REFERENCES "InvoiceProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductAttributeValue" ADD CONSTRAINT "ProductAttributeValue_attributeId_fkey" FOREIGN KEY ("attributeId") REFERENCES "ProductAttribute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "InvoiceProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VariantAttributeMapping" ADD CONSTRAINT "VariantAttributeMapping_attributeValueId_fkey" FOREIGN KEY ("attributeValueId") REFERENCES "ProductAttributeValue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VariantAttributeMapping" ADD CONSTRAINT "VariantAttributeMapping_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricingTemplateVariant" ADD CONSTRAINT "PricingTemplateVariant_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ProductPricingTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProformaInvoice" ADD CONSTRAINT "ProformaInvoice_customerProfileId_fkey" FOREIGN KEY ("customerProfileId") REFERENCES "CustomerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProformaAuditEvent" ADD CONSTRAINT "ProformaAuditEvent_proformaId_fkey" FOREIGN KEY ("proformaId") REFERENCES "ProformaInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "AgencyDetails"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_customerProfileId_fkey" FOREIGN KEY ("customerProfileId") REFERENCES "CustomerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_parentSubscriptionId_fkey" FOREIGN KEY ("parentSubscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_salesExecutiveId_fkey" FOREIGN KEY ("salesExecutiveId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionItem" ADD CONSTRAINT "SubscriptionItem_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionItem" ADD CONSTRAINT "SubscriptionItem_invoiceProductId_fkey" FOREIGN KEY ("invoiceProductId") REFERENCES "InvoiceProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionItem" ADD CONSTRAINT "SubscriptionItem_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "Journal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionItem" ADD CONSTRAINT "SubscriptionItem_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionItem" ADD CONSTRAINT "SubscriptionItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionItem" ADD CONSTRAINT "SubscriptionItem_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionItem" ADD CONSTRAINT "SubscriptionItem_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "Workshop"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_customerProfileId_fkey" FOREIGN KEY ("customerProfileId") REFERENCES "CustomerProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_lmsParticipantId_fkey" FOREIGN KEY ("lmsParticipantId") REFERENCES "LMSParticipant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Brand" ADD CONSTRAINT "Brand_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunicationLog" ADD CONSTRAINT "CommunicationLog_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunicationLog" ADD CONSTRAINT "CommunicationLog_customerProfileId_fkey" FOREIGN KEY ("customerProfileId") REFERENCES "CustomerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunicationLog" ADD CONSTRAINT "CommunicationLog_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunicationLog" ADD CONSTRAINT "CommunicationLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationChecklist" ADD CONSTRAINT "ConversationChecklist_communicationLogId_fkey" FOREIGN KEY ("communicationLogId") REFERENCES "CommunicationLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatRoom" ADD CONSTRAINT "ChatRoom_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatParticipant" ADD CONSTRAINT "ChatParticipant_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "ChatRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatParticipant" ADD CONSTRAINT "ChatParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "ChatRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_chatRoomId_fkey" FOREIGN KEY ("chatRoomId") REFERENCES "ChatRoom"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_customerProfileId_fkey" FOREIGN KEY ("customerProfileId") REFERENCES "CustomerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeProfile" ADD CONSTRAINT "EmployeeProfile_designationId_fkey" FOREIGN KEY ("designationId") REFERENCES "Designation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeProfile" ADD CONSTRAINT "EmployeeProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeCompanyDesignation" ADD CONSTRAINT "EmployeeCompanyDesignation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeCompanyDesignation" ADD CONSTRAINT "EmployeeCompanyDesignation_designationId_fkey" FOREIGN KEY ("designationId") REFERENCES "Designation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeCompanyDesignation" ADD CONSTRAINT "EmployeeCompanyDesignation_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "EmployeeProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalaryAdvance" ADD CONSTRAINT "SalaryAdvance_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalaryAdvance" ADD CONSTRAINT "SalaryAdvance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "EmployeeProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdvanceEMI" ADD CONSTRAINT "AdvanceEMI_advanceId_fkey" FOREIGN KEY ("advanceId") REFERENCES "SalaryAdvance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdvanceEMI" ADD CONSTRAINT "AdvanceEMI_salarySlipId_fkey" FOREIGN KEY ("salarySlipId") REFERENCES "SalarySlip"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalaryIncrementRecord" ADD CONSTRAINT "SalaryIncrementRecord_employeeProfileId_fkey" FOREIGN KEY ("employeeProfileId") REFERENCES "EmployeeProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalaryIncrementRecord" ADD CONSTRAINT "SalaryIncrementRecord_newDesignationId_fkey" FOREIGN KEY ("newDesignationId") REFERENCES "Designation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalaryIncrementRecord" ADD CONSTRAINT "SalaryIncrementRecord_previousDesignationId_fkey" FOREIGN KEY ("previousDesignationId") REFERENCES "Designation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeComment" ADD CONSTRAINT "EmployeeComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeComment" ADD CONSTRAINT "EmployeeComment_employeeProfileId_fkey" FOREIGN KEY ("employeeProfileId") REFERENCES "EmployeeProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeDocument" ADD CONSTRAINT "EmployeeDocument_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "EmployeeProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "EmployeeProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkReport" ADD CONSTRAINT "WorkReport_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkReport" ADD CONSTRAINT "WorkReport_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "EmployeeProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkReportComment" ADD CONSTRAINT "WorkReportComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkReportComment" ADD CONSTRAINT "WorkReportComment_workReportId_fkey" FOREIGN KEY ("workReportId") REFERENCES "WorkReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Holiday" ADD CONSTRAINT "Holiday_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vendor" ADD CONSTRAINT "Vendor_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Warehouse" ADD CONSTRAINT "Warehouse_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Warehouse" ADD CONSTRAINT "Warehouse_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionOrder" ADD CONSTRAINT "ProductionOrder_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalarySlip" ADD CONSTRAINT "SalarySlip_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalarySlip" ADD CONSTRAINT "SalarySlip_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "EmployeeProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArrearRecord" ADD CONSTRAINT "ArrearRecord_salarySlipId_fkey" FOREIGN KEY ("salarySlipId") REFERENCES "SalarySlip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepartmentBudget" ADD CONSTRAINT "DepartmentBudget_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepartmentBudget" ADD CONSTRAINT "DepartmentBudget_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatutoryConfig" ADD CONSTRAINT "StatutoryConfig_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxDeclaration" ADD CONSTRAINT "TaxDeclaration_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "EmployeeProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeclarationProof" ADD CONSTRAINT "DeclarationProof_taxDeclarationId_fkey" FOREIGN KEY ("taxDeclarationId") REFERENCES "TaxDeclaration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftRoster" ADD CONSTRAINT "ShiftRoster_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftRoster" ADD CONSTRAINT "ShiftRoster_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "EmployeeProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftRoster" ADD CONSTRAINT "ShiftRoster_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalaryStructure" ADD CONSTRAINT "SalaryStructure_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "EmployeeProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceReview" ADD CONSTRAINT "PerformanceReview_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceReview" ADD CONSTRAINT "PerformanceReview_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "EmployeeProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceReview" ADD CONSTRAINT "PerformanceReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceReview" ADD CONSTRAINT "PerformanceReview_salaryIncrementRecordId_fkey" FOREIGN KEY ("salaryIncrementRecordId") REFERENCES "SalaryIncrementRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeKPI" ADD CONSTRAINT "EmployeeKPI_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeKPI" ADD CONSTRAINT "EmployeeKPI_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "EmployeeProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceInsight" ADD CONSTRAINT "PerformanceInsight_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceInsight" ADD CONSTRAINT "PerformanceInsight_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "EmployeeProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "EmployeeProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkPlan" ADD CONSTRAINT "WorkPlan_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkPlan" ADD CONSTRAINT "WorkPlan_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "EmployeeProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkPlan" ADD CONSTRAINT "WorkPlan_itProjectId_fkey" FOREIGN KEY ("itProjectId") REFERENCES "ITProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkPlan" ADD CONSTRAINT "WorkPlan_itTaskId_fkey" FOREIGN KEY ("itTaskId") REFERENCES "ITTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkPlan" ADD CONSTRAINT "WorkPlan_linkedGoalId_fkey" FOREIGN KEY ("linkedGoalId") REFERENCES "EmployeeGoal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkPlan" ADD CONSTRAINT "WorkPlan_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkPlan" ADD CONSTRAINT "WorkPlan_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingModule" ADD CONSTRAINT "OnboardingModule_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingModule" ADD CONSTRAINT "OnboardingModule_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizQuestion" ADD CONSTRAINT "QuizQuestion_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "OnboardingModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingProgress" ADD CONSTRAINT "OnboardingProgress_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "EmployeeProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingProgress" ADD CONSTRAINT "OnboardingProgress_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "OnboardingModule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkPlanComment" ADD CONSTRAINT "WorkPlanComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkPlanComment" ADD CONSTRAINT "WorkPlanComment_workPlanId_fkey" FOREIGN KEY ("workPlanId") REFERENCES "WorkPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentTemplate" ADD CONSTRAINT "DocumentTemplate_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DigitalDocument" ADD CONSTRAINT "DigitalDocument_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "EmployeeProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DigitalDocument" ADD CONSTRAINT "DigitalDocument_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "DocumentTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobPosting" ADD CONSTRAINT "JobPosting_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobPosting" ADD CONSTRAINT "JobPosting_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobApplication" ADD CONSTRAINT "JobApplication_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobApplication" ADD CONSTRAINT "JobApplication_jobPostingId_fkey" FOREIGN KEY ("jobPostingId") REFERENCES "JobPosting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecruitmentExam" ADD CONSTRAINT "RecruitmentExam_jobPostingId_fkey" FOREIGN KEY ("jobPostingId") REFERENCES "JobPosting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamAttempt" ADD CONSTRAINT "ExamAttempt_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "JobApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamAttempt" ADD CONSTRAINT "ExamAttempt_examId_fkey" FOREIGN KEY ("examId") REFERENCES "RecruitmentExam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecruitmentInterview" ADD CONSTRAINT "RecruitmentInterview_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "JobApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecruitmentInterview" ADD CONSTRAINT "RecruitmentInterview_interviewerId_fkey" FOREIGN KEY ("interviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispatchOrder" ADD CONSTRAINT "DispatchOrder_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispatchOrder" ADD CONSTRAINT "DispatchOrder_courierId_fkey" FOREIGN KEY ("courierId") REFERENCES "Courier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispatchOrder" ADD CONSTRAINT "DispatchOrder_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispatchOrder" ADD CONSTRAINT "DispatchOrder_customerProfileId_fkey" FOREIGN KEY ("customerProfileId") REFERENCES "CustomerProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispatchOrder" ADD CONSTRAINT "DispatchOrder_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispatchOrder" ADD CONSTRAINT "DispatchOrder_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalVolume" ADD CONSTRAINT "JournalVolume_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "Journal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeTaskTemplate" ADD CONSTRAINT "EmployeeTaskTemplate_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeTaskTemplate" ADD CONSTRAINT "EmployeeTaskTemplate_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeTaskTemplate" ADD CONSTRAINT "EmployeeTaskTemplate_designationId_fkey" FOREIGN KEY ("designationId") REFERENCES "Designation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeTaskTemplate" ADD CONSTRAINT "EmployeeTaskTemplate_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "EmployeeProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeePointLog" ADD CONSTRAINT "EmployeePointLog_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeePointLog" ADD CONSTRAINT "EmployeePointLog_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "EmployeeProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyTaskCompletion" ADD CONSTRAINT "DailyTaskCompletion_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "EmployeeProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyTaskCompletion" ADD CONSTRAINT "DailyTaskCompletion_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "EmployeeTaskTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyPerformanceSnapshot" ADD CONSTRAINT "MonthlyPerformanceSnapshot_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyPerformanceSnapshot" ADD CONSTRAINT "MonthlyPerformanceSnapshot_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyPerformanceSnapshot" ADD CONSTRAINT "MonthlyPerformanceSnapshot_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "EmployeeProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepartmentPerformance" ADD CONSTRAINT "DepartmentPerformance_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepartmentPerformance" ADD CONSTRAINT "DepartmentPerformance_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyPerformance" ADD CONSTRAINT "CompanyPerformance_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalIssue" ADD CONSTRAINT "JournalIssue_volumeId_fkey" FOREIGN KEY ("volumeId") REFERENCES "JournalVolume"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "JournalIssue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "Journal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleAuthor" ADD CONSTRAINT "ArticleAuthor_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conference" ADD CONSTRAINT "Conference_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConferenceTicketType" ADD CONSTRAINT "ConferenceTicketType_conferenceId_fkey" FOREIGN KEY ("conferenceId") REFERENCES "Conference"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConferenceRegistration" ADD CONSTRAINT "ConferenceRegistration_conferenceId_fkey" FOREIGN KEY ("conferenceId") REFERENCES "Conference"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConferenceRegistration" ADD CONSTRAINT "ConferenceRegistration_ticketTypeId_fkey" FOREIGN KEY ("ticketTypeId") REFERENCES "ConferenceTicketType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConferenceRegistration" ADD CONSTRAINT "ConferenceRegistration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConferencePaper" ADD CONSTRAINT "ConferencePaper_conferenceId_fkey" FOREIGN KEY ("conferenceId") REFERENCES "Conference"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConferencePaper" ADD CONSTRAINT "ConferencePaper_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "ConferenceTrack"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaperReview" ADD CONSTRAINT "PaperReview_paperId_fkey" FOREIGN KEY ("paperId") REFERENCES "ConferencePaper"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaperReview" ADD CONSTRAINT "PaperReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConferenceTrack" ADD CONSTRAINT "ConferenceTrack_conferenceId_fkey" FOREIGN KEY ("conferenceId") REFERENCES "Conference"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConferenceSponsor" ADD CONSTRAINT "ConferenceSponsor_conferenceId_fkey" FOREIGN KEY ("conferenceId") REFERENCES "Conference"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workshop" ADD CONSTRAINT "Workshop_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workshop" ADD CONSTRAINT "Workshop_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkshopEnrollment" ADD CONSTRAINT "WorkshopEnrollment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkshopEnrollment" ADD CONSTRAINT "WorkshopEnrollment_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "Workshop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Internship" ADD CONSTRAINT "Internship_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Internship" ADD CONSTRAINT "Internship_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternshipApplication" ADD CONSTRAINT "InternshipApplication_internshipId_fkey" FOREIGN KEY ("internshipId") REFERENCES "Internship"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternshipApplication" ADD CONSTRAINT "InternshipApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LMSEmailLog" ADD CONSTRAINT "LMSEmailLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LMSMentorPayment" ADD CONSTRAINT "LMSMentorPayment_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseModule" ADD CONSTRAINT "CourseModule_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseLesson" ADD CONSTRAINT "CourseLesson_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "CourseModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseEnrollment" ADD CONSTRAINT "CourseEnrollment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseEnrollment" ADD CONSTRAINT "CourseEnrollment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserLessonProgress" ADD CONSTRAINT "UserLessonProgress_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "CourseLesson"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserLessonProgress" ADD CONSTRAINT "UserLessonProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quiz" ADD CONSTRAINT "Quiz_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "CourseLesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseQuizQuestion" ADD CONSTRAINT "CourseQuizQuestion_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizAttempt" ADD CONSTRAINT "QuizAttempt_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizAttempt" ADD CONSTRAINT "QuizAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseNote" ADD CONSTRAINT "CourseNote_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "CourseLesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseNote" ADD CONSTRAINT "CourseNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseDiscussion" ADD CONSTRAINT "CourseDiscussion_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseDiscussion" ADD CONSTRAINT "CourseDiscussion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscussionReply" ADD CONSTRAINT "DiscussionReply_discussionId_fkey" FOREIGN KEY ("discussionId") REFERENCES "CourseDiscussion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscussionReply" ADD CONSTRAINT "DiscussionReply_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseAnnouncement" ADD CONSTRAINT "CourseAnnouncement_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "CourseEnrollment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ITAsset" ADD CONSTRAINT "ITAsset_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ITAsset" ADD CONSTRAINT "ITAsset_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ITSupportTicket" ADD CONSTRAINT "ITSupportTicket_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "ITAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ITSupportTicket" ADD CONSTRAINT "ITSupportTicket_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ITSupportTicket" ADD CONSTRAINT "ITSupportTicket_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ITSupportTicket" ADD CONSTRAINT "ITSupportTicket_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialRecord" ADD CONSTRAINT "FinancialRecord_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialRecord" ADD CONSTRAINT "FinancialRecord_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveLedger" ADD CONSTRAINT "LeaveLedger_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveLedger" ADD CONSTRAINT "LeaveLedger_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "EmployeeProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeGoal" ADD CONSTRAINT "EmployeeGoal_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeGoal" ADD CONSTRAINT "EmployeeGoal_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "EmployeeProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeGoal" ADD CONSTRAINT "EmployeeGoal_kpiId_fkey" FOREIGN KEY ("kpiId") REFERENCES "EmployeeKPI"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeGoal" ADD CONSTRAINT "EmployeeGoal_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncentiveSchema" ADD CONSTRAINT "IncentiveSchema_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BonusSchema" ADD CONSTRAINT "BonusSchema_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeIncentive" ADD CONSTRAINT "EmployeeIncentive_employeeProfileId_fkey" FOREIGN KEY ("employeeProfileId") REFERENCES "EmployeeProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeIncentive" ADD CONSTRAINT "EmployeeIncentive_salarySlipId_fkey" FOREIGN KEY ("salarySlipId") REFERENCES "SalarySlip"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyPotential" ADD CONSTRAINT "CompanyPotential_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EditorialBoardMember" ADD CONSTRAINT "EditorialBoardMember_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "Journal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EditorialBoardMember" ADD CONSTRAINT "EditorialBoardMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleVersion" ADD CONSTRAINT "ArticleVersion_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConferenceCommitteeMember" ADD CONSTRAINT "ConferenceCommitteeMember_conferenceId_fkey" FOREIGN KEY ("conferenceId") REFERENCES "Conference"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConferenceCommitteeMember" ADD CONSTRAINT "ConferenceCommitteeMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalReviewer" ADD CONSTRAINT "JournalReviewer_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "Journal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalReviewer" ADD CONSTRAINT "JournalReviewer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewAssignment" ADD CONSTRAINT "ReviewAssignment_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewAssignment" ADD CONSTRAINT "ReviewAssignment_assignedBy_fkey" FOREIGN KEY ("assignedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewAssignment" ADD CONSTRAINT "ReviewAssignment_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "JournalReviewer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewReport" ADD CONSTRAINT "ReviewReport_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "ReviewAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewReport" ADD CONSTRAINT "ReviewReport_validatedBy_fkey" FOREIGN KEY ("validatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewCertificate" ADD CONSTRAINT "ReviewCertificate_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewCertificate" ADD CONSTRAINT "ReviewCertificate_issuedBy_fkey" FOREIGN KEY ("issuedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewCertificate" ADD CONSTRAINT "ReviewCertificate_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "Journal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewCertificate" ADD CONSTRAINT "ReviewCertificate_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "JournalReviewer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConferenceFeedback" ADD CONSTRAINT "ConferenceFeedback_conferenceId_fkey" FOREIGN KEY ("conferenceId") REFERENCES "Conference"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConferenceFeedback" ADD CONSTRAINT "ConferenceFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebsiteMonitorLog" ADD CONSTRAINT "WebsiteMonitorLog_monitorId_fkey" FOREIGN KEY ("monitorId") REFERENCES "WebsiteMonitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppConfiguration" ADD CONSTRAINT "AppConfiguration_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalIndexingTracking" ADD CONSTRAINT "JournalIndexingTracking_indexingId_fkey" FOREIGN KEY ("indexingId") REFERENCES "JournalIndexing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalIndexingTracking" ADD CONSTRAINT "JournalIndexingTracking_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "Journal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlagiarismReport" ADD CONSTRAINT "PlagiarismReport_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlagiarismReport" ADD CONSTRAINT "PlagiarismReport_checkedBy_fkey" FOREIGN KEY ("checkedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlagiarismReport" ADD CONSTRAINT "PlagiarismReport_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "Journal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityReport" ADD CONSTRAINT "QualityReport_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityReport" ADD CONSTRAINT "QualityReport_checkedBy_fkey" FOREIGN KEY ("checkedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityReport" ADD CONSTRAINT "QualityReport_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "Journal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManuscriptStatusHistory" ADD CONSTRAINT "ManuscriptStatusHistory_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManuscriptStatusHistory" ADD CONSTRAINT "ManuscriptStatusHistory_changedBy_fkey" FOREIGN KEY ("changedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManuscriptDraft" ADD CONSTRAINT "ManuscriptDraft_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManuscriptDraft" ADD CONSTRAINT "ManuscriptDraft_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "Journal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceEvaluation" ADD CONSTRAINT "PerformanceEvaluation_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "EmployeeProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceEvaluation" ADD CONSTRAINT "PerformanceEvaluation_evaluatorId_fkey" FOREIGN KEY ("evaluatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManuscriptRevision" ADD CONSTRAINT "ManuscriptRevision_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManuscriptRevision" ADD CONSTRAINT "ManuscriptRevision_submittedBy_fkey" FOREIGN KEY ("submittedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManuscriptCommunication" ADD CONSTRAINT "ManuscriptCommunication_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManuscriptCommunication" ADD CONSTRAINT "ManuscriptCommunication_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManuscriptCommunication" ADD CONSTRAINT "ManuscriptCommunication_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailTemplate" ADD CONSTRAINT "EmailTemplate_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoAuthorInvitation" ADD CONSTRAINT "CoAuthorInvitation_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoAuthorInvitation" ADD CONSTRAINT "CoAuthorInvitation_invitedBy_fkey" FOREIGN KEY ("invitedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ITProject" ADD CONSTRAINT "ITProject_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ITProject" ADD CONSTRAINT "ITProject_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ITProject" ADD CONSTRAINT "ITProject_projectManagerId_fkey" FOREIGN KEY ("projectManagerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ITProject" ADD CONSTRAINT "ITProject_teamLeadId_fkey" FOREIGN KEY ("teamLeadId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ITProject" ADD CONSTRAINT "ITProject_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "WebsiteMonitor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ITTask" ADD CONSTRAINT "ITTask_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ITTask" ADD CONSTRAINT "ITTask_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ITTask" ADD CONSTRAINT "ITTask_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ITTask" ADD CONSTRAINT "ITTask_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ITProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ITTask" ADD CONSTRAINT "ITTask_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ITTask" ADD CONSTRAINT "ITTask_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "ITServiceDefinition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ITProjectDocument" ADD CONSTRAINT "ITProjectDocument_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ITProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ITProjectMilestone" ADD CONSTRAINT "ITProjectMilestone_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ITProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ITTimeEntry" ADD CONSTRAINT "ITTimeEntry_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ITTimeEntry" ADD CONSTRAINT "ITTimeEntry_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ITProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ITTimeEntry" ADD CONSTRAINT "ITTimeEntry_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "ITTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ITTimeEntry" ADD CONSTRAINT "ITTimeEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ITTaskStatusHistory" ADD CONSTRAINT "ITTaskStatusHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ITTaskStatusHistory" ADD CONSTRAINT "ITTaskStatusHistory_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "ITTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ITProjectComment" ADD CONSTRAINT "ITProjectComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ITProjectComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ITProjectComment" ADD CONSTRAINT "ITProjectComment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ITProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ITProjectComment" ADD CONSTRAINT "ITProjectComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ITTaskComment" ADD CONSTRAINT "ITTaskComment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "ITTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ITTaskComment" ADD CONSTRAINT "ITTaskComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ITDepartmentRevenue" ADD CONSTRAINT "ITDepartmentRevenue_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ITPerformanceMetric" ADD CONSTRAINT "ITPerformanceMetric_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ITPerformanceMetric" ADD CONSTRAINT "ITPerformanceMetric_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ITServiceDefinition" ADD CONSTRAINT "ITServiceDefinition_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevenueTransaction" ADD CONSTRAINT "RevenueTransaction_approvedByManagerId_fkey" FOREIGN KEY ("approvedByManagerId") REFERENCES "EmployeeProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevenueTransaction" ADD CONSTRAINT "RevenueTransaction_claimedByEmployeeId_fkey" FOREIGN KEY ("claimedByEmployeeId") REFERENCES "EmployeeProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevenueTransaction" ADD CONSTRAINT "RevenueTransaction_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevenueTransaction" ADD CONSTRAINT "RevenueTransaction_customerProfileId_fkey" FOREIGN KEY ("customerProfileId") REFERENCES "CustomerProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevenueTransaction" ADD CONSTRAINT "RevenueTransaction_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevenueTransaction" ADD CONSTRAINT "RevenueTransaction_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevenueTransaction" ADD CONSTRAINT "RevenueTransaction_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevenueTransaction" ADD CONSTRAINT "RevenueTransaction_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevenueTransaction" ADD CONSTRAINT "RevenueTransaction_workReportId_fkey" FOREIGN KEY ("workReportId") REFERENCES "WorkReport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseAllocationRule" ADD CONSTRAINT "ExpenseAllocationRule_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseAllocationRule" ADD CONSTRAINT "ExpenseAllocationRule_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeExpenseAllocation" ADD CONSTRAINT "EmployeeExpenseAllocation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeExpenseAllocation" ADD CONSTRAINT "EmployeeExpenseAllocation_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeExpenseAllocation" ADD CONSTRAINT "EmployeeExpenseAllocation_employeeProfileId_fkey" FOREIGN KEY ("employeeProfileId") REFERENCES "EmployeeProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeExpenseAllocation" ADD CONSTRAINT "EmployeeExpenseAllocation_revenueTransactionId_fkey" FOREIGN KEY ("revenueTransactionId") REFERENCES "RevenueTransaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevenueClaim" ADD CONSTRAINT "RevenueClaim_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "EmployeeProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevenueClaim" ADD CONSTRAINT "RevenueClaim_revenueTransactionId_fkey" FOREIGN KEY ("revenueTransactionId") REFERENCES "RevenueTransaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevenueClaim" ADD CONSTRAINT "RevenueClaim_workReportId_fkey" FOREIGN KEY ("workReportId") REFERENCES "WorkReport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_parentAccountId_fkey" FOREIGN KEY ("parentAccountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_postedBy_fkey" FOREIGN KEY ("postedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalLine" ADD CONSTRAINT "JournalLine_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalLine" ADD CONSTRAINT "JournalLine_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankReconciliationSession" ADD CONSTRAINT "BankReconciliationSession_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankReconciliationSession" ADD CONSTRAINT "BankReconciliationSession_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankReconciliationLine" ADD CONSTRAINT "BankReconciliationLine_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankReconciliationLine" ADD CONSTRAINT "BankReconciliationLine_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "BankReconciliationSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxRate" ADD CONSTRAINT "TaxRate_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StageAssignment" ADD CONSTRAINT "StageAssignment_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StageAssignment" ADD CONSTRAINT "StageAssignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StageAssignment" ADD CONSTRAINT "StageAssignment_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "CustomerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoalEvaluation" ADD CONSTRAINT "GoalEvaluation_evaluatorId_fkey" FOREIGN KEY ("evaluatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoalEvaluation" ADD CONSTRAINT "GoalEvaluation_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "EmployeeGoal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalaryIncrementReview" ADD CONSTRAINT "SalaryIncrementReview_incrementRecordId_fkey" FOREIGN KEY ("incrementRecordId") REFERENCES "SalaryIncrementRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalaryIncrementReview" ADD CONSTRAINT "SalaryIncrementReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMember" ADD CONSTRAINT "ProjectMember_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMember" ADD CONSTRAINT "ProjectMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssueFollowUp" ADD CONSTRAINT "IssueFollowUp_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssueFollowUp" ADD CONSTRAINT "IssueFollowUp_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "Issue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScreeningTemplate" ADD CONSTRAINT "ScreeningTemplate_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScreeningTemplate" ADD CONSTRAINT "ScreeningTemplate_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewScreening" ADD CONSTRAINT "InterviewScreening_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "JobApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewScreening" ADD CONSTRAINT "InterviewScreening_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "RecruitmentInterview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewScreening" ADD CONSTRAINT "InterviewScreening_submittedBy_fkey" FOREIGN KEY ("submittedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewScreening" ADD CONSTRAINT "InterviewScreening_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ScreeningTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScreeningResponse" ADD CONSTRAINT "ScreeningResponse_screeningId_fkey" FOREIGN KEY ("screeningId") REFERENCES "InterviewScreening"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RedGreenDiary" ADD CONSTRAINT "RedGreenDiary_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RedGreenDiary" ADD CONSTRAINT "RedGreenDiary_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RedGreenDiary" ADD CONSTRAINT "RedGreenDiary_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ITProjectSuggestion" ADD CONSTRAINT "ITProjectSuggestion_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ITProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ITProjectSuggestion" ADD CONSTRAINT "ITProjectSuggestion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentorSession" ADD CONSTRAINT "MentorSession_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentorSession" ADD CONSTRAINT "MentorSession_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "Workshop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeerReview" ADD CONSTRAINT "PeerReview_peerId_fkey" FOREIGN KEY ("peerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeerReview" ADD CONSTRAINT "PeerReview_performanceReviewId_fkey" FOREIGN KEY ("performanceReviewId") REFERENCES "PerformanceReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnonymousFeedback" ADD CONSTRAINT "AnonymousFeedback_performanceReviewId_fkey" FOREIGN KEY ("performanceReviewId") REFERENCES "PerformanceReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketingCampaign" ADD CONSTRAINT "MarketingCampaign_audienceId_fkey" FOREIGN KEY ("audienceId") REFERENCES "CampaignAudience"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketingCampaign" ADD CONSTRAINT "MarketingCampaign_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketingCampaign" ADD CONSTRAINT "MarketingCampaign_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "EmailTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignAudience" ADD CONSTRAINT "CampaignAudience_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ProductCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFeedback" ADD CONSTRAINT "UserFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedbackMessage" ADD CONSTRAINT "FeedbackMessage_feedbackId_fkey" FOREIGN KEY ("feedbackId") REFERENCES "UserFeedback"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedbackMessage" ADD CONSTRAINT "FeedbackMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedbackAttachment" ADD CONSTRAINT "FeedbackAttachment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "FeedbackMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileRecord" ADD CONSTRAINT "FileRecord_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThinkTankIdeaCycle" ADD CONSTRAINT "ThinkTankIdeaCycle_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThinkTankIdea" ADD CONSTRAINT "ThinkTankIdea_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThinkTankIdea" ADD CONSTRAINT "ThinkTankIdea_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "ThinkTankIdeaCycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThinkTankIdea" ADD CONSTRAINT "ThinkTankIdea_decisionById_fkey" FOREIGN KEY ("decisionById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThinkTankIdea" ADD CONSTRAINT "ThinkTankIdea_vetoedById_fkey" FOREIGN KEY ("vetoedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThinkTankIdea" ADD CONSTRAINT "ThinkTankIdea_visibleAuthorId_fkey" FOREIGN KEY ("visibleAuthorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThinkTankIdeaPartner" ADD CONSTRAINT "ThinkTankIdeaPartner_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "ThinkTankIdea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThinkTankIdeaPartner" ADD CONSTRAINT "ThinkTankIdeaPartner_visibleUserId_fkey" FOREIGN KEY ("visibleUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThinkTankIdeaTeamMember" ADD CONSTRAINT "ThinkTankIdeaTeamMember_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "ThinkTankIdea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThinkTankIdeaTeamMember" ADD CONSTRAINT "ThinkTankIdeaTeamMember_visibleUserId_fkey" FOREIGN KEY ("visibleUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThinkTankIdeaVote" ADD CONSTRAINT "ThinkTankIdeaVote_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThinkTankIdeaVote" ADD CONSTRAINT "ThinkTankIdeaVote_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "ThinkTankIdeaCycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThinkTankIdeaVote" ADD CONSTRAINT "ThinkTankIdeaVote_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "ThinkTankIdea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThinkTankPointAccount" ADD CONSTRAINT "ThinkTankPointAccount_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThinkTankPointAccount" ADD CONSTRAINT "ThinkTankPointAccount_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "ThinkTankIdeaCycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThinkTankPointAccount" ADD CONSTRAINT "ThinkTankPointAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThinkTankIdeaAttachment" ADD CONSTRAINT "ThinkTankIdeaAttachment_fileRecordId_fkey" FOREIGN KEY ("fileRecordId") REFERENCES "FileRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThinkTankIdeaAttachment" ADD CONSTRAINT "ThinkTankIdeaAttachment_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "ThinkTankIdea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThinkTankIdeaAuditEvent" ADD CONSTRAINT "ThinkTankIdeaAuditEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThinkTankIdeaAuditEvent" ADD CONSTRAINT "ThinkTankIdeaAuditEvent_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "ThinkTankIdea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThinkTankIdeaDuplicateMatch" ADD CONSTRAINT "ThinkTankIdeaDuplicateMatch_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "ThinkTankIdea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThinkTankIdeaDuplicateMatch" ADD CONSTRAINT "ThinkTankIdeaDuplicateMatch_matchedIdeaId_fkey" FOREIGN KEY ("matchedIdeaId") REFERENCES "ThinkTankIdea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThinkTankIdeaComment" ADD CONSTRAINT "ThinkTankIdeaComment_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThinkTankIdeaComment" ADD CONSTRAINT "ThinkTankIdeaComment_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "ThinkTankIdea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThinkTankIdeaQuestion" ADD CONSTRAINT "ThinkTankIdeaQuestion_answeredByUserId_fkey" FOREIGN KEY ("answeredByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThinkTankIdeaQuestion" ADD CONSTRAINT "ThinkTankIdeaQuestion_askedByUserId_fkey" FOREIGN KEY ("askedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThinkTankIdeaQuestion" ADD CONSTRAINT "ThinkTankIdeaQuestion_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "ThinkTankIdea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThinkTankIdeaReviewerScore" ADD CONSTRAINT "ThinkTankIdeaReviewerScore_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "ThinkTankIdea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThinkTankIdeaReviewerScore" ADD CONSTRAINT "ThinkTankIdeaReviewerScore_reviewerUserId_fkey" FOREIGN KEY ("reviewerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThinkTankPointsMapping" ADD CONSTRAINT "ThinkTankPointsMapping_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "ThinkTankIdea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThinkTankPointsMapping" ADD CONSTRAINT "ThinkTankPointsMapping_visibleUserId_fkey" FOREIGN KEY ("visibleUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProblemIssue" ADD CONSTRAINT "ProblemIssue_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProblemIssue" ADD CONSTRAINT "ProblemIssue_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProblemIssue" ADD CONSTRAINT "ProblemIssue_mergedIntoId_fkey" FOREIGN KEY ("mergedIntoId") REFERENCES "ProblemIssue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProblemIssue" ADD CONSTRAINT "ProblemIssue_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProblemIssue" ADD CONSTRAINT "ProblemIssue_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProblemIssueComment" ADD CONSTRAINT "ProblemIssueComment_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProblemIssueComment" ADD CONSTRAINT "ProblemIssueComment_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "ProblemIssue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProblemIssueInternalNote" ADD CONSTRAINT "ProblemIssueInternalNote_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProblemIssueInternalNote" ADD CONSTRAINT "ProblemIssueInternalNote_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "ProblemIssue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProblemIssueAttachment" ADD CONSTRAINT "ProblemIssueAttachment_fileRecordId_fkey" FOREIGN KEY ("fileRecordId") REFERENCES "FileRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProblemIssueAttachment" ADD CONSTRAINT "ProblemIssueAttachment_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "ProblemIssue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProblemIssueWatcher" ADD CONSTRAINT "ProblemIssueWatcher_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "ProblemIssue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProblemIssueWatcher" ADD CONSTRAINT "ProblemIssueWatcher_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProblemIssueAssignmentHistory" ADD CONSTRAINT "ProblemIssueAssignmentHistory_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProblemIssueAssignmentHistory" ADD CONSTRAINT "ProblemIssueAssignmentHistory_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "ProblemIssue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProblemIssueStatusHistory" ADD CONSTRAINT "ProblemIssueStatusHistory_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProblemIssueStatusHistory" ADD CONSTRAINT "ProblemIssueStatusHistory_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "ProblemIssue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProblemIssueDuplicateLink" ADD CONSTRAINT "ProblemIssueDuplicateLink_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "ProblemIssue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProblemIssueDuplicateLink" ADD CONSTRAINT "ProblemIssueDuplicateLink_matchedIssueId_fkey" FOREIGN KEY ("matchedIssueId") REFERENCES "ProblemIssue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProblemIssueAuditEvent" ADD CONSTRAINT "ProblemIssueAuditEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProblemIssueAuditEvent" ADD CONSTRAINT "ProblemIssueAuditEvent_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "ProblemIssue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProblemIssueResolutionFeedback" ADD CONSTRAINT "ProblemIssueResolutionFeedback_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "ProblemIssue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProblemIssueResolutionFeedback" ADD CONSTRAINT "ProblemIssueResolutionFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VaultKeyring" ADD CONSTRAINT "VaultKeyring_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VaultFolder" ADD CONSTRAINT "VaultFolder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VaultItem" ADD CONSTRAINT "VaultItem_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "VaultFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VaultItem" ADD CONSTRAINT "VaultItem_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VaultAccess" ADD CONSTRAINT "VaultAccess_grantedById_fkey" FOREIGN KEY ("grantedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VaultAccess" ADD CONSTRAINT "VaultAccess_grantedToId_fkey" FOREIGN KEY ("grantedToId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VaultAccess" ADD CONSTRAINT "VaultAccess_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "VaultItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReimbursementRecord" ADD CONSTRAINT "ReimbursementRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CompanyToDesignation" ADD CONSTRAINT "_CompanyToDesignation_A_fkey" FOREIGN KEY ("A") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CompanyToDesignation" ADD CONSTRAINT "_CompanyToDesignation_B_fkey" FOREIGN KEY ("B") REFERENCES "Designation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UserCompanies" ADD CONSTRAINT "_UserCompanies_A_fkey" FOREIGN KEY ("A") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UserCompanies" ADD CONSTRAINT "_UserCompanies_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DepartmentToDesignation" ADD CONSTRAINT "_DepartmentToDesignation_A_fkey" FOREIGN KEY ("A") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DepartmentToDesignation" ADD CONSTRAINT "_DepartmentToDesignation_B_fkey" FOREIGN KEY ("B") REFERENCES "Designation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CustomerToExecutives" ADD CONSTRAINT "_CustomerToExecutives_A_fkey" FOREIGN KEY ("A") REFERENCES "CustomerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CustomerToExecutives" ADD CONSTRAINT "_CustomerToExecutives_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_JournalToIndexing" ADD CONSTRAINT "_JournalToIndexing_A_fkey" FOREIGN KEY ("A") REFERENCES "Journal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_JournalToIndexing" ADD CONSTRAINT "_JournalToIndexing_B_fkey" FOREIGN KEY ("B") REFERENCES "JournalIndexing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProjectTaggedEmployees" ADD CONSTRAINT "_ProjectTaggedEmployees_A_fkey" FOREIGN KEY ("A") REFERENCES "ITProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProjectTaggedEmployees" ADD CONSTRAINT "_ProjectTaggedEmployees_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

