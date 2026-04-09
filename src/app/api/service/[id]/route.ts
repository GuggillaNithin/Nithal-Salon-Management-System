import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/api-auth";
import { NextResponse } from "next/server";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.tenantId || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = session.user.tenantId;
    const body = await req.json();
    const resolvedParams = await params;
    const { name, price, categoryId } = body;

    if (!name || price === undefined) {
      return NextResponse.json(
        { error: "Name and price are required" },
        { status: 400 }
      );
    }

    if (categoryId) {
      const categoryExists = await prisma.category.findFirst({
        where: { id: categoryId, tenantId, isDeleted: false },
      });
      if (!categoryExists) {
        return NextResponse.json({ error: "Invalid category" }, { status: 400 });
      }
    }

    const updatedService = await prisma.service.updateMany({
      where: {
        id: resolvedParams.id,
        tenantId,
        isDeleted: false,
      },
      data: {
        name,
        price: Number(price),
        categoryId: categoryId || null,
      },
    });

    if (updatedService.count === 0) {
      return NextResponse.json({ error: "Service not found or unauthorized" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to edit service" },
      { status: 500 }
    );
  }
}
