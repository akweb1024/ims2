import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-legacy';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const numberToWords = (num: number): string => {
    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const inWords = (n: number): string => {
        if (n < 20) return a[n];
        if (n < 100) return b[Math.floor(n / 10)] + ' ' + a[n % 10];
        if (n < 1000) return a[Math.floor(n / 100)] + 'Hundred ' + inWords(n % 100);
        if (n < 100000) return inWords(Math.floor(n / 1000)) + 'Thousand ' + inWords(n % 1000);
        if (n < 10000000) return inWords(Math.floor(n / 100000)) + 'Lakh ' + inWords(n % 100000);
        return inWords(Math.floor(n / 10000000)) + 'Crore ' + inWords(n % 10000000);
    };

    const str = inWords(Math.floor(num));
    return str ? str + 'Rupees Only' : 'Zero Rupees Only';
};

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
    try {
        const params = await props.params;
        const user = await getAuthenticatedUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { id } = await params;

        const slip = (await prisma.salarySlip.findUnique({
            where: { id },
            include: {
                employee: {
                    include: {
                        user: {
                            include: {
                                company: true,
                            }
                        }
                    }
                }
            }
        })) as any;

        if (!slip) {
            return NextResponse.json({ error: 'Salary slip not found' }, { status: 404 });
        }

        // Authorization check
        if (user.role !== 'SUPER_ADMIN' && user.role !== 'FINANCE_ADMIN' && user.role !== 'ADMIN') {
            const employeeProfile = await prisma.employeeProfile.findUnique({
                where: { userId: user.id }
            });
            if (slip.employeeId !== employeeProfile?.id) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
        }

        const doc = new jsPDF();
        const emp = slip.employee;
        const monthName = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][slip.month - 1];

        // 1. Professional Header Container
        doc.setDrawColor(229, 231, 235);
        doc.rect(15, 15, 180, 25);

        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text("GROUP : CELNET", 105, 22, { align: "center" });

        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text("A-118 Sector-63 Noida, Uttar Pradesh 201301 India", 105, 27, { align: "center" });

        doc.setFont("helvetica", "bold");
        doc.text(`PAYSLIP FOR THE MONTH OF : ${monthName} ${slip.year}`, 105, 33, { align: "center" });

        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.text("CONFIDENTIAL", 105, 38, { align: "center" });

        // 2. Employee Info Grid
        autoTable(doc, {
            startY: 45,
            body: [
                [
                    { content: `Emp Name: ${emp.user.name || 'N/A'}`, styles: { halign: 'left' } },
                    { content: `DOJ: ${emp.dateOfJoining ? new Date(emp.dateOfJoining).toLocaleDateString('en-GB').replace(/\//g, '-') : 'N/A'}`, styles: { halign: 'left' } }
                ],
                [
                    { content: `Total Working Days: ${30 - (slip.lwpDeduction > 0 ? 1 : 0)}`, styles: { halign: 'left' } }, // Simple logic for demo
                    { content: `Total Days: 30`, styles: { halign: 'left' } }
                ],
                [
                    { content: `Designation: ${emp.designation || 'Staff'}`, styles: { halign: 'left' }, colSpan: 2 }
                ]
            ],
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 2, lineColor: [229, 231, 235], lineWidth: 0.1 },
            columnStyles: { 0: { cellWidth: 90 }, 1: { cellWidth: 90 } }
        });

        // 3. Main Breakdown Table
        const earnings = [
            ['Basic', (slip.basicSalary || 0).toFixed(2)],
            ['HRA', (slip.hra || 0).toFixed(2)],
            ['Conveyance', (slip.conveyance || 0).toFixed(2)],
            ['Statutory Bonus', (slip.statutoryBonus || 0).toFixed(2)],
            ['Special Allowances', (slip.specialAllowance || 0).toFixed(2)],
            ['Others', (slip.otherAllowances || 0).toFixed(2)],
        ];

        const deductions = [
            ['PF', (slip.pfEmployee || 0).toFixed(2)],
            ['ESIC', (slip.esicEmployee || 0).toFixed(2)],
            ['TDS', (slip.tds || 0).toFixed(2)],
            ['Advance', (slip.advanceDeduction || 0).toFixed(2)],
            ['Professional Tax', (slip.professionalTax || 0).toFixed(2)],
            ['Loan EMI', '0.00'],
            ['Others', (slip.lwpDeduction || 0).toFixed(2)],
        ];

        const employerContrib = [
            ['Employer PF', (slip.pfEmployer || 0).toFixed(2)],
            ['Employer ESIC', (slip.esicEmployer || 0).toFixed(2)],
        ];

        const perks = [
            ['Health Care', (slip.healthCare || 0).toFixed(2)],
            ['Travelling', (slip.travelling || 0).toFixed(2)],
            ['Mobile', (slip.mobile || 0).toFixed(2)],
            ['Internet', (slip.internet || 0).toFixed(2)],
            ['Books & Periodicals', (slip.booksAndPeriodicals || 0).toFixed(2)],
            ['Others', '—'],
        ];

        const totalA = slip.grossSalary || earnings.reduce((sum, r) => sum + parseFloat(r[1]), 0);
        const totalB = (slip.pfEmployer || 0) + (slip.esicEmployer || 0);
        const totalC = (slip.healthCare || 0) + (slip.travelling || 0) + (slip.mobile || 0) + (slip.internet || 0) + (slip.booksAndPeriodicals || 0);
        const totalDeductions = deductions.reduce((sum, r) => sum + (parseFloat(r[1]) || 0), 0);
        const netPayable = (totalA - totalDeductions) + totalC;

        autoTable(doc, {
            startY: (doc as any).lastAutoTable.finalY + 5,
            head: [['Earning', 'Amount (Rs.)', 'Deduction', 'Amount (Rs.)']],
            body: [
                ...Array.from({ length: Math.max(earnings.length, deductions.length) }).map((_, i) => [
                    earnings[i]?.[0] || '',
                    earnings[i]?.[1] || '',
                    deductions[i]?.[0] || '',
                    deductions[i]?.[1] || ''
                ]),
                [{ content: 'Total (A) Gross', styles: { fontStyle: 'bold' } }, { content: totalA.toFixed(2), styles: { fontStyle: 'bold' } }, { content: 'Others', styles: { fontStyle: 'normal' } }, { content: '0.00', styles: { fontStyle: 'normal' } }],
                [{ content: 'Employer Contribution', colSpan: 4, styles: { halign: 'center', fontStyle: 'bold', fillColor: [249, 250, 251] } }],
                [employerContrib[0][0], employerContrib[0][1], '', ''],
                [employerContrib[1][0], employerContrib[1][1], '', ''],
                [{ content: 'Total (B)', styles: { fontStyle: 'bold' } }, { content: totalB.toFixed(2), styles: { fontStyle: 'bold' } }, '', ''],
                [{ content: 'Sec-10 Exemp/Perks', colSpan: 4, styles: { halign: 'center', fontStyle: 'bold', fillColor: [249, 250, 251] } }],
                ...perks.map((p, i) => [
                    p[0],
                    p[1],
                    i === perks.length - 1 ? { content: 'Total Deductions', styles: { fontStyle: 'bold' } } : '',
                    i === perks.length - 1 ? { content: totalDeductions.toFixed(2), styles: { fontStyle: 'bold' } } : ''
                ]),
                [{ content: 'Total (C)', styles: { fontStyle: 'bold' } }, { content: totalC.toFixed(2), styles: { fontStyle: 'bold' } }, '', ''],
                [{ content: 'Total (A+B+C)', styles: { fontStyle: 'bold' } }, { content: (totalA + totalB + totalC).toFixed(2), styles: { fontStyle: 'bold' } }, { content: 'Net Payable', styles: { fontStyle: 'bold' } }, { content: netPayable.toFixed(2), styles: { fontStyle: 'bold' } }]
            ],
            theme: 'grid',
            headStyles: { fillColor: [249, 250, 251], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center' },
            styles: { fontSize: 8, cellPadding: 2, lineColor: [229, 231, 235], lineWidth: 0.1 },
            columnStyles: {
                1: { halign: 'right', cellWidth: 35 },
                3: { halign: 'right', cellWidth: 35 }
            }
        });

        // 4. Footer Section
        const finalY = (doc as any).lastAutoTable.finalY + 10;
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.text("Note: Since this is a computer generated slip no signature is required.", 105, finalY, { align: "center" });

        doc.setFontSize(7);
        doc.setTextColor(100, 100, 100);
        const notice = "This document contains confidential information. if you are not intended recipient, you are not authorised to use and disclose it in any form.";
        const splitNotice = doc.splitTextToSize(notice, 160);
        doc.text(splitNotice, 105, finalY + 8, { align: "center" });

        const pdfBuffer = doc.output('arraybuffer');

        return new NextResponse(pdfBuffer, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="Salary_Slip_${monthName}_${slip.year}.pdf"`
            }
        });

    } catch (error: any) {
        console.error('PDF Generation Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

