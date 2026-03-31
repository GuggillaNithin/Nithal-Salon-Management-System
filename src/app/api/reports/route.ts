import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = session.user.tenantId;

    const { searchParams } = new URL(req.url);
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    let dateFilter: any = {};
    if (startDateParam || endDateParam) {
      dateFilter.createdAt = {};
      if (startDateParam) dateFilter.createdAt.gte = new Date(startDateParam);
      if (endDateParam) {
        const end = new Date(endDateParam);
        end.setHours(23, 59, 59, 999);
        dateFilter.createdAt.lte = end;
      }
    }

    // Parallel fetch
    const [totalCustomers, totalServices, overallVisits, filteredVisits] = await Promise.all([
      prisma.customer.count({ where: { tenantId, isDeleted: false, ...dateFilter } }),
      prisma.service.count({ where: { tenantId, isDeleted: false } }),
      prisma.visit.findMany({ where: { tenantId, isDeleted: false }, select: { finalAmount: true, totalAmount: true } }),
      prisma.visit.findMany({ where: { tenantId, isDeleted: false, ...dateFilter }, orderBy: { createdAt: "asc" } }),
    ]);

    // All-time un-filtered total revenue
    const overallRevenue = overallVisits.reduce((sum, v) => sum + (v.finalAmount ?? v.totalAmount ?? 0), 0);

    // Filtered logic
    let filteredRevenue = 0;
    const breakdown = { cash: 0, gpay: 0, phonepe: 0, card: 0 };
    const chartMap = new Map<string, number>();

    for (const v of filteredVisits) {
      const amount = v.finalAmount ?? v.totalAmount ?? 0;
      filteredRevenue += amount;
      
      const method = (v.paymentMethod || "cash").toLowerCase();
      if (breakdown.hasOwnProperty(method)) {
        (breakdown as any)[method] += amount;
      }

      const dateKey = v.createdAt.toISOString().split("T")[0];
      chartMap.set(dateKey, (chartMap.get(dateKey) || 0) + amount);
    }

    const chartData = Array.from(chartMap.entries()).map(([date, revenue]) => ({ date, revenue }));

    return NextResponse.json({
      overallRevenue,
      filtered: {
        totalRevenue: filteredRevenue,
        breakdown,
        chartData,
        totalCustomers,
        totalServices,
        totalVisits: filteredVisits.length,
      },
    });
  } catch (error: any) {
    console.error("Failed to generate report:", error);
    return NextResponse.json({ error: error.message || "Failed to generate report" }, { status: 500 });
  }
}
