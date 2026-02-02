import { prisma } from './prisma';

export interface PayrollInput {
    basicSalary: number;
    hra: number;
    conveyance: number;
    medical: number;
    specialAllowance: number;
    otherAllowances: number;
    statutoryBonus?: number;
    gratuity?: number;
    lwpDays: number;
    daysInMonth: number;
    arrears?: number;
    expenses?: number;
    healthCare?: number;
    travelling?: number;
    mobile?: number;
    internet?: number;
    booksAndPeriodicals?: number;
    salaryFixed?: number;
    salaryVariable?: number;
    salaryIncentive?: number;
}

export interface StatutorySettings {
    pfEmployeeRate: number;
    pfEmployerRate: number;
    pfCeilingAmount: number;
    esicEmployeeRate: number;
    esicEmployerRate: number;
    esicLimitAmount: number;
    ptEnabled: boolean;
}

export interface PayrollBreakdown {
    earnings: {
        basic: number;
        hra: number;
        conveyance: number;
        medical: number;
        specialAllowance: number;
        otherAllowances: number;
        statutoryBonus: number;
        gross: number;
    };
    deductions: {
        pfEmployee: number;
        esicEmployee: number;
        professionalTax: number;
        lwpDeduction: number;
        tds: number;
        total: number;
    };
    employerContribution: {
        pfEmployer: number;
        esicEmployer: number;
        gratuity: number;
    };
    perks: {
        healthCare: number;
        travelling: number;
        mobile: number;
        internet: number;
        booksAndPeriodicals: number;
        total: number;
    };
    salaryFixed: number;
    salaryVariable: number;
    salaryIncentive: number;
    arrears: number;
    expenses: number;
    netPayable: number;
    costToCompany: number;
}

/**
 * Robust Payroll Calculation Engine for Indian SME Compliance
 */
export class PayrollCalculator {
    static async getStatutoryConfig(companyId: string): Promise<StatutorySettings> {
        const config = await prisma.statutoryConfig.findUnique({
            where: { companyId }
        });

        return {
            pfEmployeeRate: config?.pfEmployeeRate ?? 12.0,
            pfEmployerRate: config?.pfEmployerRate ?? 12.0,
            pfCeilingAmount: config?.pfCeilingAmount ?? 15000.0,
            esicEmployeeRate: config?.esicEmployeeRate ?? 0.75,
            esicEmployerRate: config?.esicEmployerRate ?? 3.25,
            esicLimitAmount: config?.esicLimitAmount ?? 21000.0,
            ptEnabled: config?.ptEnabled ?? true,
        };
    }

    static calculate(input: PayrollInput, config: StatutorySettings): PayrollBreakdown {
        const {
            basicSalary, hra, conveyance, medical, specialAllowance, otherAllowances,
            statutoryBonus, gratuity, lwpDays, daysInMonth, expenses,
            healthCare, travelling, mobile, internet, booksAndPeriodicals,
            salaryFixed, salaryVariable, salaryIncentive
        } = input;

        const bonusVal = statutoryBonus || 0;
        const gratuityVal = gratuity || 0;
        const expensesVal = expenses || 0;

        const pHealth = healthCare || 0;
        const pTrav = travelling || 0;
        const pMob = mobile || 0;
        const pInt = internet || 0;
        const pBooks = booksAndPeriodicals || 0;

        // 1. Calculate Gross Earnings before deductions (Total A)
        const totalGrossFixed = basicSalary + hra + conveyance + medical + specialAllowance + otherAllowances + bonusVal;

        // 2. Adjust for Loss of Pay (LOP)
        let lwpDeduction = 0;
        if (lwpDays > 0) {
            lwpDeduction = (totalGrossFixed / daysInMonth) * lwpDays;
        }

        // Adjusted earnings values
        const ratio = totalGrossFixed > 0 ? (totalGrossFixed - lwpDeduction) / totalGrossFixed : 0;
        const adjBasic = basicSalary * ratio;
        const adjHRA = hra * ratio;
        const adjConveyance = conveyance * ratio;
        const adjMedical = medical * ratio;
        const adjSpecial = specialAllowance * ratio;
        const adjOthers = otherAllowances * ratio;
        const adjBonus = bonusVal * ratio;
        const adjustedGross = adjBasic + adjHRA + adjConveyance + adjMedical + adjSpecial + adjOthers + adjBonus;

        // Perks also adjusted for LWP? Usually yes if they are monthly fixed.
        const adjHealth = pHealth * ratio;
        const adjTrav = pTrav * ratio;
        const adjMob = pMob * ratio;
        const adjInt = pInt * ratio;
        const adjBooks = pBooks * ratio;
        const totalPerks = adjHealth + adjTrav + adjMob + adjInt + adjBooks;

        // 3. Deductions

        // PF Calculation (Typically 12% of Basic, capped at ceiling)
        const pfBasis = Math.min(adjBasic, config.pfCeilingAmount);
        const pfEmployee = (pfBasis * config.pfEmployeeRate) / 100;
        const pfEmployer = (pfBasis * config.pfEmployerRate) / 100;

        // ESIC Calculation (Only if Gross <= Limit)
        let esicEmployee = 0;
        let esicEmployer = 0;
        if (adjustedGross <= config.esicLimitAmount) {
            esicEmployee = Math.ceil(adjustedGross * (config.esicEmployeeRate / 100));
            esicEmployer = Math.ceil(adjustedGross * (config.esicEmployerRate / 100));
        }

        // PT (Professional Tax) - Simplified slab for Indian states (e.g. MH Type)
        let pt = 0;
        if (config.ptEnabled) {
            if (adjustedGross > 10000) pt = 200;
            else if (adjustedGross > 7500) pt = 175;
        }

        const tds = 0;
        const totalDeductions = pfEmployee + esicEmployee + pt + tds;
        const arrears = input.arrears || 0;

        // Net Payable = (Adjusted Gross - Deductions) + Arrears + Expenses + Perks
        const netPayable = (adjustedGross - totalDeductions) + arrears + expensesVal + totalPerks;

        // CTC = Adjusted Gross + Employer Contributions + Gratuity + Perks + Arrears + Expenses
        const ctc = adjustedGross + pfEmployer + esicEmployer + gratuityVal + totalPerks + arrears + expensesVal;

        return {
            earnings: {
                basic: adjBasic,
                hra: adjHRA,
                conveyance: adjConveyance,
                medical: adjMedical,
                specialAllowance: adjSpecial,
                otherAllowances: adjOthers,
                statutoryBonus: adjBonus,
                gross: adjustedGross
            },
            deductions: {
                pfEmployee,
                esicEmployee,
                professionalTax: pt,
                lwpDeduction,
                tds,
                total: totalDeductions
            },
            employerContribution: {
                pfEmployer,
                esicEmployer,
                gratuity: gratuityVal
            },
            perks: {
                healthCare: adjHealth,
                travelling: adjTrav,
                mobile: adjMob,
                internet: adjInt,
                booksAndPeriodicals: adjBooks,
                total: totalPerks
            },
            arrears,
            expenses: expensesVal,
            salaryFixed: salaryFixed || 0,
            salaryVariable: salaryVariable || 0,
            salaryIncentive: salaryIncentive || 0,
            netPayable,
            costToCompany: ctc
        };
    }
}

