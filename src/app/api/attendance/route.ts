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
    const { staffId, date, loginTime, logoutTime } = body;
    const tenantId = session.user.tenantId;

    if (!staffId || !date) {
      return NextResponse.json({ error: "Staff and date required" }, { status: 400 });
    }

    // Calculate total hours if both times are present
    let totalHours = null;
    if (loginTime && logoutTime) {
      const [loginH, loginM] = loginTime.split(':').map(Number);
      const [logoutH, logoutM] = logoutTime.split(':').map(Number);
      const diff = (logoutH * 60 + logoutM) - (loginH * 60 + loginM);
      totalHours = Number((diff / 60).toFixed(2));
    }

    const attendance = await (prisma as any).attendance.upsert({
      where: {
        staffId_date: {
          staffId,
          date: new Date(date)
        }
      },
      update: {
        loginTime,
        logoutTime,
        totalHours
      },
      create: {
        staffId,
        date: new Date(date),
        loginTime,
        logoutTime,
        totalHours,
        tenantId
      }
    });

    return NextResponse.json(attendance);
  } catch (error: any) {
    console.error("Attendance POST error:", error);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const tenantId = session.user.tenantId;
    const staffId = searchParams.get("staffId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const where: any = { tenantId };
    if (staffId) where.staffId = staffId;
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    const attendances = await (prisma as any).attendance.findMany({
      where,
      include: { staff: true },
      orderBy: { date: 'desc' }
    });

    return NextResponse.json(attendances);
  } catch (error) {
    return NextResponse.json({ error: "Fetch failed" }, { status: 500 });
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
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }

    await (prisma as any).attendance.delete({
      where: { id, tenantId: session.user.tenantId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
