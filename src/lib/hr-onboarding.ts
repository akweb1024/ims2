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
