import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user as any).role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden: Superadmin only" }, { status: 403 });
    }

    const body = await req.json();
    const { name, email, password } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required" },
        { status: 400 }
      );
    }

    // 1. Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 400 }
      );
    }

    // 2. Create Tenant
    const tenant = await prisma.tenant.create({
      data: {
        name,
      },
    });

    // 3. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. Create User explicitly assigned as an Administrator
    const user = await prisma.user.create({
      data: {
        name: "Admin", // Fallback name for the user
        email,
        password: hashedPassword,
        role: "admin", // Explicitly define this user as an Admin
        tenantId: tenant.id,
      },
    });

    return NextResponse.json({
      message: "Tenant & User created successfully",
      tenant,
      user,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
