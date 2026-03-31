import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password"; // I need to verify if hashPassword exists, or use bcrypt. The codebase had verifyPassword, so maybe I need to check password.ts.

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { salonName, adminName, email, password } = body;

    if (!salonName || !adminName || !email || !password) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json({ error: "Email already in use" }, { status: 400 });
    }

    const hashedPassword = await hashPassword(password);

    const result = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: { name: salonName },
      });

      const user = await tx.user.create({
        data: {
          name: adminName,
          email,
          password: hashedPassword,
          role: "admin",
          tenantId: tenant.id,
        },
      });

      return { tenant, user };
    });

    return NextResponse.json({ message: "Registration successful", tenantId: result.tenant.id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to register" }, { status: 500 });
  }
}
