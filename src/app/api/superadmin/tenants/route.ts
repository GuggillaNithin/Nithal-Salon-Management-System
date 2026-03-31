import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    // Only allow superadmin
    if (!session || (session.user as any).role !== "superadmin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Fetch all non-system tenants and their associated admin users
    const tenants = await prisma.tenant.findMany({
      where: {
        id: {
          not: "system-tenant",
        },
      },
      include: {
        users: {
          where: {
            role: "admin",
          },
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(tenants);
  } catch (error: any) {
    console.error("Failed to fetch tenants", error);
    return NextResponse.json(
      { error: "Something went wrong fetching tenants" },
      { status: 500 }
    );
  }
}
