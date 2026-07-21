export type KpiTemplateRow = {
    // KPI name shown to managers/employees
    title: string;
    // Goal number to achieve in the selected period
    target: number;
    // Start value when template is applied
    current: number;
    // Measurement unit, e.g. PERCENT, INR, TASKS, HOURS_MAX
    unit: string;
    // Tracking cycle for this KPI row
    period: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
    // Grouping label for dashboards/reports
    category: string;
};

export type KRAKPITemplate = {
    // Unique slug for this template object
    id: string;
    // Human-readable template label in dropdown
    name: string;
    // Team/domain bucket, e.g. AI Engineering, Accounts
    family: string;
    // Whether template is for individual contributor or manager
    roleType: 'INDIVIDUAL' | 'MANAGER';
    // Main responsibility statement for this role
    kra: string;
    // KPI rows shipped with this template
    kpis: KpiTemplateRow[];
};

/**
 * Field labels for quick reference while editing template objects.
 */
export const TEMPLATE_OBJECT_LABELS = {
    id: 'Unique template ID (snake_case)',
    name: 'Template display name',
    family: 'Team/department family',
    roleType: 'INDIVIDUAL or MANAGER',
    kra: 'Primary KRA statement',
    kpis: 'List of KPI rows',
    kpiTitle: 'KPI title',
    kpiTarget: 'Expected target value',
    kpiCurrent: 'Initial current value (usually 0)',
    kpiUnit: 'Measurement unit',
    kpiPeriod: 'DAILY/WEEKLY/MONTHLY/QUARTERLY/YEARLY',
    kpiCategory: 'KPI grouping category',
} as const;

/**
 * Copy-ready placeholders for creating new template objects.
 */
export const KPI_ROW_PLACEHOLDER: KpiTemplateRow = {
    title: 'Example KPI title',
    target: 100,
    current: 0,
    unit: 'PERCENT',
    period: 'MONTHLY',
    category: 'PERFORMANCE',
};

export const TEMPLATE_OBJECT_PLACEHOLDER: KRAKPITemplate = {
    id: 'new_team_individual',
    name: 'New Team Individual Template',
    family: 'New Team',
    roleType: 'INDIVIDUAL',
    kra: 'Define the key responsibility areas for this role in one clear sentence.',
    kpis: [KPI_ROW_PLACEHOLDER],
};

