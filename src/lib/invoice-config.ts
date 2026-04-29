type InvoiceConfigLike = {
  legalEntityName?: string | null;
  gstin?: string | null;
  stateCode?: string | null;
  bankName?: string | null;
  bankAccountNumber?: string | null;
  bankIfscCode?: string | null;
  invoicePrefix?: string | null;
  proformaPrefix?: string | null;
  invoiceNextNumber?: number | null;
  proformaNextNumber?: number | null;
};

const isBlank = (value?: string | null) => !value || !String(value).trim();

export function validateInvoiceConfig(entity: InvoiceConfigLike) {
  const missing: string[] = [];

  if (isBlank(entity.legalEntityName)) missing.push("legalEntityName");
  if (isBlank(entity.gstin)) missing.push("gstin");
  if (isBlank(entity.stateCode)) missing.push("stateCode");
  if (isBlank(entity.bankName)) missing.push("bankName");
  if (isBlank(entity.bankAccountNumber)) missing.push("bankAccountNumber");
  if (isBlank(entity.bankIfscCode)) missing.push("bankIfscCode");

  const invoiceNext = Number(entity.invoiceNextNumber ?? 0);
  const proformaNext = Number(entity.proformaNextNumber ?? 0);
  if (!Number.isFinite(invoiceNext) || invoiceNext < 1) missing.push("invoiceNextNumber>=1");
  if (!Number.isFinite(proformaNext) || proformaNext < 1) missing.push("proformaNextNumber>=1");
  if (isBlank(entity.invoicePrefix)) missing.push("invoicePrefix");
  if (isBlank(entity.proformaPrefix)) missing.push("proformaPrefix");

  return {
    valid: missing.length === 0,
    missing,
  };
}

