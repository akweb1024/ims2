/**
 * Centralized Salary Calculation Utility
 * 
 * This utility ensures that payroll policies (like 40% Basic, 30% HRA)
 * are identical across all modules (Increments, Payroll generation, etc.)
 */

export const SALARY_POLICY = {
    BASIC_PERCENTAGE: 0.4,
    HRA_PERCENTAGE: 0.3,
    SPECIAL_ALLOWANCE_PERCENTAGE: 0.2,
    CONVEYANCE_PERCENTAGE: 0.05,
    MEDICAL_PERCENTAGE: 0.05,
    PF_EMPLOYEE_RATE: 0.12,
    PF_EMPLOYER_RATE: 0.12,
    ESIC_EMPLOYEE_RATE: 0.0075,
    ESIC_EMPLOYER_RATE: 0.0325,
    ESIC_THRESHOLD: 21000,
    GRATUITY_RATE: 0.0481 // 4.81% of basic
};

export interface SalaryBreakdown {
    basicSalary: number;
    hra: number;
    specialAllowance: number;
    conveyance: number;
    medical: number;
    grossSalary: number;
    pfEmployee: number;
    esicEmployee: number;
    totalDeductions: number;
    pfEmployer: number;
    esicEmployer: number;
    gratuity: number;
    netSalary: number;
    ctc: number;
}

/**
 * Calculates a standard salary breakdown based on a total base salary amount
 */
export function calculateSalaryBreakdown(baseSalary: number): SalaryBreakdown {
    const basicSalary = baseSalary * SALARY_POLICY.BASIC_PERCENTAGE;
    const hra = baseSalary * SALARY_POLICY.HRA_PERCENTAGE;
    const specialAllowance = baseSalary * SALARY_POLICY.SPECIAL_ALLOWANCE_PERCENTAGE;
    const conveyance = baseSalary * SALARY_POLICY.CONVEYANCE_PERCENTAGE;
    const medical = baseSalary * SALARY_POLICY.MEDICAL_PERCENTAGE;

    const grossSalary = basicSalary + hra + specialAllowance + conveyance + medical;

    // Deductions
    const pfEmployee = basicSalary * SALARY_POLICY.PF_EMPLOYEE_RATE;
    const esicEmployee = grossSalary <= SALARY_POLICY.ESIC_THRESHOLD ? grossSalary * SALARY_POLICY.ESIC_EMPLOYEE_RATE : 0;
    const totalDeductions = pfEmployee + esicEmployee;

    // Employer Contributions
    const pfEmployer = basicSalary * SALARY_POLICY.PF_EMPLOYER_RATE;
    const esicEmployer = grossSalary <= SALARY_POLICY.ESIC_THRESHOLD ? grossSalary * SALARY_POLICY.ESIC_EMPLOYER_RATE : 0;
    const gratuity = basicSalary * SALARY_POLICY.GRATUITY_RATE;

    const netSalary = grossSalary - totalDeductions;
    const ctc = grossSalary + pfEmployer + esicEmployer + gratuity;

    return {
        basicSalary,
        hra,
        specialAllowance,
        conveyance,
        medical,
        grossSalary,
        pfEmployee,
        esicEmployee,
        totalDeductions,
        pfEmployer,
        esicEmployer,
        gratuity,
        netSalary,
        ctc
    };
}