export const KRA_KPI_TEMPLATES: KRAKPITemplate[] = [
    {
        id: 'ai_engineer_individual',
        name: 'AI Engineer Template',
        family: 'AI Engineering',
        roleType: 'INDIVIDUAL',
        kra: 'Design, develop, test, and deploy reliable AI features with measurable quality, delivery, and impact while maintaining documentation and cross-team collaboration.',
        kpis: [
            { title: 'Daily development updates submitted', target: 1, current: 0, unit: 'REPORT', period: 'DAILY', category: 'COMMUNICATION' },
            { title: 'Code review quality score', target: 8, current: 0, unit: 'RATING/10', period: 'WEEKLY', category: 'QUALITY' },
            { title: 'Feature delivery commitments met', target: 4, current: 0, unit: 'FEATURES', period: 'MONTHLY', category: 'DELIVERY' },
            { title: 'Production defects attributable to own work', target: 1, current: 0, unit: 'MAX', period: 'MONTHLY', category: 'RELIABILITY' },
            { title: 'Model/API latency optimization initiatives', target: 2, current: 0, unit: 'INITIATIVES', period: 'QUARTERLY', category: 'OPTIMIZATION' },
            { title: 'Reusable AI components delivered', target: 3, current: 0, unit: 'COMPONENTS', period: 'QUARTERLY', category: 'ENGINEERING_EXCELLENCE' },
        ],
    },
    {
        id: 'ai_engineer_manager',
        name: 'AI Engineering Manager Template',
        family: 'AI Engineering',
        roleType: 'MANAGER',
        kra: 'Lead AI engineering execution, ensure sprint delivery quality, mentor team members, reduce production risk, and align AI roadmap with business priorities.',
        kpis: [
            { title: 'Team sprint delivery on-time ratio', target: 90, current: 0, unit: 'PERCENT', period: 'MONTHLY', category: 'DELIVERY' },
            { title: 'Team defect leakage rate', target: 5, current: 0, unit: 'PERCENT_MAX', period: 'MONTHLY', category: 'QUALITY' },
            { title: 'Manager review turnaround for reports/PRs', target: 24, current: 0, unit: 'HOURS_MAX', period: 'WEEKLY', category: 'RESPONSIVENESS' },
            { title: 'Team KRA/KPI completion average', target: 85, current: 0, unit: 'PERCENT', period: 'QUARTERLY', category: 'PERFORMANCE' },
            { title: 'Cross-functional AI releases delivered', target: 2, current: 0, unit: 'RELEASES', period: 'QUARTERLY', category: 'BUSINESS_IMPACT' },
            { title: 'Team upskilling sessions conducted', target: 6, current: 0, unit: 'SESSIONS', period: 'YEARLY', category: 'PEOPLE_DEVELOPMENT' },
        ],
    },
    {
        id: 'sales_marketing_individual',
        name: 'Sales & Marketing Executive Template',
        family: 'Sales & Marketing',
        roleType: 'INDIVIDUAL',
        kra: 'Generate qualified pipeline, manage follow-ups, convert opportunities, and maintain accurate CRM/reporting discipline to support predictable growth.',
        kpis: [
            { title: 'Daily qualified follow-ups completed', target: 20, current: 0, unit: 'FOLLOWUPS', period: 'DAILY', category: 'ACTIVITY' },
            { title: 'Weekly qualified leads created', target: 15, current: 0, unit: 'LEADS', period: 'WEEKLY', category: 'PIPELINE' },
            { title: 'Monthly conversion ratio', target: 18, current: 0, unit: 'PERCENT', period: 'MONTHLY', category: 'CONVERSION' },
            { title: 'Monthly revenue influenced', target: 500000, current: 0, unit: 'INR', period: 'MONTHLY', category: 'REVENUE' },
            { title: 'CRM hygiene score', target: 95, current: 0, unit: 'PERCENT', period: 'MONTHLY', category: 'DATA_QUALITY' },
            { title: 'Campaign contribution to SQLs', target: 30, current: 0, unit: 'PERCENT', period: 'QUARTERLY', category: 'MARKETING_IMPACT' },
            // --- Traditional methods (field / direct sales) ---
            { title: 'Daily sales calls / connects', target: 40, current: 0, unit: 'CALLS', period: 'DAILY', category: 'TRADITIONAL_ACTIVITY' },
            { title: 'Weekly client meetings & demos', target: 8, current: 0, unit: 'MEETINGS', period: 'WEEKLY', category: 'TRADITIONAL_ACTIVITY' },
            { title: 'Monthly collections realized', target: 400000, current: 0, unit: 'INR', period: 'MONTHLY', category: 'TRADITIONAL_REVENUE' },
            { title: 'Referrals & walk-ins generated', target: 6, current: 0, unit: 'REFERRALS', period: 'MONTHLY', category: 'TRADITIONAL_PIPELINE' },
            // --- Modern methods (digital marketing) ---
            { title: 'Marketing-qualified leads from campaigns', target: 40, current: 0, unit: 'MQLS', period: 'MONTHLY', category: 'DIGITAL_PIPELINE' },
            { title: 'Email & social engagement rate', target: 25, current: 0, unit: 'PERCENT', period: 'MONTHLY', category: 'DIGITAL_ENGAGEMENT' },
            { title: 'Content & posts published', target: 8, current: 0, unit: 'CONTENT', period: 'MONTHLY', category: 'DIGITAL_CONTENT' },
            { title: 'Cost per acquisition (CAC)', target: 1500, current: 0, unit: 'INR_MAX', period: 'MONTHLY', category: 'DIGITAL_EFFICIENCY' },
        ],
    },
    {
        id: 'sales_marketing_manager',
        name: 'Sales & Marketing Manager Template',
        family: 'Sales & Marketing',
        roleType: 'MANAGER',
        kra: 'Drive team pipeline health, forecasting accuracy, campaign-performance alignment, and conversion improvements through coaching and execution rigor.',
        kpis: [
            { title: 'Team quota achievement', target: 100, current: 0, unit: 'PERCENT', period: 'MONTHLY', category: 'REVENUE' },
            { title: 'Forecast accuracy variance', target: 10, current: 0, unit: 'PERCENT_MAX', period: 'MONTHLY', category: 'PLANNING' },
            { title: 'Lead-to-opportunity conversion', target: 25, current: 0, unit: 'PERCENT', period: 'MONTHLY', category: 'CONVERSION' },
            { title: 'Team work-report submission compliance', target: 95, current: 0, unit: 'PERCENT', period: 'WEEKLY', category: 'DISCIPLINE' },
            { title: 'Campaign ROI score', target: 3, current: 0, unit: 'RATIO', period: 'QUARTERLY', category: 'MARKETING_IMPACT' },
            { title: 'High performer retention in team', target: 90, current: 0, unit: 'PERCENT', period: 'YEARLY', category: 'PEOPLE_DEVELOPMENT' },
            // --- Traditional methods (field / direct sales) ---
            { title: 'Field sales coverage vs plan', target: 90, current: 0, unit: 'PERCENT', period: 'MONTHLY', category: 'TRADITIONAL_ACTIVITY' },
            { title: 'Team collections vs billed', target: 92, current: 0, unit: 'PERCENT', period: 'MONTHLY', category: 'TRADITIONAL_REVENUE' },
            // --- Modern methods (digital marketing) ---
            { title: 'Marketing-sourced pipeline share', target: 35, current: 0, unit: 'PERCENT', period: 'QUARTERLY', category: 'DIGITAL_PIPELINE' },
            { title: 'Return on ad spend (ROAS)', target: 4, current: 0, unit: 'RATIO', period: 'QUARTERLY', category: 'DIGITAL_EFFICIENCY' },
            { title: 'Blended customer acquisition cost', target: 2000, current: 0, unit: 'INR_MAX', period: 'QUARTERLY', category: 'DIGITAL_EFFICIENCY' },
        ],
    },
    {
        id: 'publication_production_individual',
        name: 'Publication & Production Executive Template',
        family: 'Publication & Production',
        roleType: 'INDIVIDUAL',
        kra: 'Ensure high-quality and on-time publication/production output with strict process adherence, minimal rework, and clear daily progress reporting.',
        kpis: [
            { title: 'Daily production tasks completed', target: 8, current: 0, unit: 'TASKS', period: 'DAILY', category: 'OUTPUT' },
            { title: 'Weekly manuscript processing throughput', target: 25, current: 0, unit: 'MANUSCRIPTS', period: 'WEEKLY', category: 'THROUGHPUT' },
            { title: 'Rework rate', target: 5, current: 0, unit: 'PERCENT_MAX', period: 'MONTHLY', category: 'QUALITY' },
            { title: 'SLA adherence for publication milestones', target: 95, current: 0, unit: 'PERCENT', period: 'MONTHLY', category: 'TIMELINESS' },
            { title: 'Process compliance audit score', target: 90, current: 0, unit: 'PERCENT', period: 'QUARTERLY', category: 'COMPLIANCE' },
            { title: 'Automation/process improvement suggestions', target: 4, current: 0, unit: 'SUGGESTIONS', period: 'YEARLY', category: 'IMPROVEMENT' },
        ],
    },
    {
        id: 'publication_production_manager',
        name: 'Publication & Production Manager Template',
        family: 'Publication & Production',
        roleType: 'MANAGER',
        kra: 'Lead publication/production planning and quality control, improve throughput and SLA adherence, and ensure predictable team output with low defect rates.',
        kpis: [
            { title: 'Team throughput against plan', target: 95, current: 0, unit: 'PERCENT', period: 'MONTHLY', category: 'THROUGHPUT' },
            { title: 'Quality rejection/rework ratio', target: 4, current: 0, unit: 'PERCENT_MAX', period: 'MONTHLY', category: 'QUALITY' },
            { title: 'On-time issue release rate', target: 98, current: 0, unit: 'PERCENT', period: 'MONTHLY', category: 'TIMELINESS' },
            { title: 'Escalation closure turnaround', target: 48, current: 0, unit: 'HOURS_MAX', period: 'WEEKLY', category: 'OPERATIONS' },
            { title: 'Team productivity growth', target: 15, current: 0, unit: 'PERCENT', period: 'QUARTERLY', category: 'PERFORMANCE' },
            { title: 'Cross-skilling coverage in team', target: 80, current: 0, unit: 'PERCENT', period: 'YEARLY', category: 'PEOPLE_DEVELOPMENT' },
        ],
    },
    {
        id: 'accounts_individual',
        name: 'Accounts Executive Template',
        family: 'Accounts',
        roleType: 'INDIVIDUAL',
        kra: 'Maintain accurate financial records, process transactions on time, support reconciliations, and ensure statutory/documentation compliance.',
        kpis: [
            { title: 'Daily entries posted with zero critical errors', target: 1, current: 0, unit: 'STATUS', period: 'DAILY', category: 'ACCURACY' },
            { title: 'Weekly reconciliation completion', target: 100, current: 0, unit: 'PERCENT', period: 'WEEKLY', category: 'RECONCILIATION' },
            { title: 'Monthly closing tasks completed on time', target: 95, current: 0, unit: 'PERCENT', period: 'MONTHLY', category: 'CLOSING' },
            { title: 'Payment processing SLA adherence', target: 98, current: 0, unit: 'PERCENT', period: 'MONTHLY', category: 'OPERATIONS' },
            { title: 'Documentation compliance score', target: 95, current: 0, unit: 'PERCENT', period: 'QUARTERLY', category: 'COMPLIANCE' },
            { title: 'Audit query turnaround quality score', target: 90, current: 0, unit: 'PERCENT', period: 'YEARLY', category: 'AUDIT' },
        ],
    },
    {
        id: 'accounts_manager',
        name: 'Accounts Manager Template',
        family: 'Accounts',
        roleType: 'MANAGER',
        kra: 'Oversee accounting operations, ensure timely close/reporting, maintain controls and compliance, and improve financial process efficiency.',
        kpis: [
            { title: 'Monthly close completion timeliness', target: 100, current: 0, unit: 'PERCENT', period: 'MONTHLY', category: 'CLOSING' },
            { title: 'Control exceptions found', target: 2, current: 0, unit: 'MAX', period: 'MONTHLY', category: 'CONTROLS' },
            { title: 'Team reconciliation accuracy', target: 98, current: 0, unit: 'PERCENT', period: 'MONTHLY', category: 'ACCURACY' },
            { title: 'Statutory filing on-time rate', target: 100, current: 0, unit: 'PERCENT', period: 'QUARTERLY', category: 'COMPLIANCE' },
            { title: 'Audit closure success rate', target: 95, current: 0, unit: 'PERCENT', period: 'YEARLY', category: 'AUDIT' },
            { title: 'Process automation/value-improvement initiatives', target: 4, current: 0, unit: 'INITIATIVES', period: 'YEARLY', category: 'IMPROVEMENT' },
        ],
    },
    {
        id: 'lms_individual',
        name: 'LMS Executive Template',
        family: 'LMS',
        roleType: 'INDIVIDUAL',
        kra: 'Ensure reliable LMS operations, timely learner support, accurate content/configuration updates, and consistent reporting on learner engagement.',
        kpis: [
            { title: 'Daily learner support tickets resolved', target: 15, current: 0, unit: 'TICKETS', period: 'DAILY', category: 'SUPPORT' },
            { title: 'Weekly content/update tasks completed', target: 10, current: 0, unit: 'TASKS', period: 'WEEKLY', category: 'CONTENT' },
            { title: 'Monthly learner satisfaction score', target: 4.5, current: 0, unit: 'RATING/5', period: 'MONTHLY', category: 'QUALITY' },
            { title: 'LMS uptime/escalation-free service', target: 99.5, current: 0, unit: 'PERCENT', period: 'MONTHLY', category: 'RELIABILITY' },
            { title: 'Course completion uplift contribution', target: 10, current: 0, unit: 'PERCENT', period: 'QUARTERLY', category: 'LEARNING_IMPACT' },
            { title: 'Knowledge-base improvements published', target: 12, current: 0, unit: 'ARTICLES', period: 'YEARLY', category: 'IMPROVEMENT' },
        ],
    },
    {
        id: 'lms_manager',
        name: 'LMS Manager Template',
        family: 'LMS',
        roleType: 'MANAGER',
        kra: 'Lead LMS operations and learner success, optimize platform reliability and support performance, and improve course engagement and completion outcomes.',
        kpis: [
            { title: 'Team ticket SLA achievement', target: 95, current: 0, unit: 'PERCENT', period: 'MONTHLY', category: 'SUPPORT' },
            { title: 'Platform availability', target: 99.7, current: 0, unit: 'PERCENT', period: 'MONTHLY', category: 'RELIABILITY' },
            { title: 'Active learner engagement growth', target: 12, current: 0, unit: 'PERCENT', period: 'QUARTERLY', category: 'LEARNING_IMPACT' },
            { title: 'Course completion rate improvement', target: 15, current: 0, unit: 'PERCENT', period: 'QUARTERLY', category: 'OUTCOMES' },
            { title: 'Content release cadence adherence', target: 95, current: 0, unit: 'PERCENT', period: 'MONTHLY', category: 'DELIVERY' },
            { title: 'Team capability development sessions', target: 6, current: 0, unit: 'SESSIONS', period: 'YEARLY', category: 'PEOPLE_DEVELOPMENT' },
        ],
    },
];
