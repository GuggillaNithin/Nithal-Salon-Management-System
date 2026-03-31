import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/api-auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const session = await getAuthSession();

    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = session.user.tenantId;
    const body = await req.json();
    const { name, phone, serviceIds, paymentMethod, discountType, discountValue, staffId } = body;

    if (!phone || !Array.isArray(serviceIds) || serviceIds.length === 0) {
      return NextResponse.json(
        { error: "Phone number and at least one Service are required" },
        { status: 400 }
      );
    }

    // 1. Check if customer exists by phone inside this tenant
    let customer = await prisma.customer.findFirst({
      where: { phone, tenantId, isDeleted: false },
    });

    // 2. If not, create customer securely
    if (!customer) {
      if (!name) {
        return NextResponse.json(
          { error: "Name is required for new customers" },
          { status: 400 }
        );
      }
      customer = await prisma.customer.create({
        data: {
          name,
          phone,
          tenantId,
        },
      });
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

    // 3. Get services reliably confirming they belong to this exact tenant
    const services = await prisma.service.findMany({
      where: {
        id: { in: serviceIds },
        tenantId,
        isDeleted: false,
      },
    });

    if (services.length !== serviceIds.length) {
      return NextResponse.json(
        { error: "One or more invalid services provided" },
        { status: 400 }
      );
    }

    // 4. Calculate total securely
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

    // 5. Build and execute unified transaction
    const visit = await prisma.visit.create({
      data: {
        tenantId,
        customerId: customer.id,
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

    return NextResponse.json({ customer, visit });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Something went wrong" },
      { status: 500 }
    );
  }
}
