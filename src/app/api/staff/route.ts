import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/api-auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, gender } = body;
    const tenantId = session.user.tenantId;

    if (!name || !gender) {
      return NextResponse.json({ error: "Name and gender required" }, { status: 400 });
    }

    const staff = await prisma.staff.create({
      data: { name, gender, tenantId },
    });

    return NextResponse.json(staff);
  } catch (error) {
    return NextResponse.json({ error: "Creation failed" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = session.user.tenantId;
    const staffs = await prisma.staff.findMany({
      where: { tenantId, isDeleted: false },
    });

    return NextResponse.json(staffs);
  } catch (error) {
    return NextResponse.json({ error: "Fetch failed" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.tenantId || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Method requires an ID" }, { status: 400 });
    }

    const tenantId = session.user.tenantId;
    
    // soft delete
    await prisma.staff.updateMany({
      where: { id, tenantId },
      data: { isDeleted: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
