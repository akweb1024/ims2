"use client";

import { useState, useEffect, use } from "react";
import GlobalProInvoiceTemplate from "@/components/dashboard/invoices/GlobalProInvoiceTemplate";
import AnvInvoiceTemplate from "@/components/dashboard/invoices/AnvInvoiceTemplate";

// Helper: convert number to words based on currency (replicated from dashboard)
function numberToWords(num: number, currency: string = "INR"): string {
  const ones = [
    "", "ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE", "TEN",
    "ELEVEN", "TWELVE", "THIRTEEN", "FOURTEEN", "FIFTEEN", "SIXTEEN", "SEVENTEEN", "EIGHTEEN", "NINETEEN",
  ];
  const tens = ["", "", "TWENTY", "THIRTY", "FORTY", "FIFTY", "SIXTY", "SEVENTY", "EIGHTY", "NINETY"];

  function convert(n: number, isIndian: boolean): string {
    if (n === 0) return "";
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + ones[n % 10] : "");
    if (isIndian) {
      if (n < 1000) return ones[Math.floor(n / 100)] + " HUNDRED" + (n % 100 !== 0 ? " " + convert(n % 100, isIndian) : "");
      if (n < 100000) return convert(Math.floor(n / 1000), isIndian) + " THOUSAND" + (n % 1000 !== 0 ? " " + convert(n % 1000, isIndian) : "");
      if (n < 10000000) return convert(Math.floor(n / 100000), isIndian) + " LAKH" + (n % 100000 !== 0 ? " " + convert(n % 100000, isIndian) : "");
      return convert(Math.floor(n / 10000000), isIndian) + " CRORE" + (n % 10000000 !== 0 ? " " + convert(n % 10000000, isIndian) : "");
    } else {
      if (n < 1000) return ones[Math.floor(n / 100)] + " HUNDRED" + (n % 100 !== 0 ? " " + convert(n % 100, isIndian) : "");
      if (n < 1000000) return convert(Math.floor(n / 1000), isIndian) + " THOUSAND" + (n % 1000 !== 0 ? " " + convert(n % 1000, isIndian) : "");
      return convert(Math.floor(n / 1000000), isIndian) + " MILLION" + (n % 1000000 !== 0 ? " " + convert(n % 1000000, isIndian) : "");
    }
  }

  const isIndian = currency === "INR";
  const mainUnit = currency === "USD" ? "DOLLARS" : "RUPEES";
  const subUnit = currency === "USD" ? "CENTS" : "PAISE";

  const whole = Math.floor(num);
  const fraction = Math.round((num - whole) * 100);

  let result = convert(whole, isIndian) + " " + mainUnit;
  if (fraction > 0) {
    result += " AND " + convert(fraction, isIndian) + " " + subUnit;
  }
  return result + " ONLY";
}

export default function PublicInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [password, setPassword] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [invoice, setInvoice] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== "12345") {
      setError("Incorrect password. Please try again.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/public/invoices/${id}?password=${password}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to fetch invoice");
      }
      const data = await res.json();
      setInvoice(data);
      setIsUnlocked(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (isUnlocked && invoice) {
    const currencySymbol = invoice.currency === "USD" ? "$" : "₹";
    const isExport = invoice.currency && invoice.currency.toUpperCase() !== "INR";
    const invoiceTitle = invoice.status === "PAID" ? (isExport ? "EXPORT INVOICE" : "TAX INVOICE") : "PROFORMA INVOICE";

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl bg-white shadow-2xl rounded-lg overflow-hidden my-8">
            {invoice.invoiceTemplate === "Anv" ? (
                <AnvInvoiceTemplate
                    invoice={invoice}
                    identity={invoice.company}
                    currencySymbol={currencySymbol}
                    numberToWords={numberToWords}
                    invoiceTitle={invoiceTitle}
                />
            ) : (
                <GlobalProInvoiceTemplate
                    invoice={invoice}
                    identity={invoice.company}
                    currencySymbol={currencySymbol}
                    numberToWords={(n) => numberToWords(n, invoice.currency)}
                    invoiceTitle={invoiceTitle}
                />
            )}
            <div className="p-4 text-center bg-gray-100 print:hidden">
                <button 
                  onClick={() => window.print()}
                  className="bg-primary-600 text-white px-6 py-2 rounded-full font-bold hover:bg-primary-700 transition"
                >
                  Download / Print Invoice
                </button>
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 to-secondary-900 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-xl p-8 rounded-3xl shadow-2xl w-full max-w-md border border-white/20 text-white">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-primary-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-black mb-2 tracking-tight">Protected Invoice</h1>
          <p className="text-primary-100/70 text-sm">Please enter the access password</p>
        </div>

        <form onSubmit={handleUnlock} className="space-y-6">
          <div className="space-y-2">
            <input
              type="password"
              placeholder="Enter Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-400 text-center text-xl font-bold tracking-widest placeholder:text-white/20"
              autoFocus
            />
            {error && <p className="text-red-400 text-xs text-center font-medium">{error}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-primary-500 hover:bg-primary-400 disabled:opacity-50 text-white font-black rounded-2xl shadow-xl shadow-primary-500/20 transition-all active:scale-[0.98]"
          >
            {loading ? "AUTHENTICATING..." : "UNLOCK INVOICE"}
          </button>
        </form>

        <p className="mt-8 text-center text-[10px] uppercase tracking-widest text-primary-200/40 font-bold">
          Secure Cloud Document Strategy
        </p>
      </div>
    </div>
  );
}
