/**
 * Clear incidents. UrbanMesh does not ship authored demo reports.
 * The map, heatmap, and LPDP brief stay empty until residents file.
 *
 *   npx prisma db seed
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const before = await prisma.$queryRaw<Array<{ total: number }>>`
    SELECT COUNT(*)::int AS total FROM incidents
  `;
  await prisma.$executeRaw`DELETE FROM incidents`;
  console.log(
    `UrbanMesh seed — removed ${before[0]?.total ?? 0} incident(s). Table is empty.`,
  );
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
