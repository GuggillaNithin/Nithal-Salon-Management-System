import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getAuthSession();
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const categories = await prisma.category.findMany({
      where: {
        tenantId: session.user.tenantId,
        isDeleted: false,
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(categories);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch categories" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name } = await req.json();

    if (!name || name.trim() === "") {
      return NextResponse.json({ error: "Category name is required" }, { status: 400 });
    }

    const trimmedName = name.trim();

    // Duplicate Check
    const existing = await prisma.category.findFirst({
      where: {
        tenantId: session.user.tenantId,
        name: { equals: trimmedName, mode: 'insensitive' },
        isDeleted: false,
      }
    });

    if (existing) {
      return NextResponse.json({ error: `A category named "${trimmedName}" already exists.` }, { status: 400 });
    }

    const category = await prisma.category.create({
      data: {
        name: trimmedName,
        tenantId: session.user.tenantId,
      },
    });

    return NextResponse.json(category);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to create category" }, { status: 500 });
  }
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
      return NextResponse.json({ error: "Category ID required" }, { status: 400 });
    }

    // Verify ownership
    const category = await prisma.category.findUnique({ where: { id } });
    if (!category || category.tenantId !== session.user.tenantId) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    // Soft delete category 
    await prisma.category.update({
      where: { id },
      data: { isDeleted: true },
    });

    // NOTE: Services keep their `categoryId`, but since the category is soft-deleted,
    // the frontend can treat it as uncategorized or the backend can strip it on read.
    // In this case, keeping referential integrity is fine. 
    // We could set `categoryId` to null on services, but soft-delete works.
    await prisma.service.updateMany({
      where: { categoryId: id },
      data: { categoryId: null }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to delete category" }, { status: 500 });
  }
}
