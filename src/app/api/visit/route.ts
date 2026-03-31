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
    const { customerId, serviceIds } = body;

    if (!customerId || !Array.isArray(serviceIds) || serviceIds.length === 0) {
      return NextResponse.json(
        { error: "Customer ID and at least one Service are required" },
        { status: 400 }
      );
    }

    // Verify customer exists and belongs to the tenant
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, tenantId, isDeleted: false },
    });

    if (!customer) {
      return NextResponse.json({ error: "Invalid customer for this tenant" }, { status: 400 });
    }

    // Fetch the services from the database securely and total the price server-side
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

    const visit = await prisma.visit.create({
      data: {
        tenantId,
        customerId,
        totalAmount,
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
      { error: error.message || "Something went wrong" },
      { status: 500 }
    );
  }
}

export async function GET() {
  const session = await getAuthSession();

  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const visits = await prisma.visit.findMany({
    where: { tenantId: session.user.tenantId, isDeleted: false },
    include: {
      customer: true,
      services: {
        include: {
          service: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(visits);
}

export async function DELETE(req: Request) {
  try {
    const session = await getAuthSession();

    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Visit ID is required" }, { status: 400 });
    }

    const visit = await prisma.visit.update({
      where: { id, tenantId: session.user.tenantId },
      data: { isDeleted: true },
    });

    return NextResponse.json(visit);
  } catch {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
