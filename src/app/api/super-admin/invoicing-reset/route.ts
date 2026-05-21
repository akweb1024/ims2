import { NextRequest, NextResponse } from "next/server";
import { ValidationError } from "@/lib/error-handler";
import {
  getInvoicingResetPreview,
  RESET_INVOICING_CONFIRMATION,
  resetAllInvoicingData,
} from "@/lib/invoicing-reset";
import { authorizedRoute } from "@/lib/middleware-auth";

export const GET = authorizedRoute(["SUPER_ADMIN"], async () => {
  const preview = await getInvoicingResetPreview();

  return NextResponse.json({
    confirmationPhrase: RESET_INVOICING_CONFIRMATION,
    preview,
  });
});

export const POST = authorizedRoute(["SUPER_ADMIN"], async (req: NextRequest, user) => {
  const body = await req.json().catch(() => null);
  const confirmation = String(body?.confirmation || "").trim();

  if (confirmation !== RESET_INVOICING_CONFIRMATION) {
    throw new ValidationError(
      `Type "${RESET_INVOICING_CONFIRMATION}" exactly to reset invoicing data.`,
    );
  }

  const reset = await resetAllInvoicingData(user.id);

  return NextResponse.json({
    message: "All invoice and linked finance data has been reset.",
    reset,
  });
});
