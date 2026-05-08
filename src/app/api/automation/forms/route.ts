import { NextResponse } from "next/server";
import { authorizedRoute } from "@/lib/middleware-auth";
import {
  AUTOMATION_ACTION_CATALOG,
  AUTOMATION_FIELD_CATALOG,
  AUTOMATION_FORM_DEFINITIONS,
  getAutomationFormsConfig,
  normalizeAutomationFormsConfig,
  saveAutomationFormsConfig,
} from "@/lib/automation-forms";

export const GET = authorizedRoute(["SUPER_ADMIN"], async (_req, user) => {
  if (!user.companyId) {
    return NextResponse.json({ error: "Company context missing for this user" }, { status: 400 });
  }

  const config = await getAutomationFormsConfig(user.companyId);
  const forms = AUTOMATION_FORM_DEFINITIONS.map((form) => {
    const actions = config.forms[form.key]?.actions || [];
    return {
      ...form,
      actionCount: actions.length,
      enabledCount: actions.filter((action) => action?.enabled !== false).length,
    };
  });

  return NextResponse.json({
    forms,
    config,
    actionCatalog: AUTOMATION_ACTION_CATALOG,
    fieldCatalog: AUTOMATION_FIELD_CATALOG,
  });
});

export const PUT = authorizedRoute(["SUPER_ADMIN"], async (req, user) => {
  if (!user.companyId) {
    return NextResponse.json({ error: "Company context missing for this user" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const config = normalizeAutomationFormsConfig(body?.config);
  await saveAutomationFormsConfig(user.companyId, config, user.id);
  return NextResponse.json({ success: true, config });
});
