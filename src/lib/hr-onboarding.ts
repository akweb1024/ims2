type OnboardingModuleLike = {
    companyId: string | null;
    type: string;
    departmentId?: string | null;
    requiredForDesignation?: string | null;
};

type OnboardingScope = {
    companyId?: string | null;
    departmentId?: string | null;
    designation?: string | null;
};

export function isApplicableOnboardingModule(module: OnboardingModuleLike, scope: OnboardingScope) {
    if (!module.companyId) return true;
    if (scope.companyId && module.companyId !== scope.companyId) return false;

    if (module.type === 'GLOBAL' || module.type === 'COMPANY') return true;
    if (module.type === 'DEPARTMENT') {
        return !!scope.departmentId && module.departmentId === scope.departmentId;
    }
    if (module.type === 'ROLE') {
        return !!scope.designation && module.requiredForDesignation === scope.designation;
    }

    return false;
}

export function filterApplicableOnboardingModules<T extends OnboardingModuleLike>(modules: T[], scope: OnboardingScope) {
    return modules.filter((module) => isApplicableOnboardingModule(module, scope));
}

const COMPANY_NAME_PLACEHOLDER = /\{\{\s*COMPANY_NAME\s*\}\}/gi;

/**
 * Replace onboarding template placeholders (e.g. {{COMPANY_NAME}}) with real values.
 * Pure + safe for both server and client. Falls back to a generic label when the
 * company name is unavailable. Use ONLY for display/output — never persist the result,
 * or the placeholder would be lost on the next save.
 */
export function applyCompanyPlaceholders(text: string | null | undefined, companyName?: string | null): string {
    if (!text) return '';
    return text.replace(COMPANY_NAME_PLACEHOLDER, companyName || 'the Company');
}
