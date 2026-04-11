"use client";

import React from "react";
import Image from "next/image";
import { QRCodeSVG } from "qrcode.react";
import FormattedDate from "@/components/common/FormattedDate";
import { buildInvoiceTaxContext } from "@/lib/invoice-tax";

interface AnvInvoiceTemplateProps {
  invoice: any;
  identity: any;
  currencySymbol: string;
  numberToWords: (num: number, currency: string) => string;
  invoiceTitle: string;
}

export default function AnvInvoiceTemplate({
  invoice,
  identity,
  currencySymbol,
  numberToWords,
  invoiceTitle,
}: AnvInvoiceTemplateProps) {
  const customer =
    invoice.subscription?.customerProfile || invoice.customerProfile || {};
  const invoiceItems: any[] =
    Array.isArray(invoice.lineItems) && invoice.lineItems.length > 0
      ? invoice.lineItems
      : invoice.subscription?.items || [];
  const getReservationBadge = (item: any) => {
    const status = item?.stockReservation?.status;
    if (!status) return null;
    if (status === "RESERVED") return "Stock Reserved";
    if (status === "CONSUMED") return "Stock Consumed";
    if (status === "RELEASED") return "Stock Released";
    return null;
  };

  const invoiceCountry =
    invoice.shippingCountry ||
    invoice.billingCountry ||
    customer.shippingCountry ||
    customer.billingCountry ||
    customer.country ||
    "India";
  const isExport = invoiceCountry.toLowerCase() !== "india";
  const taxContext = buildInvoiceTaxContext(customer, {
    stateCode: invoice.companyStateCode || identity?.stateCode,
  });

  // ─── Compute derived tax from line items when stored DB values are 0/null ───
  // This prevents "IGST = ₹0" when the invoice was saved without tax fields populated.
  // Use ?? so a stored taxRate of 0 (e.g. Print Journal) is respected, not skipped.
  const derivedTaxRate = invoice.igstRate ?? invoice.taxRate ?? 0;
  const derivedSubtotal = invoice.amount || invoiceItems.reduce((s: number, item: any) => {
    return s + ((item.amount || (item.quantity * item.price)) - (item.discount || 0));
  }, 0);
  const derivedTaxAmt = derivedSubtotal * (derivedTaxRate / 100);

  // Use stored values if non-null, otherwise derive from line items
  const taxAmt = invoice.tax != null ? invoice.tax : derivedTaxAmt;

  // Bug 1 fix: when invoice.total === invoice.amount (erroneous storage — total was
  // saved as subtotal only instead of subtotal+tax), recompute from amount + stored tax.
  const storedTotal = invoice.total ?? 0;
  const storedAmount = invoice.amount ?? derivedSubtotal;
  const grandTotal = storedTotal > 0 && storedTotal !== storedAmount
    ? storedTotal               // DB total is correct (genuinely different from subtotal)
    : (storedAmount + taxAmt);  // recompute: total was stored as amount (bug in old records)

  const discount = invoice.discountAmount || invoice.discount || 0;

  const cgstRate =
    invoice.cgstRate != null ? invoice.cgstRate : (taxContext.isDomestic && taxContext.isSameStateSupply ? 9 : 0);
  const sgstRate =
    invoice.sgstRate != null ? invoice.sgstRate : (taxContext.isDomestic && taxContext.isSameStateSupply ? 9 : 0);
  const igstRate =
    invoice.igstRate != null ? invoice.igstRate : (taxContext.isDomestic && !taxContext.isSameStateSupply ? derivedTaxRate : 0);

  // Respect explicit 0 values from DB instead of strictly requiring > 0
  const cgstAmount = invoice.cgst != null ? invoice.cgst : (igstRate > 0 ? 0 : taxAmt / 2);
  const sgstAmount = invoice.sgst != null ? invoice.sgst : (igstRate > 0 ? 0 : taxAmt / 2);
  const igstAmount = invoice.igst != null ? invoice.igst : (igstRate > 0 ? taxAmt : 0);
  const displayInvoiceNumber =
    invoice.status === "PAID"
      ? invoice.invoiceNumber
      : invoice.proformaNumber || invoice.invoiceNumber;

  // Dynamic Invoice URL for QR Code
  const invoiceUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/p/${invoice.id}`
      : `https://stmjournals.com/p/${invoice.id}`;

  return (
    <div className="anv-invoice-template bg-white text-black font-serif p-0 border border-black max-w-[800px] mx-auto overflow-hidden">
      <style jsx>{`
        .anv-invoice-template {
          font-family: "Arial", sans-serif;
          line-height: 1.2;
          font-size: 11px;
          color: #000;
        }
        .border-all {
          border: 1px solid #000;
        }
        .border-b {
          border-bottom: 1px solid #000;
        }
        .border-r {
          border-right: 1px solid #000;
        }
        .header-box {
          padding: 10px;
          display: grid;
          grid-template-columns: 100px 1fr 100px;
          gap: 10px;
          align-items: center;
          border-bottom: 1.5px solid #000;
        }
        .header-center {
          text-align: center;
        }
        .header-center h1 {
          font-size: 20px;
          font-weight: 900;
          margin: 0;
          color: #000;
          letter-spacing: 0.5px;
        }
        .meta-summary {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          border-bottom: 1px solid #000;
        }
        .meta-box {
          padding: 6px;
          font-size: 10px;
        }
        .meta-box label {
          display: block;
          font-weight: 800;
          font-size: 8px;
          text-transform: uppercase;
          color: #333;
          margin-bottom: 2px;
        }

        .billing-section {
          display: grid;
          grid-template-columns: 1fr 120px;
          border-bottom: 1.5px solid #000;
        }
        .bill-to {
          padding: 8px;
        }
        .qr-box {
          padding: 8px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border-left: 1px solid #000;
        }

        .table-main {
          width: 100%;
          border-collapse: collapse;
        }
        .table-main th {
          border-bottom: 1px solid #000;
          border-right: 1px solid #000;
          padding: 4px;
          font-size: 9px;
          font-weight: 800;
          background: #f0f0f0;
          text-align: center;
        }
        .table-main td {
          border-bottom: 0.5px solid #ccc;
          border-right: 1px solid #000;
          padding: 6px 4px;
          vertical-align: top;
        }
        .table-main th:last-child,
        .table-main td:last-child {
          border-right: none;
        }

        .summary-section {
          display: grid;
          grid-template-columns: 1fr 200px;
          border-bottom: 1px solid #000;
        }
        .words-part {
          padding: 8px;
          border-right: 1px solid #000;
          align-self: end;
        }
        .totals-part {
          padding: 8px;
        }
        .row-total {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-bottom: 2px;
        }
        .total-label {
          font-weight: 700;
          width: 100px;
          text-align: right;
        }
        .total-val {
          font-weight: 800;
          width: 80px;
          text-align: right;
        }
        .grand-total {
          border-top: 1px solid #000;
          padding-top: 4px;
          margin-top: 4px;
          font-size: 13px;
          font-weight: 900;
        }

        .tax-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 0px;
          border-bottom: 1px solid #000;
        }
        .tax-table th {
          border-bottom: 1px solid #000;
          border-right: 1px solid #000;
          padding: 4px;
          font-size: 8px;
          font-weight: 800;
          background: #fafafa;
        }
        .tax-table td {
          border-bottom: 1px solid #ccc;
          border-right: 1px solid #000;
          padding: 4px;
          font-size: 9px;
          text-align: right;
        }
        .tax-table th:last-child,
        .tax-table td:last-child {
          border-right: none;
        }

        .terms-sign-section {
          display: grid;
          grid-template-columns: 1.5fr 1fr;
          border-bottom: 1.5px solid #000;
          height: 120px;
        }
        .terms-area {
          padding: 8px;
          border-right: 1px solid #000;
          font-size: 8.5px;
        }
        .sign-area {
          padding: 8px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          text-align: right;
        }

        .footer {
          padding: 10px;
          text-align: center;
          font-size: 9px;
        }
        .footer-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 8px;
          text-align: left;
        }
        .office-box h4 {
          font-size: 8px;
          font-weight: 800;
          color: #666;
          margin: 0 0 2px 0;
        }

        @media print {
          .anv-invoice-template {
            border: 1px solid black !important;
            width: 100% !important;
            margin: 0 !important;
            box-shadow: none !important;
          }
        }
      `}</style>

      <div className="header-box">
        <div className="logo-left">
          {identity.brandLogoUrl && (
            <Image
              src={identity.brandLogoUrl}
              className="max-h-16 w-auto"
              alt="Brand Logo"
              width={160}
              height={64}
              unoptimized
            />
          )}
        </div>
        <div className="header-center">
          <p className="text-[10px] font-bold text-right -mt-2 -mr-2 absolute right-2 top-2 uppercase">
            Subjected to {identity.jurisdiction || "Raipur"} Jurisdiction
          </p>
          <h2 className="text-gray-500 font-bold mb-1 uppercase tracking-widest">
            {invoiceTitle}
          </h2>
          <h1>{identity.name}</h1>
          <p className="text-[10px] font-medium leading-tight max-w-sm mx-auto mt-1">
            {identity.address}
          </p>
        </div>
        <div className="logo-right text-right">
          {identity.companyLogoUrl && (
            <Image
              src={identity.companyLogoUrl}
              className="max-h-16 w-auto"
              alt="Company Logo"
              width={160}
              height={64}
              unoptimized
            />
          )}
        </div>
      </div>

      <div className="meta-summary">
        <div className="meta-box border-r">
          <div className="mb-2">
            <label>{invoiceTitle} Number</label>
            <span className="font-bold text-sm tracking-tight">
              {displayInvoiceNumber}
            </span>
          </div>
          <div>
            <label>{invoiceTitle} Date</label>
            <span className="font-bold">
              <FormattedDate date={invoice.createdAt} />
            </span>
          </div>
        </div>
        <div className="meta-box border-r">
          <label>Bank Details</label>
          <div className="text-[9px] space-y-0.5">
            <p>
              <strong>Holder:</strong> {identity.bankHolder || "—"}
            </p>
            <p>
              <strong>Bank:</strong> {identity.bankName || "—"}
            </p>
            <p>
              <strong>A/C No:</strong>{" "}
              <span className="font-bold">{identity.bankNumber || "—"}</span>
            </p>
            <p>
              <strong>IFSC:</strong> {identity.bankIfsc || "—"}
            </p>
          </div>
        </div>
        <div className="meta-box">
          <div className="grid grid-cols-2 gap-x-2 gap-y-1">
            <div className="col-span-2">
              <label>Legal Name</label>
              <span className="font-bold leading-tight">
                {identity.bankHolder || identity.name}
              </span>
            </div>
            <div>
              <label>GSTIN</label>{" "}
              <span className="font-bold text-[9px]">
                {identity.gstin || "—"}
              </span>
            </div>
            <div>
              <label>PAN No.</label>{" "}
              <span className="font-bold text-[9px]">
                {identity.pan || "—"}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="billing-section">
        <div className="bill-to border-r">
          <h3 className="text-[10px] font-black underline mb-2 tracking-widest uppercase">
            Billed To / Details of Reciever:
          </h3>
          <div className="space-y-1 text-[10px]">
            <p className="text-lg font-black">{customer.name || "—"}</p>
            {customer.organizationName && (
              <p className="font-bold uppercase">{customer.organizationName}</p>
            )}
            <p className="whitespace-pre-line leading-tight">
              {invoice.billingAddress || customer.billingAddress}
            </p>
            <p>
              <strong>Contact:</strong> {customer.primaryPhone || "—"} /{" "}
              {customer.primaryEmail || "—"}
            </p>
            {invoice.gstNumber && (
              <p>
                <strong>GSTIN:</strong> {invoice.gstNumber}
              </p>
            )}
          </div>
        </div>
        <div className="qr-box">
          <span className="text-[7px] font-black mb-1">
            SCAN TO VIEW INVOICE
          </span>
          <div className="p-1 bg-white">
            <QRCodeSVG value={invoiceUrl} size={84} level="M" />
          </div>
          <span className="text-[6px] font-bold mt-1 text-gray-500">
            DIGITAL VERIFIED
          </span>
        </div>
      </div>

      <table className="table-main">
        <thead>
          <tr>
            <th className="w-8">Sr.No</th>
            <th className="text-left">Particulars</th>
            <th className="w-16">HSN/SAC</th>
            <th className="w-10">Qty</th>
            <th className="w-16 text-right">Rate ({currencySymbol})</th>
            <th className="w-20 text-right">Taxable Val ({currencySymbol})</th>
            {!isExport && <th className="w-16 text-right">GST %</th>}
            <th className="w-24 text-right">Net Amt ({currencySymbol})</th>
          </tr>
        </thead>
        <tbody>
          {invoiceItems.map((item, idx) => {
            const taxable =
              (item.amount || item.quantity * item.price) -
              (item.discount || 0);
            // Bug 2 fix: use != null so taxRate=0 (Print Journal) is NOT skipped by falsy || check
            const gstRate =
              item.taxRate != null
                ? item.taxRate
                : (isExport ? 0 : (invoice.taxRate ?? 18));
            const gstDisplay = isExport ? "0%" : `${gstRate}%`;
            const netAmt = taxable + taxable * (gstRate / 100);
            const subscriptionOptions =
              item?.productAttributes?.subscriptionOptions || null;
            const isJournalSubscription =
              item?.productCategory === "JOURNAL_SUBSCRIPTION" ||
              Boolean(subscriptionOptions);
            return (
              <tr key={idx}>
                <td className="text-center">{idx + 1}</td>
                <td className="font-bold tracking-tight">
                  {item.description ||
                    item.journal?.name ||
                    "A&V Publication Item"}
                  {getReservationBadge(item) && (
                    <div className="text-[8px] mt-1 inline-flex rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 font-semibold text-blue-700">
                      {getReservationBadge(item)}
                    </div>
                  )}
                  <div className="text-[8px] font-normal italic text-gray-700">
                    Period: Jan 2025 - Dec 2025
                  </div>
                  {isJournalSubscription && subscriptionOptions && (
                    <div className="text-[8px] mt-1 font-semibold text-blue-700">
                      Frequency:{" "}
                      {String(subscriptionOptions.frequency || "ANNUAL").replaceAll(
                        "_",
                        " ",
                      )}{" "}
                      | Year: {subscriptionOptions.year || "—"}
                      {subscriptionOptions.mode
                        ? ` | Mode: ${String(subscriptionOptions.mode).replaceAll("_", " + ")}`
                        : ""}
                    </div>
                  )}
                </td>
                <td className="text-center">{item.hsnCode || "9984"}</td>
                <td className="text-center">{item.quantity}</td>
                <td className="text-right">
                  {item.price?.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </td>
                <td className="text-right">
                  {taxable.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </td>
                {!isExport && <td className="text-right">{gstDisplay}</td>}
                <td className="text-right font-black">
                  {netAmt.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="summary-section">
        <div className="words-part text-[9px]">
          <strong>Total Amount (in words):</strong>
          <br />
          {numberToWords(grandTotal, invoice.currency)}
        </div>
        <div className="totals-part">
          <div className="row-total">
            <span className="total-label text-[10px]">Taxable Amount:</span>
            <span className="total-val text-[11px] font-bold">
              {derivedSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
          {discount > 0 && (
            <div className="row-total">
              <span className="total-label text-[10px] text-green-700">Discount {invoice.couponCode ? `(${invoice.couponCode})` : ""}:</span>
              <span className="total-val text-[11px] font-bold text-green-700">
                -{discount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}
          {isExport ? (
            <div className="border border-blue-200 bg-blue-50 px-3 py-2 text-[10px] leading-relaxed text-blue-900 rounded">
              <div className="font-bold">Export Invoice / Proforma Invoice</div>
              <div>Non-Indian Customer: GST not applicable.</div>
            </div>
          ) : igstRate > 0 ? (
            <div className="row-total">
              <span className="total-label text-[10px]">IGST ({igstRate}%):</span>
              <span className="total-val text-[11px] font-bold">
                {igstAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          ) : (
            <>
              <div className="row-total">
                <span className="total-label text-[10px]">CGST ({cgstRate}%):</span>
                <span className="total-val text-[11px] font-bold">
                  {cgstAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="row-total">
                <span className="total-label text-[10px]">SGST ({sgstRate}%):</span>
                <span className="total-val text-[11px] font-bold">
                  {sgstAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </>
          )}
          <div className="row-total grand-total">
            <span className="total-label">Grand Total:</span>
            <span className="total-val">
              {currencySymbol}
              {grandTotal.toLocaleString(undefined, {
                minimumFractionDigits: 2,
              })}
            </span>
          </div>
        </div>
      </div>

      {/* Tax Breakdown Table */}
      {!isExport && (
        <div className="p-0">
          <table className="tax-table font-sans">
            <thead>
              <tr>
                <th>Sr.No</th>
                <th style={{ textAlign: "left" }}>HSN/SAC</th>
                <th>Taxable Val</th>
                <th>{`CGST (${cgstRate}%)`}</th>
                <th>{`SGST (${sgstRate}%)`}</th>
                <th>{`IGST (${igstRate}%)`}</th>
                <th>Total Tax</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="text-center">1</td>
                <td style={{ textAlign: "left" }} className="font-bold">
                  9984
                </td>
                <td>
                  {derivedSubtotal.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </td>
                <td>
                  {cgstAmount.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </td>
                <td>
                  {sgstAmount.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </td>
                <td>
                  {igstAmount.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </td>
                <td className="font-bold">
                  {taxAmt.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <div className="terms-sign-section">
        <div className="terms-area">
          <h4 className="font-black underline mb-1">TERMS & CONDITIONS:</h4>
          {isExport && (
            <div className="font-bold text-black mb-2 p-1 border border-black inline-block uppercase text-[9px]">
              SUPPLY MEANT FOR EXPORT UNDER BOND OR LETTER OF UNDERTAKING WITHOUT PAYMENT OF INTEGRATED TAX.
            </div>
          )}
          <ol className="list-decimal list-inside space-y-0.5 opacity-80 leading-snug">
            <li>All subscription amount mentioned is as per year fee.</li>
            <li>Missing numbers will not be supplied after six months.</li>
            <li>Publisher is not responsible for foreign delivery issues.</li>
            <li>{taxContext.customerSegmentLabel}: {taxContext.taxNote}</li>
            <li>{taxContext.isDomestic ? "For India" : "Non Indian Customer"}: {taxContext.gstApplicabilityLabel}</li>
            {taxContext.isDomestic && (
              <li>{taxContext.isSameStateSupply ? "Uttar Pradesh" : "Other State"}: {taxContext.jurisdictionLabel}</li>
            )}
            <li>Subject to Raipur Jurisdiction only.</li>
          </ol>
          <div className="mt-2 text-[9px] font-bold p-1 bg-gray-50 border border-dotted border-black">
            Payment Ref: Subscription payment on account of {customer.name}
          </div>
        </div>
        <div className="sign-area">
          <p className="text-[10px] font-bold">
            For, {identity.name.toUpperCase()}
          </p>
          <div className="sign-placeholder h-12"></div>
          <div>
            <div className="w-full border-b border-black mb-1"></div>
            <p className="text-[8px] font-black text-center">
              AUTHORISED SIGNATORY
            </p>
          </div>
        </div>
      </div>

      <div className="footer">
        <div className="footer-grid">
          <div className="office-box border-r pr-2">
            <h4>REGD. OFFICE:</h4>
            <p className="leading-tight opacity-80">
              {identity.regdOffice || identity.address}
            </p>
          </div>
          <div className="office-box">
            <h4>SALES OFFICE:</h4>
            <p className="leading-tight opacity-80">
              {identity.salesOffice || identity.address}
            </p>
          </div>
        </div>
        <div className="flex justify-between border-t border-black pt-2 px-4 font-bold text-gray-700">
          <span>GSTIN: {identity.gstin}</span>
          <span>PAN: {identity.pan}</span>
          <span>Website: {identity.website}</span>
        </div>
        <div className="mt-4 text-[7px] text-gray-400 font-bold tracking-widest uppercase">
          This computer generated invoice is digitally signed and available
          online
        </div>
      </div>
    </div>
  );
}
