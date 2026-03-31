import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/password";

const prisma = new PrismaClient();

async function main() {
  const superadminTenant = await prisma.tenant.upsert({
    where: { id: "system-tenant" },
    update: { name: "System Administration" },
    create: {
      id: "system-tenant",
      name: "System Administration",
    },
  });

  const superadminPassword = await hashPassword("Nithin2002@");

  await prisma.user.upsert({
    where: { email: "nithinguggilla@gmail.com" },
    update: {
      name: "Super Admin",
      password: superadminPassword,
      role: "superadmin",
      tenantId: superadminTenant.id,
    },
    create: {
      name: "Super Admin",
      email: "nithinguggilla@gmail.com",
      password: superadminPassword,
      role: "superadmin",
      tenantId: superadminTenant.id,
    },
  });

  console.log("Database seeded with superadmin!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
