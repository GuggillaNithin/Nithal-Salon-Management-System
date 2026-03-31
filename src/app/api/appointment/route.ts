import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const session = await getAuthSession();

    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const date = typeof body.date === "string" ? body.date : "";
    const customerId = typeof body.customerId === "string" ? body.customerId : "";
    const serviceId = typeof body.serviceId === "string" ? body.serviceId : "";
    const tenantId = session.user.tenantId;

    if (!date || !customerId || !serviceId || Number.isNaN(Date.parse(date))) {
      return NextResponse.json(
        { error: "Valid date, customer, and service are required" },
        { status: 400 }
      );
    }

    const customer = await prisma.customer.findFirst({
      where: { id: customerId, tenantId },
    });

    if (!customer) {
      return NextResponse.json({ error: "Invalid customer for this tenant" }, { status: 400 });
    }

    const service = await prisma.service.findFirst({
      where: { id: serviceId, tenantId },
    });

    if (!service) {
      return NextResponse.json({ error: "Invalid service for this tenant" }, { status: 400 });
    }

    const appointment = await prisma.appointment.create({
      data: {
        date: new Date(date),
        tenantId,
        customerId,
        serviceId,
      },
      include: {
        customer: true,
        service: true,
      },
    });

    return NextResponse.json(appointment);
  } catch {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function GET() {
  const session = await getAuthSession();

  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const appointments = await prisma.appointment.findMany({
    where: { tenantId: session.user.tenantId, isDeleted: false },
    include: {
      customer: true,
      service: true,
    },
    orderBy: { date: "desc" },
  });

  return NextResponse.json(appointments);
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
      return NextResponse.json({ error: "Appointment ID is required" }, { status: 400 });
    }

    const appointment = await prisma.appointment.update({
      where: { id, tenantId: session.user.tenantId },
      data: { isDeleted: true },
    });

    return NextResponse.json(appointment);
  } catch {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
