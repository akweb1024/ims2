import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth-legacy";
import { buildTrackingMetadata } from "@/lib/dispatch";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const customer = await prisma.customerProfile.findUnique({
      where: { id },
      select: { id: true, companyId: true, assignedToUserId: true },
    });

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    if (
      user.role !== "SUPER_ADMIN" &&
      customer.companyId &&
      user.companyId !== customer.companyId
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const dispatches = await prisma.dispatchOrder.findMany({
      where: { customerProfileId: id },
      include: {
        courier: true,
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            proformaNumber: true,
            status: true,
            total: true,
            currency: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(
      dispatches.map((dispatch) => ({
        ...dispatch,
        tracking: buildTrackingMetadata(dispatch),
      })),
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
