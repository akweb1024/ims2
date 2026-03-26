"use client";

import React from "react";
import Image from "next/image";
import { QRCodeSVG } from "qrcode.react";
import FormattedDate from "@/components/common/FormattedDate";
import { buildInvoiceTaxContext } from "@/lib/invoice-tax";

interface GlobalProInvoiceTemplateProps {
  invoice: any;
  identity: any;
  currencySymbol: string;
  numberToWords: (num: number, currency: string) => string;
  invoiceTitle: string;
}

export default function GlobalProInvoiceTemplate({
  invoice,
  identity,
  currencySymbol,
  numberToWords,
  invoiceTitle,
}: GlobalProInvoiceTemplateProps) {
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

  const subtotal = invoice.amount || 0;
  const taxAmt = invoice.tax || 0;
  const grandTotal = invoice.total || 0;
  const discount = invoice.discount || 0;
  const cgstRate =
    invoice.cgstRate ?? (taxContext.isDomestic && taxContext.isSameStateSupply ? 9 : 0);
  const sgstRate =
    invoice.sgstRate ?? (taxContext.isDomestic && taxContext.isSameStateSupply ? 9 : 0);
  const igstRate =
    invoice.igstRate ?? (taxContext.isDomestic && !taxContext.isSameStateSupply ? 18 : 0);
  const cgstAmount =
    invoice.cgst ?? (igstRate > 0 ? 0 : taxAmt > 0 ? taxAmt / 2 : 0);
  const sgstAmount =
    invoice.sgst ?? (igstRate > 0 ? 0 : taxAmt > 0 ? taxAmt / 2 : 0);
  const igstAmount =
    invoice.igst ?? (igstRate > 0 && taxAmt > 0 ? taxAmt : 0);

  const displayInvoiceNumber =
    invoice.status === "PAID"
      ? invoice.invoiceNumber
      : invoice.proformaNumber || invoice.invoiceNumber;

  const invoiceUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/p/${invoice.id}`
      : `https://stmjournals.com/p/${invoice.id}`;

  // Determine accent color based on export/domestic
  const accentColor = isExport ? "#1a56db" : "#0d6efd";
  const accentDark = isExport ? "#1e3a8a" : "#0a3972";
  const badgeColor = isExport ? "#dbeafe" : "#e0f2fe";
  const badgeText = isExport ? "#1a56db" : "#0369a1";

  const statusColorMap: Record<string, { bg: string; text: string; border: string }> = {
    PAID: { bg: "#dcfce7", text: "#15803d", border: "#86efac" },
    UNPAID: { bg: "#fef9c3", text: "#a16207", border: "#fde047" },
    OVERDUE: { bg: "#fee2e2", text: "#dc2626", border: "#fca5a5" },
    PARTIALLY_PAID: { bg: "#fef3c7", text: "#d97706", border: "#fcd34d" },
    CANCELLED: { bg: "#f1f5f9", text: "#64748b", border: "#cbd5e1" },
    VOID: { bg: "#f1f5f9", text: "#64748b", border: "#cbd5e1" },
    DRAFT: { bg: "#f0f9ff", text: "#0369a1", border: "#7dd3fc" },
  };
  const statusStyle = statusColorMap[invoice.status] || statusColorMap["VOID"];

  return (
    <div
      className="globalproinv-root"
      style={{
        fontFamily: "'Segoe UI', Arial, sans-serif",
        fontSize: "11px",
        color: "#1e293b",
        maxWidth: "800px",
        margin: "0 auto",
        background: "#fff",
        border: "1px solid #e2e8f0",
        borderRadius: "3px",
        overflow: "hidden",
        boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
      }}
    >
      <style jsx>{`
        @media print {
          .globalproinv-root {
            box-shadow: none !important;
            border: 1px solid #999 !important;
            border-radius: 0 !important;
          }
        }
      `}</style>

      {/* ═══════════ TOP ACCENT BAND ═══════════ */}
      <div
        style={{
          background: `linear-gradient(135deg, ${accentDark} 0%, ${accentColor} 60%, #2563eb 100%)`,
          padding: "14px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "relative",
        }}
      >
        {/* Left: Logos */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {identity.brandLogoUrl && (
            <Image
              src={identity.brandLogoUrl}
              style={{
                maxHeight: "52px",
                maxWidth: "110px",
                objectFit: "contain",
                background: "#fff",
                borderRadius: "4px",
                padding: "4px",
              }}
              alt="Brand"
              width={110}
              height={52}
              unoptimized
            />
          )}
          {identity.companyLogoUrl && identity.brandLogoUrl && (
            <div
              style={{
                width: "1px",
                height: "40px",
                background: "rgba(255,255,255,0.3)",
              }}
            />
          )}
          {identity.companyLogoUrl && (
            <Image
              src={identity.companyLogoUrl}
              style={{
                maxHeight: "52px",
                maxWidth: "110px",
                objectFit: "contain",
                background: "#fff",
                borderRadius: "4px",
                padding: "4px",
                opacity: 0.9,
              }}
              alt="Company"
              width={110}
              height={52}
              unoptimized
            />
          )}
        </div>

        {/* Center: Org Name */}
        <div style={{ textAlign: "center", flex: 1, padding: "0 16px" }}>
          <div
            style={{
              color: "#fff",
              fontSize: "20px",
              fontWeight: 900,
              letterSpacing: "1px",
              lineHeight: 1.1,
              textTransform: "uppercase",
            }}
          >
            {identity.name}
          </div>
          {identity.tagline && (
            <div
              style={{
                color: "rgba(255,255,255,0.75)",
                fontSize: "9px",
                marginTop: "3px",
                fontStyle: "italic",
                letterSpacing: "0.5px",
              }}
            >
              {identity.tagline}
            </div>
          )}
          <div
            style={{
              color: "rgba(255,255,255,0.85)",
              fontSize: "9px",
              marginTop: "4px",
              lineHeight: 1.4,
            }}
          >
            {identity.address}
          </div>
        </div>

        {/* Right: Invoice Type Badge + Status */}
        <div style={{ textAlign: "right", minWidth: "120px" }}>
          <div
            style={{
              background: "rgba(255,255,255,0.15)",
              border: "1px solid rgba(255,255,255,0.4)",
              borderRadius: "4px",
              padding: "5px 10px",
              color: "#fff",
              fontSize: "11px",
              fontWeight: 900,
              letterSpacing: "2px",
              textTransform: "uppercase",
              marginBottom: "6px",
            }}
          >
            {invoiceTitle}
          </div>
          {invoice.status !== "UNPAID" && (
            <div
              style={{
                background: statusStyle.bg,
                color: statusStyle.text,
                border: `1px solid ${statusStyle.border}`,
                borderRadius: "12px",
                padding: "2px 10px",
                fontSize: "9px",
                fontWeight: 800,
                letterSpacing: "1px",
                textTransform: "uppercase",
                display: "inline-block",
              }}
            >
              {invoice.status?.replace(/_/g, " ")}
            </div>
          )}
        </div>
      </div>

      {/* ═══════════ INVOICE META ROW ═══════════ */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          borderBottom: "1.5px solid #e2e8f0",
          background: "#f8fafc",
        }}
      >
        {/* Invoice Number & Date */}
        <div
          style={{
            padding: "12px 14px",
            borderRight: "1px solid #e2e8f0",
          }}
        >
          <div
            style={{
              fontSize: "8px",
              fontWeight: 800,
              color: "#94a3b8",
              textTransform: "uppercase",
              letterSpacing: "1px",
              marginBottom: "4px",
            }}
          >
            {invoiceTitle} No.
          </div>
          <div
            style={{
              fontSize: "15px",
              fontWeight: 900,
              color: accentColor,
              fontFamily: "monospace",
              letterSpacing: "-0.5px",
            }}
          >
            {displayInvoiceNumber}
          </div>
          <div style={{ marginTop: "8px" }}>
            <span
              style={{
                fontSize: "8px",
                fontWeight: 800,
                color: "#94a3b8",
                textTransform: "uppercase",
                letterSpacing: "1px",
                display: "block",
                marginBottom: "2px",
              }}
            >
              Date
            </span>
            <span style={{ fontWeight: 700, fontSize: "11px" }}>
              <FormattedDate date={invoice.createdAt} />
            </span>
          </div>
          {invoice.dueDate && (
            <div style={{ marginTop: "6px" }}>
              <span
                style={{
                  fontSize: "8px",
                  fontWeight: 800,
                  color: "#94a3b8",
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                  display: "block",
                  marginBottom: "2px",
                }}
              >
                Due / Valid Until
              </span>
              <span style={{ fontWeight: 700, fontSize: "11px", color: "#dc2626" }}>
                <FormattedDate date={invoice.dueDate} />
              </span>
            </div>
          )}
        </div>

        {/* Bank Details */}
        <div
          style={{
            padding: "12px 14px",
            borderRight: "1px solid #e2e8f0",
          }}
        >
          <div
            style={{
              fontSize: "8px",
              fontWeight: 800,
              color: "#94a3b8",
              textTransform: "uppercase",
              letterSpacing: "1px",
              marginBottom: "6px",
            }}
          >
            Payment / Bank Details
          </div>
          <div style={{ fontSize: "9.5px", lineHeight: 1.7 }}>
            <div>
              <span style={{ fontWeight: 700, color: "#475569" }}>Beneficiary: </span>
              {identity.bankHolder || "—"}
            </div>
            <div>
              <span style={{ fontWeight: 700, color: "#475569" }}>Bank: </span>
              {identity.bankName || "—"}
            </div>
            <div>
              <span style={{ fontWeight: 700, color: "#475569" }}>A/C No.: </span>
              <strong>{identity.bankNumber || "—"}</strong>
            </div>
            <div>
              <span style={{ fontWeight: 700, color: "#475569" }}>IFSC: </span>
              <strong>{identity.bankIfsc || "—"}</strong>
            </div>
            {identity.bankSwift && (
              <div>
                <span style={{ fontWeight: 700, color: "#475569" }}>SWIFT: </span>
                <strong>{identity.bankSwift}</strong>
              </div>
            )}
          </div>
        </div>

        {/* Org Tax Details */}
        <div style={{ padding: "12px 14px" }}>
          <div
            style={{
              fontSize: "8px",
              fontWeight: 800,
              color: "#94a3b8",
              textTransform: "uppercase",
              letterSpacing: "1px",
              marginBottom: "6px",
            }}
          >
            Organisation Details
          </div>
          <div style={{ fontSize: "9.5px", lineHeight: 1.7 }}>
            <div>
              <span style={{ fontWeight: 700, color: "#475569" }}>Reg. Name: </span>
              <strong>{identity.bankHolder || identity.name}</strong>
            </div>
            {identity.gstin && (
              <div>
                <span style={{ fontWeight: 700, color: "#475569" }}>GSTIN: </span>
                <strong>{identity.gstin}</strong>
              </div>
            )}
            {identity.pan && (
              <div>
                <span style={{ fontWeight: 700, color: "#475569" }}>PAN: </span>
                <strong>{identity.pan}</strong>
              </div>
            )}
            {identity.cin && (
              <div>
                <span style={{ fontWeight: 700, color: "#475569" }}>CIN: </span>
                {identity.cin}
              </div>
            )}
            {identity.iec && (
              <div>
                <span style={{ fontWeight: 700, color: "#475569" }}>IEC: </span>
                {identity.iec}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══════════ BILLING ROW ═══════════ */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 140px",
          borderBottom: "1.5px solid #e2e8f0",
        }}
      >
        {/* Billed To */}
        <div style={{ padding: "14px 16px", borderRight: "1px solid #e2e8f0" }}>
          <div
            style={{
              fontSize: "8px",
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "1.5px",
              color: accentColor,
              marginBottom: "6px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span
              style={{
                display: "inline-block",
                width: "16px",
                height: "2px",
                background: accentColor,
                borderRadius: "2px",
              }}
            />
            Billed To / Details of Receiver
          </div>
          <div style={{ fontSize: "16px", fontWeight: 900, color: "#0f172a", marginBottom: "3px" }}>
            {customer.name || "—"}
          </div>
          {customer.organizationName && (
            <div
              style={{
                fontSize: "10px",
                fontWeight: 700,
                textTransform: "uppercase",
                color: "#334155",
                letterSpacing: "0.5px",
                marginBottom: "4px",
              }}
            >
              {customer.organizationName}
            </div>
          )}
          <div
            style={{
              fontSize: "9.5px",
              color: "#64748b",
              lineHeight: 1.6,
              whiteSpace: "pre-line",
              marginBottom: "4px",
            }}
          >
            {invoice.billingAddress || customer.billingAddress}
          </div>
          <div style={{ fontSize: "9.5px", color: "#475569" }}>
            {customer.primaryPhone && (
              <span>📞 {customer.primaryPhone} &nbsp;&nbsp;</span>
            )}
            {customer.primaryEmail && (
              <span>✉ {customer.primaryEmail}</span>
            )}
          </div>
          {invoice.gstNumber && (
            <div
              style={{
                marginTop: "6px",
                background: badgeColor,
                color: badgeText,
                border: `1px solid ${accentColor}22`,
                borderRadius: "4px",
                padding: "3px 8px",
                fontSize: "9px",
                fontWeight: 700,
                display: "inline-block",
              }}
            >
              GSTIN: {invoice.gstNumber}
            </div>
          )}
          {isExport && (
            <div
              style={{
                marginTop: "6px",
                background: "#dbeafe",
                color: "#1a56db",
                border: "1px solid #93c5fd",
                borderRadius: "4px",
                padding: "3px 8px",
                fontSize: "8px",
                fontWeight: 800,
                display: "inline-block",
                letterSpacing: "1px",
                textTransform: "uppercase",
              }}
            >
              🌐 Export Invoice — {invoiceCountry}
            </div>
          )}
        </div>

        {/* QR Code */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "14px 10px",
            background: "#f8fafc",
            gap: "6px",
          }}
        >
          <div
            style={{
              fontSize: "7px",
              fontWeight: 800,
              color: "#94a3b8",
              letterSpacing: "0.8px",
              textTransform: "uppercase",
            }}
          >
            Scan to Verify
          </div>
          <div
            style={{
              background: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: "6px",
              padding: "5px",
            }}
          >
            <QRCodeSVG
              value={invoiceUrl}
              size={88}
              level="M"
              fgColor={accentDark}
            />
          </div>
          <div
            style={{
              fontSize: "6.5px",
              fontWeight: 700,
              color: "#94a3b8",
              textAlign: "center",
              letterSpacing: "0.5px",
            }}
          >
            Digital Verified Invoice
          </div>
        </div>
      </div>

      {/* ═══════════ LINE ITEMS TABLE ═══════════ */}
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          borderBottom: "1.5px solid #e2e8f0",
        }}
      >
        <thead>
          <tr
            style={{
              background: `linear-gradient(90deg, ${accentDark}18, ${accentColor}10)`,
              borderBottom: `2px solid ${accentColor}40`,
            }}
          >
            <th
              style={{
                padding: "8px 6px",
                fontSize: "8px",
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                color: accentDark,
                textAlign: "center",
                borderRight: "1px solid #e2e8f0",
                width: "32px",
              }}
            >
              S.No.
            </th>
            <th
              style={{
                padding: "8px 10px",
                fontSize: "8px",
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                color: accentDark,
                textAlign: "left",
                borderRight: "1px solid #e2e8f0",
              }}
            >
              Description / Particulars
            </th>
            <th
              style={{
                padding: "8px 6px",
                fontSize: "8px",
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                color: accentDark,
                textAlign: "center",
                borderRight: "1px solid #e2e8f0",
                width: "60px",
              }}
            >
              HSN/SAC
            </th>
            <th
              style={{
                padding: "8px 6px",
                fontSize: "8px",
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                color: accentDark,
                textAlign: "center",
                borderRight: "1px solid #e2e8f0",
                width: "36px",
              }}
            >
              Qty
            </th>
            <th
              style={{
                padding: "8px 6px",
                fontSize: "8px",
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                color: accentDark,
                textAlign: "right",
                borderRight: "1px solid #e2e8f0",
                width: "72px",
              }}
            >
              Rate ({currencySymbol})
            </th>
            <th
              style={{
                padding: "8px 6px",
                fontSize: "8px",
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                color: accentDark,
                textAlign: "right",
                borderRight: "1px solid #e2e8f0",
                width: "76px",
              }}
            >
              Taxable ({currencySymbol})
            </th>
            <th
              style={{
                padding: "8px 6px",
                fontSize: "8px",
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                color: accentDark,
                textAlign: "right",
                borderRight: "1px solid #e2e8f0",
                width: "48px",
              }}
            >
              GST %
            </th>
            <th
              style={{
                padding: "8px 6px",
                fontSize: "8px",
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                color: accentDark,
                textAlign: "right",
                width: "80px",
              }}
            >
              Net Amt ({currencySymbol})
            </th>
          </tr>
        </thead>
        <tbody>
          {invoiceItems.map((item, idx) => {
            const taxable =
              (item.amount || item.quantity * item.price) - (item.discount || 0);
            const gstRate =
              item.taxRate || (isExport ? 0 : invoice.taxRate || 18);
            const gstDisplay = isExport ? "0%" : `${gstRate}%`;
            const netAmt = taxable + taxable * (gstRate / 100);
            const isAlt = idx % 2 === 1;
            return (
              <tr
                key={idx}
                style={{
                  background: isAlt ? "#f8fafc" : "#ffffff",
                  borderBottom: "1px solid #f1f5f9",
                }}
              >
                <td
                  style={{
                    padding: "8px 6px",
                    textAlign: "center",
                    color: "#94a3b8",
                    fontWeight: 700,
                    borderRight: "1px solid #e2e8f0",
                    fontSize: "10px",
                  }}
                >
                  {idx + 1}
                </td>
                <td
                  style={{
                    padding: "8px 10px",
                    borderRight: "1px solid #e2e8f0",
                    verticalAlign: "top",
                  }}
                >
                  <div style={{ fontWeight: 700, color: "#1e293b", fontSize: "10px" }}>
                    {item.description || item.journal?.name || "Service / Product"}
                  </div>
                  {getReservationBadge(item) && (
                    <div
                      style={{
                        display: "inline-block",
                        marginTop: "4px",
                        background: "#eff6ff",
                        border: "1px solid #bfdbfe",
                        color: "#1d4ed8",
                        borderRadius: "999px",
                        padding: "1px 6px",
                        fontSize: "8px",
                        fontWeight: 700,
                      }}
                    >
                      {getReservationBadge(item)}
                    </div>
                  )}
                  {item.period && (
                    <div style={{ fontSize: "8px", color: "#94a3b8", marginTop: "2px", fontStyle: "italic" }}>
                      Period: {item.period}
                    </div>
                  )}
                </td>
                <td
                  style={{
                    padding: "8px 6px",
                    textAlign: "center",
                    color: "#475569",
                    fontWeight: 600,
                    borderRight: "1px solid #e2e8f0",
                    fontSize: "10px",
                  }}
                >
                  {item.hsnCode || "9984"}
                </td>
                <td
                  style={{
                    padding: "8px 6px",
                    textAlign: "center",
                    fontWeight: 700,
                    borderRight: "1px solid #e2e8f0",
                    fontSize: "10px",
                  }}
                >
                  {item.quantity}
                </td>
                <td
                  style={{
                    padding: "8px 6px",
                    textAlign: "right",
                    fontWeight: 600,
                    borderRight: "1px solid #e2e8f0",
                    fontSize: "10px",
                  }}
                >
                  {item.price?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
                <td
                  style={{
                    padding: "8px 6px",
                    textAlign: "right",
                    fontWeight: 600,
                    borderRight: "1px solid #e2e8f0",
                    fontSize: "10px",
                  }}
                >
                  {taxable.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
                <td
                  style={{
                    padding: "8px 6px",
                    textAlign: "right",
                    borderRight: "1px solid #e2e8f0",
                    fontSize: "10px",
                  }}
                >
                  <span
                    style={{
                      background: isExport ? "#f0fdf4" : `${accentColor}15`,
                      color: isExport ? "#15803d" : accentColor,
                      borderRadius: "3px",
                      padding: "1px 5px",
                      fontWeight: 700,
                      fontSize: "9px",
                    }}
                  >
                    {gstDisplay}
                  </span>
                </td>
                <td
                  style={{
                    padding: "8px 6px",
                    textAlign: "right",
                    fontWeight: 900,
                    color: "#0f172a",
                    fontSize: "11px",
                  }}
                >
                  {netAmt.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* ═══════════ SUMMARY SECTION ═══════════ */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 220px",
          borderBottom: "1.5px solid #e2e8f0",
        }}
      >
        {/* Amount in Words */}
        <div
          style={{
            padding: "14px 16px",
            borderRight: "1px solid #e2e8f0",
            alignSelf: "end",
          }}
        >
          <div
            style={{
              fontSize: "8px",
              fontWeight: 800,
              color: "#94a3b8",
              textTransform: "uppercase",
              letterSpacing: "1px",
              marginBottom: "5px",
            }}
          >
            Total Amount in Words
          </div>
          <div
            style={{
              fontWeight: 700,
              fontSize: "10px",
              color: "#1e293b",
              background: "#f8fafc",
              border: "1px dashed #cbd5e1",
              borderRadius: "4px",
              padding: "6px 10px",
              lineHeight: 1.5,
            }}
          >
            {numberToWords(grandTotal, invoice.currency)}
          </div>
        </div>

        {/* Totals */}
        <div style={{ padding: "14px 16px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "5px",
              fontSize: "10px",
            }}
          >
            <span style={{ color: "#64748b", fontWeight: 600 }}>Taxable Amount:</span>
            <span style={{ fontWeight: 700 }}>
              {currencySymbol}
              {subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
          {discount > 0 && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "5px",
                fontSize: "10px",
              }}
            >
              <span style={{ color: "#64748b", fontWeight: 600 }}>Discount:</span>
              <span style={{ fontWeight: 700, color: "#16a34a" }}>
                − {currencySymbol}
                {discount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}
          {isExport ? (
            <div
              style={{
                marginBottom: "6px",
                padding: "8px 10px",
                borderRadius: "8px",
                background: "#eff6ff",
                border: "1px solid #bfdbfe",
                fontSize: "10px",
                color: "#1e3a8a",
                lineHeight: 1.5,
              }}
            >
              <div style={{ fontWeight: 700 }}>
                Export Invoice / Proforma Invoice
              </div>
              <div>Non-Indian Customer: GST not applicable.</div>
            </div>
          ) : igstRate > 0 ? (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "5px",
                fontSize: "10px",
              }}
            >
              <span style={{ color: "#64748b", fontWeight: 600 }}>
                IGST ({igstRate}%):
              </span>
              <span style={{ fontWeight: 700 }}>
                {currencySymbol}
                {igstAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          ) : (
            <>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "5px",
                  fontSize: "10px",
                }}
              >
                <span style={{ color: "#64748b", fontWeight: 600 }}>
                  CGST ({cgstRate}%):
                </span>
                <span style={{ fontWeight: 700 }}>
                  {currencySymbol}
                  {cgstAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "5px",
                  fontSize: "10px",
                }}
              >
                <span style={{ color: "#64748b", fontWeight: 600 }}>
                  SGST ({sgstRate}%):
                </span>
                <span style={{ fontWeight: 700 }}>
                  {currencySymbol}
                  {sgstAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </>
          )}
          <div
            style={{
              borderTop: `2px solid ${accentColor}`,
              paddingTop: "8px",
              marginTop: "6px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontWeight: 800,
                fontSize: "13px",
                color: "#0f172a",
              }}
            >
              Grand Total:
            </span>
            <span
              style={{
                fontWeight: 900,
                fontSize: "18px",
                color: accentColor,
                fontFamily: "monospace",
              }}
            >
              {currencySymbol}
              {grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* ═══════════ TAX BREAKDOWN TABLE (Indian / Domestic only) ═══════════ */}
      {!isExport && (
        <div style={{ borderBottom: "1px solid #e2e8f0" }}>
          <div
            style={{
              background: "#f8fafc",
              padding: "5px 14px",
              fontSize: "8px",
              fontWeight: 800,
              color: "#64748b",
              letterSpacing: "1.5px",
              textTransform: "uppercase",
              borderBottom: "1px solid #e2e8f0",
            }}
          >
            GST Tax Breakdown Summary
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f1f5f9" }}>
                {[
                  "Sr.",
                  "HSN/SAC",
                  "Taxable Value",
                  `CGST (${cgstRate}%)`,
                  `SGST (${sgstRate}%)`,
                  `IGST (${igstRate}%)`,
                  "Total Tax",
                ].map(
                  (h, i) => (
                    <th
                      key={i}
                      style={{
                        padding: "5px 8px",
                        fontSize: "8px",
                        fontWeight: 800,
                        color: "#475569",
                        textTransform: "uppercase",
                        borderRight: i < 6 ? "1px solid #e2e8f0" : "none",
                        textAlign: i > 1 ? "right" : i === 1 ? "left" : "center",
                      }}
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: "5px 8px", textAlign: "center", fontSize: "9px", borderRight: "1px solid #e2e8f0" }}>1</td>
                <td style={{ padding: "5px 8px", fontWeight: 700, fontSize: "9px", borderRight: "1px solid #e2e8f0" }}>9984</td>
                <td style={{ padding: "5px 8px", textAlign: "right", fontSize: "9px", borderRight: "1px solid #e2e8f0" }}>
                  {subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
                <td style={{ padding: "5px 8px", textAlign: "right", fontSize: "9px", borderRight: "1px solid #e2e8f0" }}>
                  {cgstAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
                <td style={{ padding: "5px 8px", textAlign: "right", fontSize: "9px", borderRight: "1px solid #e2e8f0" }}>
                  {sgstAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
                <td style={{ padding: "5px 8px", textAlign: "right", fontSize: "9px", borderRight: "1px solid #e2e8f0" }}>
                  {igstAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
                <td style={{ padding: "5px 8px", textAlign: "right", fontSize: "9px", fontWeight: 800 }}>
                  {taxAmt.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* ═══════════ TERMS + SIGNATURE ═══════════ */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.5fr 1fr",
          borderBottom: "1.5px solid #e2e8f0",
          minHeight: "110px",
        }}
      >
        {/* Terms */}
        <div
          style={{
            padding: "12px 16px",
            borderRight: "1px solid #e2e8f0",
          }}
        >
          <div
            style={{
              fontSize: "8px",
              fontWeight: 800,
              color: accentColor,
              textTransform: "uppercase",
              letterSpacing: "1.5px",
              marginBottom: "6px",
            }}
          >
            Terms &amp; Conditions
          </div>
          <ol
            style={{
              margin: 0,
              padding: "0 0 0 14px",
              fontSize: "8.5px",
              color: "#475569",
              lineHeight: 1.7,
            }}
          >
            {identity.terms ? (
              <li>{identity.terms}</li>
            ) : (
              <>
                <li>Payment is due within the period specified above.</li>
                <li>All prices are in {invoice.currency || "INR"} unless stated otherwise.</li>
                <li>{taxContext.customerSegmentLabel}: {taxContext.taxNote}</li>
                <li>{taxContext.isDomestic ? "For India" : "Non Indian Customer"}: {taxContext.gstApplicabilityLabel}</li>
                {taxContext.isDomestic && (
                  <li>{taxContext.isSameStateSupply ? "Uttar Pradesh" : "Other State"}: {taxContext.jurisdictionLabel}</li>
                )}
                <li>
                  {isExport
                    ? "This is an export invoice — zero-rated supply under GST (IGST Act)."
                    : "Subject to local jurisdiction only."}
                </li>
                <li>Please quote the invoice number in all correspondence.</li>
              </>
            )}
          </ol>
          <div
            style={{
              marginTop: "8px",
              fontSize: "8.5px",
              background: "#eff6ff",
              border: "1px dashed #93c5fd",
              borderRadius: "4px",
              padding: "4px 8px",
              color: "#1e40af",
              fontWeight: 600,
            }}
          >
            📌 Payment Ref: {invoice.description || `Payment for services rendered to ${customer.name || "client"}`}
            <br />
            {taxContext.customerSegmentLabel}: {taxContext.taxNote}
          </div>
        </div>

        {/* Signature */}
        <div
          style={{
            padding: "12px 16px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            textAlign: "right",
          }}
        >
          <div
            style={{
              fontSize: "9px",
              fontWeight: 800,
              color: "#475569",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            For, {identity.name?.toUpperCase()}
          </div>
          <div style={{ flex: 1 }} />
          <div>
            <div
              style={{
                borderTop: `2px solid ${accentColor}`,
                paddingTop: "6px",
                marginTop: "8px",
              }}
            >
              <div
                style={{
                  fontSize: "8px",
                  fontWeight: 900,
                  color: accentDark,
                  textTransform: "uppercase",
                  letterSpacing: "1.5px",
                  textAlign: "center",
                }}
              >
                Authorised Signatory
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════ FOOTER ═══════════ */}
      <div
        style={{
          padding: "12px 20px",
          background: "#f8fafc",
        }}
      >
        {/* Office addresses */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "20px",
            marginBottom: "10px",
          }}
        >
          {(identity.regdOffice || identity.address) && (
            <div>
              <div
                style={{
                  fontSize: "7.5px",
                  fontWeight: 800,
                  textTransform: "uppercase",
                  color: "#94a3b8",
                  letterSpacing: "1px",
                  marginBottom: "3px",
                }}
              >
                Registered Office
              </div>
              <div style={{ fontSize: "9px", color: "#475569", lineHeight: 1.5 }}>
                {identity.regdOffice || identity.address}
              </div>
            </div>
          )}
          {(identity.salesOffice || identity.address) && (
            <div>
              <div
                style={{
                  fontSize: "7.5px",
                  fontWeight: 800,
                  textTransform: "uppercase",
                  color: "#94a3b8",
                  letterSpacing: "1px",
                  marginBottom: "3px",
                }}
              >
                Sales Office
              </div>
              <div style={{ fontSize: "9px", color: "#475569", lineHeight: 1.5 }}>
                {identity.salesOffice || identity.address}
              </div>
            </div>
          )}
        </div>

        {/* Bottom info bar */}
        <div
          style={{
            borderTop: `2px solid ${accentColor}`,
            paddingTop: "8px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "6px",
          }}
        >
          {identity.gstin && (
            <span style={{ fontSize: "9px", fontWeight: 700, color: "#475569" }}>
              GSTIN: <strong>{identity.gstin}</strong>
            </span>
          )}
          {identity.pan && (
            <span style={{ fontSize: "9px", fontWeight: 700, color: "#475569" }}>
              PAN: <strong>{identity.pan}</strong>
            </span>
          )}
          {identity.website && (
            <span style={{ fontSize: "9px", fontWeight: 700, color: accentColor }}>
              🌐 {identity.website}
            </span>
          )}
          {identity.email && (
            <span style={{ fontSize: "9px", fontWeight: 700, color: "#475569" }}>
              ✉ {identity.email}
            </span>
          )}
        </div>

        {/* Tiny print */}
        <div
          style={{
            marginTop: "8px",
            textAlign: "center",
            fontSize: "7px",
            color: "#cbd5e1",
            fontWeight: 700,
            letterSpacing: "1.5px",
            textTransform: "uppercase",
          }}
        >
          This is a computer-generated invoice. Digitally signed and verifiable online.
          {isExport && (
            <span style={{ marginLeft: "8px", color: "#93c5fd" }}>
              [EXPORT INVOICE — ZERO RATED SUPPLY]
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
