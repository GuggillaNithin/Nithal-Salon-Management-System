import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/api-auth";
import { NextResponse } from "next/server";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthSession();
    const resolvedParams = await params;

    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = session.user.tenantId;
    const body = await req.json();
    const { serviceIds, paymentMethod, discountType, discountValue, staffId } = body;

    // Verify the existing visit thoroughly matches the session tenantId before deleting its children
    const existingVisit = await prisma.visit.findFirst({
      where: {
        id: resolvedParams.id,
        tenantId,
        isDeleted: false,
      },
    });

    if (!existingVisit) {
      return NextResponse.json({ error: "Visit not found or access denied" }, { status: 404 });
    }

    if (!Array.isArray(serviceIds) || serviceIds.length === 0) {
      return NextResponse.json({ error: "At least one service is required for the update" }, { status: 400 });
    }

    if (staffId) {
      const staffExists = await prisma.staff.findFirst({
        where: { id: staffId, tenantId, isDeleted: false },
      });
      if (!staffExists) {
        return NextResponse.json(
          { error: "Invalid staff selection or staff belongs to another tenant" },
          { status: 400 }
        );
      }
    }

    // Get services verifying they belong to this exact tenant
    const services = await prisma.service.findMany({
      where: {
        id: { in: serviceIds },
        tenantId,
        isDeleted: false,
      },
    });

    if (services.length !== serviceIds.length) {
      return NextResponse.json({ error: "One or more invalid services provided" }, { status: 400 });
    }

    const totalAmount = services.reduce((sum, s) => sum + s.price, 0);
    let finalAmount = totalAmount;

    if (discountType === "percentage") {
      const dv = Math.min(Math.max(Number(discountValue) || 0, 0), 100);
      finalAmount = totalAmount - (totalAmount * dv) / 100;
    } else if (discountType === "amount") {
      const dv = Math.min(Math.max(Number(discountValue) || 0, 0), totalAmount);
      finalAmount = totalAmount - dv;
    }
    
    finalAmount = Math.max(finalAmount, 0);

    // Delete old relations securely since we verified existingVisit ownership already
    await prisma.visitService.deleteMany({
      where: { visitId: resolvedParams.id },
    });

    // Update visit with new total and dependencies
    const visit = await prisma.visit.update({
      where: { id: resolvedParams.id },
      data: {
        staffId: staffId || null,
        totalAmount,
        discountType,
        discountValue: Number(discountValue) || 0,
        finalAmount,
        paymentMethod: paymentMethod || "cash",
        services: {
          create: services.map((s) => ({
            serviceId: s.id,
          })),
        },
      },
      include: {
        services: {
          include: {
            service: true,
          },
        },
        customer: true,
      },
    });

    return NextResponse.json(visit);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Update failed" },
      { status: 500 }
    );
  }
}
