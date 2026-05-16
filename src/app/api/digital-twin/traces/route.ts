import { NextRequest, NextResponse } from "next/server";
import { authorizedRoute } from "@/lib/middleware-auth";
import { handleApiError } from "@/lib/error-handler";
import { logger } from "@/lib/logger";
import { buildTwinTrace } from "@/lib/digital-twin/trace-engine";
import { resolveCompanyScope } from "@/lib/access-policy";

export const GET = authorizedRoute(
  ["SUPER_ADMIN", "ADMIN", "MANAGER", "EXECUTIVE", "FINANCE_ADMIN"],
  async (req: NextRequest, user) => {
    const startTime = Date.now();
    try {
      const companyId = await resolveCompanyScope(req, user);
      if (!companyId) {
        return NextResponse.json(
          { error: "Select a specific company for Digital Twin traces" },
          { status: 400 },
        );
      }

      const { searchParams } = new URL(req.url);
      const days = Number(searchParams.get("days") || 14);
      const limit = Number(searchParams.get("limit") || 120);

      const traces = await buildTwinTrace(companyId, { days, limit });

      logger.apiRequest("GET", req.nextUrl.pathname, 200, Date.now() - startTime, {
        companyId,
        days,
        limit,
        activityCount: traces.activities.length,
        behaviorCount: traces.behaviors.length,
      });

      return NextResponse.json(traces);
    } catch (error) {
      logger.error("Digital Twin Trace API failed", error, {
        path: req.nextUrl.pathname,
        userId: user.id,
      });
      return handleApiError(error, req.nextUrl.pathname);
    }
  },
);
