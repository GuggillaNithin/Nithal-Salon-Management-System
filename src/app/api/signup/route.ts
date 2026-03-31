import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import bcrypt from "bcrypt";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { salonName, email, password } = body;

    // 1. Create tenant
    const tenant = await prisma.tenant.create({
      data: {
        name: salonName || "My Salon",
      },
    });

    // 2. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. Create user (including required 'name' and 'role' fields based on your schema)
    const user = await prisma.user.create({
      data: {
        name: "Admin", // Fallback name since it wasn't strictly provided
        email,
        password: hashedPassword,
        role: "admin", // Defining as admin to comply with the schema constraint
        tenantId: tenant.id,
      },
    });

    return NextResponse.json({
      tenant,
      user,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Signup failed" },
      { status: 500 }
    );
  }
}
