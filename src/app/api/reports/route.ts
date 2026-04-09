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
      prisma.visit.findMany({ where: { tenantId, isDeleted: false, ...dateFilter }, orderBy: { createdAt: "asc" }, include: { staff: true } }),
    ]);

    // All-time un-filtered total revenue
    const overallRevenue = overallVisits.reduce((sum, v) => sum + (v.finalAmount ?? v.totalAmount ?? 0), 0);

    // Filtered logic
    let filteredRevenue = 0;
    const breakdown = { cash: 0, gpay: 0, phonepe: 0, card: 0 };
    const chartMap = new Map<string, number>();
    const staffMap = new Map<string, number>();

    for (const v of filteredVisits) {
      const amount = v.finalAmount ?? v.totalAmount ?? 0;
      filteredRevenue += amount;
      
      const rawMethod = v.paymentMethod || "cash";
      if (rawMethod.startsWith("[")) {
        try {
          const splits = JSON.parse(rawMethod);
          for (const split of splits) {
            const method = (split.method || "cash").toLowerCase();
            if (breakdown.hasOwnProperty(method)) {
              (breakdown as any)[method] += split.amount;
            }
          }
        } catch (e) {
          (breakdown as any)["cash"] += amount;
        }
      } else {
        const method = rawMethod.toLowerCase();
        if (breakdown.hasOwnProperty(method)) {
          (breakdown as any)[method] += amount;
        }
      }

      const dateKey = v.createdAt.toISOString().split("T")[0];
      chartMap.set(dateKey, (chartMap.get(dateKey) || 0) + amount);

      const staffName = (v as any).staff?.name || "Unassigned";
      staffMap.set(staffName, (staffMap.get(staffName) || 0) + amount);
    }

    const chartData = Array.from(chartMap.entries()).map(([date, revenue]) => ({ date, revenue }));

    const presetColors = ["hsl(214.7 95% 40%)", "hsl(142.1 76.2% 36.3%)", "hsl(47.9 95.8% 53.1%)", "hsl(262.1 83.3% 57.8%)", "hsl(0 0% 63.9%)", "hsl(340, 80%, 50%)"];
    let colorIdx = 0;
    const staffRevenue = Array.from(staffMap.entries())
      .filter(([_, value]) => value > 0)
      .sort((a, b) => b[1] - a[1]) // highest revenue first
      .map(([label, value]) => ({
        label,
        value,
        color: presetColors[colorIdx++ % presetColors.length]
      }));

    return NextResponse.json({
      overallRevenue,
      filtered: {
        totalRevenue: filteredRevenue,
        breakdown,
        chartData,
        staffRevenue,
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
