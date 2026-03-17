"use client";

import { useState, useEffect, useCallback, use } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import FormattedDate from "@/components/common/FormattedDate";
import CreateInvoiceModal from "@/components/dashboard/CreateInvoiceModal";
import AnvInvoiceTemplate from "@/components/dashboard/invoices/AnvInvoiceTemplate";
import GlobalProInvoiceTemplate from "@/components/dashboard/invoices/GlobalProInvoiceTemplate";

// Helper: convert number to Indian words
// Helper: convert number to words based on currency
function numberToWords(num: number, currency: string = "INR"): string {
  const ones = [
    "",
    "ONE",
    "TWO",
    "THREE",
    "FOUR",
    "FIVE",
    "SIX",
    "SEVEN",
    "EIGHT",
    "NINE",
    "TEN",
    "ELEVEN",
    "TWELVE",
    "THIRTEEN",
    "FOURTEEN",
    "FIFTEEN",
    "SIXTEEN",
    "SEVENTEEN",
    "EIGHTEEN",
    "NINETEEN",
  ];
  const tens = [
    "",
    "",
    "TWENTY",
    "THIRTY",
    "FORTY",
    "FIFTY",
    "SIXTY",
    "SEVENTY",
    "EIGHTY",
    "NINETY",
  ];

  function convert(n: number, isIndian: boolean): string {
    if (n === 0) return "";
    if (n < 20) return ones[n] + " ";
    if (n < 100)
      return tens[Math.floor(n / 10)] + " " + convert(n % 10, isIndian);
    if (n < 1000)
      return (
        ones[Math.floor(n / 100)] + " HUNDRED " + convert(n % 100, isIndian)
      );

    if (isIndian) {
      if (n < 100000)
        return (
          convert(Math.floor(n / 1000), true) +
          "THOUSAND " +
          convert(n % 1000, true)
        );
      if (n < 10000000)
        return (
          convert(Math.floor(n / 100000), true) +
          "LAKH " +
          convert(n % 100000, true)
        );
      return (
        convert(Math.floor(n / 10000000), true) +
        "CRORE " +
        convert(n % 10000000, true)
      );
    } else {
      if (n < 1000000)
        return (
          convert(Math.floor(n / 1000), false) +
          "THOUSAND " +
          convert(n % 1000, false)
        );
      if (n < 1000000000)
        return (
          convert(Math.floor(n / 1000000), false) +
          "MILLION " +
          convert(n % 1000000, false)
        );
      return (
        convert(Math.floor(n / 1000000000), false) +
        "BILLION " +
        convert(n % 1000000000, false)
      );
    }
  }

  const isIndian = currency === "INR";
  const intPart = Math.floor(num);
  const decPart = Math.round((num - intPart) * 100);

  let mainUnit = "INDIAN RUPEES";
  let subUnit = "PAISE";

  if (currency === "USD") {
    mainUnit = "US DOLLARS";
    subUnit = "CENTS";
  } else if (currency === "EUR") {
    mainUnit = "EUROS";
    subUnit = "CENTS";
  } else if (currency === "GBP") {
    mainUnit = "BRITISH POUNDS";
    subUnit = "PENCE";
  } else if (currency !== "INR" && currency) {
    mainUnit = currency;
    subUnit = "UNITS";
  }

  let result = `${mainUnit} ` + convert(intPart, isIndian).trim() + " ONLY";
  if (decPart > 0)
    result =
      `${mainUnit} ` +
      convert(intPart, isIndian).trim() +
      " AND " +
      convert(decPart, isIndian).trim() +
      ` ${subUnit} ONLY`;
  return result.replace(/\s+/g, " ").trim();
}

