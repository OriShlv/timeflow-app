import { prisma } from '../src/db/prisma';
import { seedExampleRecommendationsForUser } from '../src/modules/recommendations/recommendations.service';

const EMAIL = process.env.SEED_EMAIL ?? 'demo@timeflow.local';

async function main(): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { email: EMAIL },
    select: { id: true, email: true },
  });

  if (user === null) {
    throw new Error(`User not found: ${EMAIL}. Run seed:demo first.`);
  }

  const count = await seedExampleRecommendationsForUser(user.id, new Date());
  console.log(`[seed] example recommendations for ${user.email}: ${count}`);
}

main()
  .catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[seed] recommendations failed:', message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
