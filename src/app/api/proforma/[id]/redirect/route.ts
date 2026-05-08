import { NextRequest, NextResponse } from "next/server";
import { authorizedRoute } from "@/lib/middleware-auth";
import { loadProformaAutomationPayload, resolveDocumentRedirect } from "@/lib/document-automation";

export const GET = authorizedRoute(
  ["SUPER_ADMIN", "ADMIN", "MANAGER", "FINANCE_ADMIN", "EXECUTIVE", "CUSTOMER"],
  async (req: NextRequest, user, { params }) => {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const eventType = searchParams.get("eventType") === "update" ? "update" : "create";
    const changedFields = (searchParams.get("changedFields") || "")
      .split(",")
      .map((field) => field.trim())
      .filter(Boolean);

    const payload = await loadProformaAutomationPayload(id);
    if (!payload) {
      return NextResponse.json({ error: "Proforma not found" }, { status: 404 });
    }
    if (user.role === "CUSTOMER" && payload.customer?.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const redirect = await resolveDocumentRedirect({
      entityType: "proforma",
      eventType,
      changedFields,
      payload,
    });

    return NextResponse.json({
      hasRedirect: !!redirect,
      redirect,
    });
  },
);
