import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const session = await getAuthSession();

    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden: Admins only" }, { status: 403 });
    }

    const body = await req.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const price = Number(body.price);
    const categoryId = typeof body.categoryId === "string" && body.categoryId.trim() !== "" ? body.categoryId : null;

    if (!name || Number.isNaN(price) || price < 0) {
      return NextResponse.json({ error: "Valid name and price are required" }, { status: 400 });
    }

    const existing = await prisma.service.findFirst({
      where: {
        tenantId: session.user.tenantId,
        name: { equals: name, mode: "insensitive" },
        isDeleted: false,
      }
    });

    if (existing) {
      return NextResponse.json({ error: `A service named "${name}" already exists.` }, { status: 400 });
    }

    const service = await prisma.service.create({
      data: {
        name,
        price,
        categoryId,
        tenantId: session.user.tenantId,
      },
    });

    return NextResponse.json(service);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Something went wrong" }, { status: 500 });
  }
}

export async function GET() {
  const session = await getAuthSession();

  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const services = await prisma.service.findMany({
    where: { tenantId: session.user.tenantId, isDeleted: false },
    include: { category: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(services);
}

export async function DELETE(req: Request) {
  try {
    const session = await getAuthSession();

    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden: Admins only" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Service ID is required" }, { status: 400 });
    }

    const service = await prisma.service.update({
      where: { id, tenantId: session.user.tenantId },
      data: { isDeleted: true },
    });

    return NextResponse.json(service);
  } catch {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
