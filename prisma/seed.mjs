import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function hashPassword(password) {
  return await bcrypt.hash(password, 10);
}

async function main() {
  const superadminTenant = await prisma.tenant.upsert({
    where: { id: "system-tenant" },
    update: { name: "System Administration" },
    create: {
      id: "system-tenant",
      name: "System Administration",
    },
  });

  // Since seed.mjs uses crypto.scryptSync for its local hashPassword implementation:
  // But wait! Is the actual password hashing in the app using bcrypt?
  // Await the new bcrypt hash
  const hashedPassword = await hashPassword("Nithin2002@"); 

  await prisma.user.upsert({
    where: { email: "nithinguggilla@gmail.com" },
    update: {
      name: "Super Admin",
      password: hashedPassword,
      role: "superadmin",
      tenantId: superadminTenant.id,
    },
    create: {
      name: "Super Admin",
      email: "nithinguggilla@gmail.com",
      password: hashedPassword,
      role: "superadmin",
      tenantId: superadminTenant.id,
    },
  });

  console.log("Database seeded with superadmin!");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