export default function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState("CUSTOMER");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    method: "bank-transfer",
    reference: "",
    notes: "",
  });
  const [showEditModal, setShowEditModal] = useState(false);
  const [templateType, setTemplateType] = useState<"standard" | "anv" | "globalpro">(
    "globalpro",
  );

  const fetchInvoice = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/invoices/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setInvoice(data);
      } else {
        const err = await res.json();
        setError(err.error || "Invoice not found");
      }
    } catch (err) {
      setError("Failed to load invoice");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      const user = JSON.parse(userData);
      setUserRole(user.role);
    }
    fetchInvoice();
  }, [id, fetchInvoice]);

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPaying(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/invoices/${id}/pay`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: invoice.total,
          paymentMethod: paymentForm.method,
          transactionId: paymentForm.reference || `TXN-${Date.now()}`,
          notes: paymentForm.notes || "Payment via Portal",
        }),
      });
      if (res.ok) {
        await fetchInvoice();
        setShowPaymentModal(false);
        setPaymentForm({ method: "bank-transfer", reference: "", notes: "" });
        alert("Payment processed successfully!");
      } else {
        const err = await res.json();
        alert(err.error || "Payment failed");
      }
    } catch (err) {
      alert("Payment simulation failed");
    } finally {
      setIsPaying(false);
    }
  };

  const handleSyncCatalogue = async () => {
    if (
      !confirm(
        "This will update all product line items on this invoice with the latest prices and details from the product catalogue. Continue?",
      )
    ) {
      return;
    }
    setIsSyncing(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/invoices/${id}/refresh-products`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        alert(data.message || "Sync successful");
        if (data.updated > 0) {
          await fetchInvoice(); // Refresh standard invoice details
        }
      } else {
        const err = await res.json();
        alert(err.error || "Failed to sync with catalogue");
      }
    } catch (err) {
      alert("Failed to connect to sync endpoint");
    } finally {
      setIsSyncing(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout userRole={userRole}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !invoice) {
    return (
      <DashboardLayout userRole={userRole}>
        <div className="card-premium p-12 text-center">
          <div className="text-danger-500 text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-secondary-900">
            {error || "Invoice not found"}
          </h2>
          <button
            onClick={() => router.back()}
            className="btn btn-primary mt-6"
          >
            Go Back
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const currCode = (invoice.currency || "INR").toUpperCase();
  const currencySymbol =
    currCode === "INR"
      ? "₹"
      : currCode === "USD"
        ? "$"
        : currCode === "EUR"
          ? "€"
          : currCode === "GBP"
            ? "£"
            : invoice.currency || "₹";
  const customer =
    invoice.subscription?.customerProfile || invoice.customerProfile || {};
  const invoiceItems: any[] =
    Array.isArray(invoice.lineItems) && invoice.lineItems.length > 0
      ? invoice.lineItems
      : invoice.subscription?.items || [];
  const company = invoice.company || {};
  const brand = invoice.brand || null;
  const invoiceCountry =
    invoice.shippingCountry ||
    invoice.billingCountry ||
    customer.shippingCountry ||
    customer.billingCountry ||
    customer.country ||
    "India";
  const isExport = invoiceCountry.toLowerCase() !== "india";

  // Tax detection
  const hasBreakedDownTax = invoice.cgstRate > 0 || invoice.sgstRate > 0;
  const isIGST =
    !isExport &&
    (invoice.igstRate > 0 ||
      (!hasBreakedDownTax &&
        (invoice.placeOfSupplyCode
          ? invoice.placeOfSupplyCode !==
            (invoice.companyStateCode || company.stateCode)
          : (customer.shippingStateCode ||
              customer.billingStateCode ||
              customer.state) !== company.stateCode)));

  const taxLabel = isExport
    ? "Export (0% Tax)"
    : isIGST
      ? `IGST (${invoice.igstRate || invoice.taxRate || 18}%)`
      : `CGST + SGST (${(invoice.cgstRate ? invoice.cgstRate + invoice.sgstRate : invoice.taxRate) || 18}%)`;
  const subtotal = invoice.amount || 0;
  const taxAmt = invoice.tax || 0;
  const grandTotal = invoice.total || 0;

  // Status badge colors
  const statusColors: Record<string, string> = {
    PAID: "background-color:#dcfce7;color:#16a34a;",
    UNPAID: "background-color:#fef9c3;color:#a16207;",
    OVERDUE: "background-color:#fee2e2;color:#dc2626;",
    PARTIALLY_PAID: "background-color:#fef3c7;color:#d97706;",
    CANCELLED: "background-color:#f1f5f9;color:#64748b;",
    VOID: "background-color:#f1f5f9;color:#64748b;",
  };

  // Identity Lookup (preferring snapshots from invoice)
  const identity = {
    name:
      invoice.brandLegalName ||
      brand?.name ||
      company.legalEntityName ||
      company.name ||
      "STM JOURNALS",
    tagline: invoice.brandTagline || brand?.tagline || company.tagline,
    address: invoice.brandAddress || brand?.address || company.address,
    email: invoice.brandEmail || brand?.email || company.email,
    website: invoice.brandWebsite || brand?.website || company.website,
    gstin: invoice.brandGstin || company.gstin,
    cin: invoice.brandCin || company.cinNo,
    pan: invoice.brandPan || company.panNo,
    iec: invoice.brandIec || company.iecCode,
    bankName: invoice.brandBankName || company.bankName,
    bankHolder:
      invoice.brandBankHolder ||
      company.bankAccountHolder ||
      company.legalEntityName ||
      company.name,
    bankNumber: invoice.brandBankNumber || company.bankAccountNumber,
    bankIfsc: invoice.brandBankIfsc || company.bankIfscCode,
    bankSwift: invoice.brandBankSwift || company.bankSwiftCode,
    paymentMode: invoice.brandPaymentMode || company.paymentMode,
    regdOffice:
      invoice.brandRegdOfficeAddress ||
      brand?.regdOfficeAddress ||
      company.regdOfficeAddress,
    salesOffice:
      invoice.brandSalesOfficeAddress ||
      brand?.salesOfficeAddress ||
      company.salesOfficeAddress,
    terms:
      invoice.brandInvoiceTerms || brand?.invoiceTerms || company.invoiceTerms,
    brandLogoUrl: invoice.brandLogoUrl || brand?.logoUrl || company.logoUrl,
    companyLogoUrl:
      invoice.companyLogoUrl ||
      brand?.companyLogoUrl ||
      company.invoiceCompanyLogoUrl ||
      company.logoUrl,
    relationType:
      invoice.brandRelationType ||
      brand?.brandRelationType ||
      company?.brandRelationType ||
      "A Brand of",
  };

  const invoiceTitle =
    invoice.status === "PAID" ? "TAX INVOICE" : "PROFORMA INVOICE";
  const displayInvoiceNumber =
    invoice.status === "PAID"
      ? invoice.invoiceNumber
      : invoice.proformaNumber || invoice.invoiceNumber;
  const validUntilDate = new Date(invoice.dueDate);

  return (
    <DashboardLayout userRole={userRole}>
      <style>{`
                @media print {
                    @page {
                        size: A4;
                        margin: 10mm;
                    }
                    .no-print { display: none !important; }
                    .print-content { 
                        margin: 0 !important; 
                        padding: 0 !important; 
                        border: none !important; 
                        box-shadow: none !important; 
                        width: 100% !important;
                    }
                    body { background: white !important; font-family: "Segoe UI", Arial, sans-serif !important; }
                }
                
                .ref-invoice {
                    color: #000;
                    font-family: "Segoe UI", Arial, sans-serif;
                    font-size: 11px;
                    line-height: 1.3;
                    max-width: 800px;
                    margin: 0 auto;
                    border: 1px solid #777;
                    background: white;
                }
                .inv-header {
                    border-bottom: 1px solid #777;
                    padding: 15px;
                    text-align: center;
                }
                .brand-title {
                    font-size: 24px;
                    font-weight: 800;
                    color: #1a365d;
                    margin: 5px 0;
                }
                .company-info {
                    font-size: 10px;
                    color: #333;
                }
                .meta-row {
                    display: grid;
                    grid-template-columns: 1fr 1fr 1fr;
                    border-bottom: 1px solid #777;
                }
                .meta-col {
                    padding: 10px;
                    border-right: 1px solid #777;
                }
                .meta-col:last-child {
                    border-right: none;
                }
                .meta-label {
                    font-size: 9px;
                    font-weight: 700;
                    text-transform: uppercase;
                    color: #444;
                    margin-bottom: 5px;
                    display: block;
                }
                .meta-value-lg {
                    font-size: 16px;
                    font-weight: 800;
                    color: #000;
                }
                .meta-value-blue {
                    font-size: 14px;
                    font-weight: 700;
                    color: #2563eb;
                }
                .address-row {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    border-bottom: 1px solid #777;
                }
                .address-col {
                    padding: 10px;
                    border-right: 1px solid #777;
                }
                .address-col:last-child {
                    border-right: none;
                }
                .section-title {
                    font-size: 10px;
                    font-weight: 800;
                    text-decoration: underline;
                    text-transform: uppercase;
                    margin-bottom: 8px;
                    display: block;
                }
                .bank-list {
                    list-style: none;
                    padding: 0;
                    margin: 0;
                }
                .bank-list li {
                    display: flex;
                    margin-bottom: 2px;
                }
                .bank-list label {
                    font-weight: 700;
                    width: 80px;
                    flex-shrink: 0;
                }
                .items-table {
                    width: 100%;
                    border-collapse: collapse;
                }
                .items-table th {
                    border-bottom: 1px solid #777;
                    border-right: 1px solid #777;
                    padding: 6px;
                    background: #f8f9fa;
                    font-size: 9px;
                    font-weight: 800;
                    text-align: center;
                }
                .items-table th:last-child { border-right: none; }
                .items-table td {
                    border-bottom: 1px solid #777;
                    border-right: 1px solid #777;
                    padding: 8px 6px;
                    vertical-align: top;
                }
                .items-table td:last-child { border-right: none; }
                .total-section {
                    padding: 10px;
                    border-bottom: 1px solid #777;
                }
                .total-grid {
                    display: grid;
                    grid-template-columns: 0.8fr 1.2fr;
                    align-items: end;
                }
                .words-area {
                    font-weight: 700;
                    font-size: 10px;
                }
                .sums-area {
                    text-align: right;
                }
                .sum-row {
                    display: flex;
                    justify-content: flex-end;
                    gap: 15px;
                    margin-bottom: 3px;
                }
                .sum-label { font-weight: 600; color: #444; font-size: 10px; }
                .sum-value { font-weight: 700; width: 100px; font-size: 11px; }
                .grand-total-row {
                    border-top: 1px solid #777;
                    margin-top: 5px;
                    padding-top: 5px;
                    font-size: 14px;
                }
                .terms-sign {
                    display: grid;
                    grid-template-columns: 1.5fr 1fr;
                    padding: 15px;
                    min-height: 150px;
                }
                .terms-area { font-size: 8.5px; color: #333; }
                .sign-area {
                    text-align: right;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                }
                .footer-box {
                    padding: 10px 15px;
                    border-top: 2px solid #333;
                    background: #fcfcfc;
                }
                .offices-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 20px;
                    margin-bottom: 10px;
                }
                .office-title {
                    font-size: 8px;
                    font-weight: 800;
                    color: #777;
                    margin-bottom: 4px;
                    text-transform: uppercase;
                }
                .office-text { font-size: 9px; line-height: 1.4; color: #333; }
                .contact-bottom {
                    border-top: 1px solid #eee;
                    padding-top: 8px;
                    display: flex;
                    justify-content: center;
                    gap: 20px;
                    font-size: 9px;
                    font-weight: 600;
                    color: #444;
                }
            `}</style>

      <div className="invoice-wrap max-w-5xl mx-auto pb-12 space-y-6">
        {/* Action Bar */}
        <div className="flex justify-between items-center no-print px-4 md:px-0">
          <button
            onClick={() => router.back()}
            className="btn btn-secondary flex items-center gap-2 rounded-full px-6"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Exit Preview
          </button>
          <div className="flex gap-3">
            <select
              className="btn btn-secondary rounded-full px-6 outline-none appearance-none cursor-pointer bg-white"
              value={templateType}
              onChange={(e) => setTemplateType(e.target.value as any)}
            >
              <option value="standard">Standard Template</option>
              <option value="anv">ANV Premium (Raipur Style)</option>
              <option value="globalpro">🌐 GlobalPro — Indian Business (Global)</option>
            </select>
            <button
              className="btn btn-secondary rounded-full px-6"
              onClick={() => window.print()}
            >
              🖨 Save PDF / Print
            </button>
            {invoice.status !== "PAID" && invoice.status !== "CANCELLED" && (
              <>
                <button
                  className="btn btn-secondary rounded-full px-6 flex items-center gap-2 border-primary-100 text-primary-600 hover:bg-primary-50"
                  onClick={() => setShowEditModal(true)}
                >
                  📝 Edit / Modify
                </button>
                {invoice.status === "DRAFT" && (
                  <button
                    className="btn btn-secondary rounded-full px-6 flex items-center gap-2 border-amber-100 text-amber-600 hover:bg-amber-50"
                    onClick={handleSyncCatalogue}
                    disabled={isSyncing}
                  >
                    {isSyncing ? "🔄 Syncing..." : "🔄 Sync Catalogue Prices"}
                  </button>
                )}
                <button
                  className="btn btn-primary shadow-xl shadow-primary-200 rounded-full px-8"
                  onClick={() => setShowPaymentModal(true)}
                >
                  💳 Settle Invoice
                </button>
              </>
            )}
          </div>
        </div>

        {/* ─── PREMIUM TAX INVOICE DOCUMENT ─── */}
        {templateType === "anv" ? (
          <div className="print-content shadow-2xl">
            <AnvInvoiceTemplate
              invoice={invoice}
              identity={identity}
              currencySymbol={currencySymbol}
              numberToWords={numberToWords}
              invoiceTitle={invoiceTitle}
            />
          </div>
        ) : templateType === "globalpro" ? (
          <div className="print-content shadow-2xl">
            <GlobalProInvoiceTemplate
              invoice={invoice}
              identity={identity}
              currencySymbol={currencySymbol}
              numberToWords={numberToWords}
              invoiceTitle={invoiceTitle}
            />
          </div>
        ) : (
          <div className="print-content ref-invoice shadow-2xl">
            {/* HEADER */}
            <div className="inv-header flex items-center justify-between">
              {/* Left Logo (Brand Strategy) */}
              <div className="w-[150px] flex justify-start pl-2">
                {identity.brandLogoUrl && (
                  <Image
                    src={identity.brandLogoUrl}
                    className="max-h-16 w-auto object-contain"
                    alt="Brand Logo"
                    width={160}
                    height={64}
                    unoptimized
                  />
                )}
              </div>

              {/* Center Details */}
              <div className="flex-1 flex flex-col items-center text-center px-4">
                <h1 className="brand-title leading-none">{identity.name}</h1>
                {identity.tagline && (
                  <p className="text-[10px] mt-1 font-semibold italic text-[#555] opacity-90">
                    {identity.tagline}
                  </p>
                )}
                <div className="company-info leading-relaxed mt-2">
                  <p className="font-bold text-[11px] uppercase tracking-wide">
                    {identity.relationType}{" "}
                    {company.legalEntityName || company.name}
                  </p>
                  <p className="opacity-90 whitespace-pre-line leading-tight mt-1 max-w-sm mx-auto">
                    {identity.address}
                  </p>
                </div>
              </div>

              {/* Right Logo (Company Strategy) */}
              <div className="w-[150px] flex justify-end pr-2">
                {identity.companyLogoUrl && (
                  <Image
                    src={identity.companyLogoUrl}
                    className="max-h-16 w-auto object-contain"
                    alt="Company Logo"
                    width={160}
                    height={64}
                    unoptimized
                  />
                )}
              </div>
            </div>

            {/* META SECTION */}
            <div className="meta-row">
              <div className="meta-col">
                <span className="meta-label">{invoiceTitle} NUMBER :</span>
                <div className="meta-value-lg mb-4">{displayInvoiceNumber}</div>

                <span className="meta-label">{invoiceTitle} DATE :</span>
                <div className="text-sm font-bold mb-4">
                  <FormattedDate date={invoice.createdAt} />
                </div>

                <span className="meta-label">VALID UNTIL :</span>
                <div className="meta-value-blue">
                  <FormattedDate date={invoice.dueDate} />
                </div>
              </div>
              <div className="meta-col">
                <span className="meta-label">BANK DETAILS:</span>
                <ul className="bank-list text-[10px] space-y-1 mt-1">
                  <li>
                    <label>A/C. Holder :</label>{" "}
                    <span className="text-[9px] italic">
                      {identity.bankHolder || "—"}
                    </span>
                  </li>
                  <li>
                    <label>Bank Name :</label>{" "}
                    <span>{identity.bankName || "—"}</span>
                  </li>
                  <li>
                    <label>Bank Address :</label>{" "}
                    <span className="text-[9px]">
                      {identity.address?.split(",").slice(0, 2).join(",")}
                    </span>
                  </li>
                  <li>
                    <label>A/C. Number :</label>{" "}
                    <span className="font-bold">
                      {identity.bankNumber || "—"}
                    </span>
                  </li>
                  <li>
                    <label>IFSC Code :</label>{" "}
                    <span className="font-bold">
                      {identity.bankIfsc || "—"}
                    </span>
                  </li>
                  <li>
                    <label>Swift Code :</label>{" "}
                    <span>{identity.bankSwift || "—"}</span>
                  </li>
                </ul>
              </div>
              <div className="meta-col text-[10px]">
                <div className="mb-4 leading-relaxed bg-secondary-50/50 p-2 rounded">
                  <strong>Legal Name:</strong>
                  <br />
                  <span className="font-black text-secondary-900">
                    {company.legalEntityName || company.name}
                  </span>
                </div>
                <div className="mb-2">
                  <strong>GSTIN :</strong> {identity.gstin || "—"}
                </div>
                <div className="mb-2">
                  <strong>PAN No. :</strong> {identity.pan || "—"}
                </div>
                <div className="mb-2">
                  <strong>CIN No. :</strong> {identity.cin || "—"}
                </div>
                <div className="mb-2">
                  <strong>IEC :</strong> {identity.iec || "—"}
                </div>
              </div>
            </div>

            {/* ADDRESSES */}
            <div className="address-row">
              <div className="address-col">
                <span className="section-title">
                  BILLED TO / DETAILS OF RECEIVER:
                </span>
                <div className="space-y-1">
                  <p>
                    <strong>Name :</strong> {customer.name || "—"}
                  </p>
                  <p>
                    <strong>Institution :</strong>{" "}
                    {customer.institution?.name || "—"}
                  </p>
                  <p className="leading-relaxed">
                    <strong>Address :</strong>{" "}
                    {invoice.billingAddress || customer.billingAddress}
                  </p>
                  <p>
                    <strong>GSTIN :</strong> {invoice.gstNumber || "N/A"}
                  </p>
                </div>
              </div>
              <div className="address-col relative">
                <span className="section-title">
                  SHIPPED TO / DELIVERY ADDRESS:
                </span>
                <div className="space-y-1">
                  <p>
                    <strong>Recipient :</strong> {customer.name || "—"}
                  </p>
                  <p className="leading-relaxed">
                    <strong>Address :</strong>{" "}
                    {invoice.shippingAddress ||
                      customer.shippingAddress ||
                      invoice.billingAddress}
                  </p>
                  <p>
                    <strong>Contact :</strong> {customer.primaryPhone || "—"}
                  </p>
                </div>
                <div className="absolute top-2 right-2 text-center">
                  <span className="text-[7px] text-gray-400 font-bold block mb-1">
                    SCAN INVOICE
                  </span>
                  <div className="w-12 h-12 border border-gray-100 flex items-center justify-center text-[8px] text-gray-300">
                    QR
                  </div>
                </div>
              </div>
            </div>

            {/* ITEMS TABLE */}
            <table className="items-table">
              <thead>
                <tr>
                  <th style={{ width: "40px" }}>Sr.No</th>
                  <th style={{ textAlign: "left" }}>Particulars</th>
                  <th style={{ width: "60px" }}>HSN/SAC</th>
                  <th style={{ width: "40px" }}>Qty</th>
                  <th style={{ width: "80px", textAlign: "right" }}>
                    Unit Price ({currencySymbol})
                  </th>
                  <th style={{ width: "80px", textAlign: "right" }}>
                    Amount ({currencySymbol})
                  </th>
                  <th style={{ width: "70px", textAlign: "right" }}>
                    Discount ({currencySymbol})
                  </th>
                  <th style={{ width: "80px", textAlign: "right" }}>
                    Taxable Value ({currencySymbol})
                  </th>
                  <th style={{ width: "60px", textAlign: "right" }}>
                    GST Rate (%)
                  </th>
                  <th style={{ width: "90px", textAlign: "right" }}>
                    Net Amount ({currencySymbol})
                  </th>
                </tr>
              </thead>
              <tbody>
                {invoiceItems.map((item, idx) => {
                  const taxable =
                    (item.amount || item.quantity * item.price) -
                    (item.discount || 0);
                  const gstRate =
                    item.taxRate || (isExport ? 0 : invoice.taxRate || 18);
                  const gstAmt = taxable * (gstRate / 100);
                  return (
                    <tr key={idx}>
                      <td style={{ textAlign: "center" }}>{idx + 1}</td>
                      <td>
                        <strong>
                          {item.description ||
                            item.journal?.name ||
                            "Item Name"}
                        </strong>
                        {item.plan && (
                          <div className="text-[9px] text-gray-500 mt-1">
                            [{item.plan.format} | {item.plan.duration} Months
                            Subscription]
                          </div>
                        )}
                        {!item.plan && (
                          <div className="text-[9px] text-gray-500 mt-1">
                            [Subscription Item]
                          </div>
                        )}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        {item.hsnCode || "9984"}
                      </td>
                      <td style={{ textAlign: "center" }}>{item.quantity}</td>
                      <td style={{ textAlign: "right" }}>
                        {item.price?.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        {(item.quantity * item.price).toLocaleString(
                          undefined,
                          { minimumFractionDigits: 2 },
                        )}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        {(item.discount || 0).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        {taxable.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td style={{ textAlign: "right" }}>{gstRate}%</td>
                      <td style={{ textAlign: "right", fontWeight: 700 }}>
                        {(taxable + gstAmt).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* TOTALS SECTION */}
            <div className="total-section">
              <div className="total-grid">
                <div className="words-area leading-snug">
                  In Words: {numberToWords(grandTotal, invoice.currency)}
                </div>
                <div className="sums-area">
                  <div className="sum-row">
                    <span className="sum-label">Subtotal:</span>
                    <span className="sum-value">
                      {subtotal.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>

                  {isExport ? (
                    <div className="sum-row text-gray-500 italic">
                      <span className="sum-label">Export (0% Tax):</span>
                      <span className="sum-value">0.00</span>
                    </div>
                  ) : isIGST ? (
                    <div className="sum-row">
                      <span className="sum-label">
                        IGST ({invoice.igstRate || invoice.taxRate}%):
                      </span>
                      <span className="sum-value">
                        {(invoice.igst || taxAmt).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  ) : (
                    <>
                      <div className="sum-row">
                        <span className="sum-label">
                          CGST ({invoice.cgstRate || invoice.taxRate / 2}%):
                        </span>
                        <span className="sum-value">
                          {(invoice.cgst || taxAmt / 2).toLocaleString(
                            undefined,
                            { minimumFractionDigits: 2 },
                          )}
                        </span>
                      </div>
                      <div className="sum-row">
                        <span className="sum-label">
                          SGST ({invoice.sgstRate || invoice.taxRate / 2}%):
                        </span>
                        <span className="sum-value">
                          {(invoice.sgst || taxAmt / 2).toLocaleString(
                            undefined,
                            { minimumFractionDigits: 2 },
                          )}
                        </span>
                      </div>
                    </>
                  )}

                  <div className="sum-row grand-total-row border-t border-black pt-2">
                    <span className="sum-label text-black font-black text-xs">
                      Total ({invoice.currency || "INR"})::
                    </span>
                    <span className="sum-value text-black font-black text-base">
                      {currencySymbol}
                      {grandTotal.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  <div className="sum-row text-[8px] text-gray-400">
                    <span className="sum-label">Round Off :</span>
                    <span className="sum-value">0.00</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-4 py-2 italic text-[9px] border-b border-gray-700">
              The sum of {currencySymbol}
              {grandTotal.toLocaleString()}/- is a payment on account of
              subscription by {identity.paymentMode || "NEFT/RTGS"}.
            </div>

            {/* TERMS AND SIGNATURE */}
            <div className="terms-sign">
              <div className="terms-area">
                <strong className="text-[10px] underline block mb-2">
                  TERMS & CONDITIONS:
                </strong>
                <div className="whitespace-pre-wrap leading-tight text-gray-600">
                  {identity.terms || (
                    <>
                      1. All subscription amount mentioned is as per year fee
                      (Between January and December).
                      <br />
                      2. Missing numbers will not be supplied if claims are
                      received more than six months.
                      <br />
                      3. The Publisher cannot accept responsibility for foreign
                      delivery when records indicate posting has been made.
                      <br />
                      4. Invoice subject to realization of demand draft/cheque.
                    </>
                  )}
                </div>
              </div>
              <div className="sign-area pb-2">
                <div className="font-bold text-[10px] text-gray-900">
                  For, {identity.name.toUpperCase()}
                </div>
                <div className="mt-8">
                  <div className="w-full border-b border-black mb-1"></div>
                  <div className="text-[9px] font-bold text-center uppercase tracking-wider">
                    AUTHORISED SIGNATORY
                  </div>
                </div>
              </div>
            </div>

            {/* FOOTER */}
            <div className="footer-box border-t-2 border-black">
              <div className="offices-grid">
                <div>
                  <div className="office-title">REGD. OFFICE:</div>
                  <div className="office-text font-medium">
                    {identity.regdOffice || "—"}
                  </div>
                </div>
                <div>
                  <div className="office-title">SALES & ADMIN OFFICE:</div>
                  <div className="office-text">
                    <strong>
                      {identity.name},{" "}
                      {invoice.brandRelationType ||
                        brand?.brandRelationType ||
                        company.brandRelationType ||
                        "A Brand of"}{" "}
                      {company.legalEntityName || company.name}
                    </strong>
                    <br />
                    <span className="font-medium">
                      {identity.salesOffice || "—"}
                    </span>
                  </div>
                </div>
              </div>
              <div className="contact-bottom mt-4 pt-2 border-t border-gray-100 flex justify-between px-8">
                <div>Tel: {company.phone || "+91 (0)120 - 4781206"}</div>
                <div>Mob: +91-9810078958</div>
                <div>E-mail: {identity.email}</div>
                <div>Website: {identity.website}</div>
              </div>
              <div className="text-center mt-3 text-[7px] text-gray-400">
                This computer generated invoice is available online at:{" "}
                {identity.website || "stmjournals.com"}/invoice.aspx?ID=
                {displayInvoiceNumber}
              </div>
            </div>
          </div>
        )}
        {/* ─── End of Tax Invoice Document ─── */}

        {/* Payment History */}
        {invoice.payments?.length > 0 && (
          <div className="card-premium no-print">
            <h3 className="text-lg font-bold text-secondary-900 mb-4">
              💳 Payment History
            </h3>
            <div className="space-y-3">
              {invoice.payments.map((p: any) => (
                <div
                  key={p.id}
                  className="flex justify-between items-center p-4 bg-secondary-50 rounded-xl border border-secondary-100"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 rounded-full bg-success-100 text-success-600 flex items-center justify-center text-lg">
                      ✓
                    </div>
                    <div>
                      <p className="font-bold text-secondary-900">
                        Payment Processed
                      </p>
                      <p className="text-xs text-secondary-500">
                        <FormattedDate date={p.paymentDate} /> via{" "}
                        {p.paymentMethod}
                      </p>
                      {p.transactionId && (
                        <p className="text-[10px] font-mono text-secondary-400">
                          {p.transactionId}
                        </p>
                      )}
                    </div>
                  </div>
                  <p className="font-bold text-success-600">
                    + {currencySymbol}
                    {p.amount.toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-secondary-900/50 backdrop-blur-sm p-4 no-print">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-secondary-900">
                Settle Invoice
              </h3>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-secondary-400 hover:text-secondary-600 text-2xl leading-none"
              >
                ✕
              </button>
            </div>
            <div className="bg-primary-50 p-4 rounded-xl mb-6 flex justify-between items-center">
              <span className="text-primary-800 font-medium">
                Invoice: {displayInvoiceNumber}
              </span>
              <span className="text-2xl font-black text-primary-700">
                {currencySymbol}
                {grandTotal.toLocaleString()}
              </span>
            </div>
            <form onSubmit={handlePaymentSubmit} className="space-y-4">
              <div>
                <label className="label">Payment Method</label>
                <select
                  className="input"
                  value={paymentForm.method}
                  onChange={(e) =>
                    setPaymentForm({ ...paymentForm, method: e.target.value })
                  }
                  title="Select Payment Method"
                >
                  <option value="bank-transfer">
                    Bank Transfer (NEFT/RTGS)
                  </option>
                  <option value="card">Credit/Debit Card</option>
                  <option value="cheque">Cheque/DD</option>
                  <option value="upi">UPI / QR Code</option>
                </select>
              </div>
              <div>
                <label className="label">
                  Transaction Reference (UTR/Cheque No.)
                </label>
                <input
                  className="input"
                  placeholder="e.g. UTR Number or Cheque#"
                  value={paymentForm.reference}
                  onChange={(e) =>
                    setPaymentForm({
                      ...paymentForm,
                      reference: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <label className="label">Notes</label>
                <textarea
                  className="input"
                  rows={2}
                  placeholder="Any additional remarks..."
                  value={paymentForm.notes}
                  onChange={(e) =>
                    setPaymentForm({ ...paymentForm, notes: e.target.value })
                  }
                />
              </div>
              <button
                type="submit"
                disabled={isPaying}
                className="btn btn-primary w-full py-4 text-lg font-bold shadow-xl mt-4"
              >
                {isPaying ? "Processing..." : "Confirm Payment"}
              </button>
            </form>
          </div>
        </div>
      )}

      <CreateInvoiceModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSuccess={() => {
          fetchInvoice();
          setShowEditModal(false);
        }}
        editId={id}
      />
    </DashboardLayout>
  );
}
