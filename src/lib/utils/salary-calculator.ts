/**
 * Centralized Salary Calculation Utility
 * 
 * This utility ensures that payroll policies (like 40% Basic, 30% HRA)
 * are identical across all modules (Increments, Payroll generation, etc.)
 */

export const SALARY_POLICIES = {
    PF_DEDUCTED: {
        BASIC: 0.45,
        HRA: 0.22,
        CONVEYANCE: 0.09,
        STATUTORY_BONUS: 0.08,
        SPECIAL_ALLOWANCE: 0.05, // Adjusted from 6% to 5% to keep CTC at 100%
        PF_EMPLOYER: 0.08,
        ESIC_EMPLOYER: 0.03,
        GROSS_PERCENTAGE: 0.89
    },
    NO_PF: {
        BASIC: 0.50,
        HRA: 0.25,
        CONVEYANCE: 0.04,
        STATUTORY_BONUS: 0.09,
        SPECIAL_ALLOWANCE: 0.12,
        PF_EMPLOYER: 0,
        ESIC_EMPLOYER: 0,
        GROSS_PERCENTAGE: 1.00
    }
};

export interface SalaryBreakdown {
    basicSalary: number;
    hra: number;
    specialAllowance: number;
    conveyance: number;
    medical: number;
    statutoryBonus: number;
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
 * Calculates a standard salary breakdown based on a total CTC amount
 * according to the new percentage policies.
 */
export function calculateSalaryBreakdown(ctc: number, deductPF: boolean = true): SalaryBreakdown {
    const policy = deductPF ? SALARY_POLICIES.PF_DEDUCTED : SALARY_POLICIES.NO_PF;

    const basicSalary = ctc * policy.BASIC;
    const hra = ctc * policy.HRA;
    const conveyance = ctc * policy.CONVEYANCE;
    const statutoryBonus = ctc * policy.STATUTORY_BONUS;
    const specialAllowance = ctc * policy.SPECIAL_ALLOWANCE;
    const medical = 0; // Medical is not specifically listed in new percentages, consolidated into other fields or Special

    const grossSalary = basicSalary + hra + conveyance + statutoryBonus + specialAllowance + medical;

    // Deductions
    // Employee PF usually matches Employer PF (8% of CTC in this specific structure)
    const pfEmployee = deductPF ? ctc * 0.08 : 0;
    
    // ESIC Employee is usually 0.75% of Gross if PF is deducted, or 0 if not.
    // However, if the user wants 89% Gross and specified Employer ESIC as 3%, 
    // let's stick to statutory-like logic for employee side unless specified otherwise.
    // Given the precision of 8% and 3% for employer, let's assume employee ESIC is also part of what "deduct PF" controls.
    const esicEmployee = deductPF ? Math.ceil(grossSalary * 0.0075) : 0;
    
    const totalDeductions = pfEmployee + esicEmployee;

    // Employer Contributions (as specified by user)
    const pfEmployer = ctc * policy.PF_EMPLOYER;
    const esicEmployer = ctc * policy.ESIC_EMPLOYER;
    const gratuity = 0; // Gratutity not mentioned in new breakdown, usually over/above CTC in such specific specs or part of it? 
    // If CTC is 100%, and components add to 100% (89+8+3), then gratuity must be 0 or outside.

    const netSalary = grossSalary - totalDeductions;

    return {
        basicSalary,
        hra,
        specialAllowance,
        conveyance,
        medical,
        statutoryBonus,
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
