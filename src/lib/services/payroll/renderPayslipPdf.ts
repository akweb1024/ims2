import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

type PayslipEmployee = {
  user: {
    name: string | null;
    email: string;
    company?: {
      name?: string | null;
      address?: string | null;
    } | null;
  };
  designation?: string | null;
  dateOfJoining?: Date | string | null;
};

type Payslip = {
  id: string;
  month: number;
  year: number;
  basicSalary: number | null;
  hra: number | null;
  conveyance: number | null;
  medical: number | null;
  statutoryBonus: number | null;
  specialAllowance: number | null;
  otherAllowances: number | null;
  grossSalary: number | null;
  pfEmployee: number | null;
  esicEmployee: number | null;
  tds: number | null;
  advanceDeduction: number | null;
  professionalTax: number | null;
  lwpDeduction: number | null;
  pfEmployer: number | null;
  esicEmployer: number | null;
  healthCare: number | null;
  travelling: number | null;
  mobile: number | null;
  internet: number | null;
  booksAndPeriodicals: number | null;
  employee: PayslipEmployee;
};

export function renderPayslipPdf(slip: Payslip): ArrayBuffer {
  const doc = new jsPDF();

  const monthName = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][slip.month - 1] || '';

  const companyName = slip.employee.user.company?.name || 'Company';
  const companyAddress = slip.employee.user.company?.address || '';

  doc.setDrawColor(229, 231, 235);
  doc.rect(15, 15, 180, 25);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(companyName.toUpperCase(), 105, 22, { align: 'center' });

  if (companyAddress) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(companyAddress, 105, 27, { align: 'center' });
  }

  doc.setFont('helvetica', 'bold');
  doc.text(`PAYSLIP FOR THE MONTH OF : ${monthName} ${slip.year}`, 105, 33, { align: 'center' });

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('CONFIDENTIAL', 105, 38, { align: 'center' });

  const doj = slip.employee.dateOfJoining ? new Date(slip.employee.dateOfJoining).toLocaleDateString('en-GB').replace(/\//g, '-') : 'N/A';

  autoTable(doc as any, {
    startY: 45,
    body: [
      [
        { content: `Emp Name: ${slip.employee.user.name || 'N/A'}`, styles: { halign: 'left' } },
        { content: `DOJ: ${doj}`, styles: { halign: 'left' } },
      ],
      [{ content: `Designation: ${slip.employee.designation || 'Staff'}`, styles: { halign: 'left' }, colSpan: 2 }],
    ],
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2, lineColor: [229, 231, 235], lineWidth: 0.1 },
    columnStyles: { 0: { cellWidth: 90 }, 1: { cellWidth: 90 } },
  } as any);

  const earnings: Array<[string, string]> = [
    ['Basic', (slip.basicSalary || 0).toFixed(2)],
    ['HRA', (slip.hra || 0).toFixed(2)],
    ['Conveyance', (slip.conveyance || 0).toFixed(2)],
    ['Medical', (slip.medical || 0).toFixed(2)],
    ['Statutory Bonus', (slip.statutoryBonus || 0).toFixed(2)],
    ['Special Allowance', (slip.specialAllowance || 0).toFixed(2)],
    ['Other Allowances', (slip.otherAllowances || 0).toFixed(2)],
  ];

  const deductions: Array<[string, string]> = [
    ['PF', (slip.pfEmployee || 0).toFixed(2)],
    ['ESIC', (slip.esicEmployee || 0).toFixed(2)],
    ['Professional Tax', (slip.professionalTax || 0).toFixed(2)],
    ['TDS', (slip.tds || 0).toFixed(2)],
    ['Advance / EMI', (slip.advanceDeduction || 0).toFixed(2)],
    ['LWP Deduction', (slip.lwpDeduction || 0).toFixed(2)],
  ];

  const employerContrib: Array<[string, string]> = [
    ['Employer PF', (slip.pfEmployer || 0).toFixed(2)],
    ['Employer ESIC', (slip.esicEmployer || 0).toFixed(2)],
  ];

  const perks: Array<[string, string]> = [
    ['Health Care', (slip.healthCare || 0).toFixed(2)],
    ['Travelling', (slip.travelling || 0).toFixed(2)],
    ['Mobile', (slip.mobile || 0).toFixed(2)],
    ['Internet', (slip.internet || 0).toFixed(2)],
    ['Books & Periodicals', (slip.booksAndPeriodicals || 0).toFixed(2)],
  ];

  const totalA = slip.grossSalary || earnings.reduce((sum, r) => sum + parseFloat(r[1]), 0);
  const totalB = (slip.pfEmployer || 0) + (slip.esicEmployer || 0);
  const totalC =
    (slip.healthCare || 0) +
    (slip.travelling || 0) +
    (slip.mobile || 0) +
    (slip.internet || 0) +
    (slip.booksAndPeriodicals || 0);
  const totalDeductions = deductions.reduce((sum, r) => sum + (parseFloat(r[1]) || 0), 0);
  const netPayable = (totalA - totalDeductions) + totalC;

  autoTable(doc as any, {
    startY: (doc as any).lastAutoTable.finalY + 5,
    head: [['Earning', 'Amount (Rs.)', 'Deduction', 'Amount (Rs.)']],
    body: [
      ...Array.from({ length: Math.max(earnings.length, deductions.length) }).map((_, i) => [
        earnings[i]?.[0] || '',
        earnings[i]?.[1] || '',
        deductions[i]?.[0] || '',
        deductions[i]?.[1] || '',
      ]),
      [
        { content: 'Total (A) Gross', styles: { fontStyle: 'bold' } },
        { content: totalA.toFixed(2), styles: { fontStyle: 'bold' } },
        { content: '', styles: { fontStyle: 'normal' } },
        { content: '', styles: { fontStyle: 'normal' } },
      ],
      [{ content: 'Employer Contribution', colSpan: 4, styles: { halign: 'center', fontStyle: 'bold', fillColor: [249, 250, 251] } }],
      [employerContrib[0][0], employerContrib[0][1], '', ''],
      [employerContrib[1][0], employerContrib[1][1], '', ''],
      [{ content: 'Total (B)', styles: { fontStyle: 'bold' } }, { content: totalB.toFixed(2), styles: { fontStyle: 'bold' } }, '', ''],
      [{ content: 'Sec-10 Exemp/Perks', colSpan: 4, styles: { halign: 'center', fontStyle: 'bold', fillColor: [249, 250, 251] } }],
      ...perks.map((p, i) => [
        p[0],
        p[1],
        i === perks.length - 1 ? { content: 'Total Deductions', styles: { fontStyle: 'bold' } } : '',
        i === perks.length - 1 ? { content: totalDeductions.toFixed(2), styles: { fontStyle: 'bold' } } : '',
      ]),
      [{ content: 'Total (C)', styles: { fontStyle: 'bold' } }, { content: totalC.toFixed(2), styles: { fontStyle: 'bold' } }, '', ''],
      [
        { content: 'Total (A+B+C)', styles: { fontStyle: 'bold' } },
        { content: (totalA + totalB + totalC).toFixed(2), styles: { fontStyle: 'bold' } },
        { content: 'Net Payable', styles: { fontStyle: 'bold' } },
        { content: netPayable.toFixed(2), styles: { fontStyle: 'bold' } },
      ],
    ],
    theme: 'grid',
    headStyles: { fillColor: [249, 250, 251], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center' },
    styles: { fontSize: 8, cellPadding: 2, lineColor: [229, 231, 235], lineWidth: 0.1 },
    columnStyles: {
      1: { halign: 'right', cellWidth: 35 },
      3: { halign: 'right', cellWidth: 35 },
    },
  } as any);

  const finalY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Note: Since this is a computer generated slip no signature is required.', 105, finalY, { align: 'center' });

  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  const notice =
    'This document contains confidential information. If you are not the intended recipient, you are not authorised to use or disclose it in any form.';
  const splitNotice = doc.splitTextToSize(notice, 160);
  doc.text(splitNotice, 105, finalY + 8, { align: 'center' });

  return doc.output('arraybuffer');
}
