import { PrismaClient, Role, UserStatus, CreatorStatus, PostStatus, PostVisibility } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function upsertUser(email: string, password: string, displayName: string, roles: Role[], makeActive = true) {
  const passwordHash = await argon2.hash(password);
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      passwordHash,
      displayName,
      status: makeActive ? UserStatus.ACTIVE : UserStatus.PENDING_EMAIL_VERIFICATION,
      emailVerifiedAt: makeActive ? new Date() : null,
    },
  });
  for (const role of roles) {
    await prisma.userRole.upsert({
      where: { userId_role: { userId: user.id, role } },
      update: {},
      create: { userId: user.id, role },
    });
  }
  return user;
}

async function upsertCreator(opts: {
  email: string;
  password: string;
  displayName: string;
  username: string;
  bio: string;
  priceCents: number;
}) {
  const user = await upsertUser(opts.email, opts.password, opts.displayName, [Role.USER, Role.CREATOR]);
  const profile = await prisma.creatorProfile.upsert({
    where: { userId: user.id },
    update: {
      username: opts.username,
      displayName: opts.displayName,
      bio: opts.bio,
      subscriptionPriceCents: opts.priceCents,
      status: CreatorStatus.ACTIVE,
    },
    create: {
      userId: user.id,
      username: opts.username,
      displayName: opts.displayName,
      bio: opts.bio,
      subscriptionPriceCents: opts.priceCents,
      status: CreatorStatus.ACTIVE,
    },
  });
  return profile;
}

async function ensurePost(creatorId: string, title: string, body: string, visibility: PostVisibility) {
  const existing = await prisma.post.findFirst({
    where: { creatorId, title },
  });
  if (existing) return existing;
  return prisma.post.create({
    data: {
      creatorId,
      title,
      body,
      status: PostStatus.PUBLISHED,
      visibility,
      publishedAt: new Date(),
    },
  });
}

async function main() {
  console.log('🌱 Seeding DollyFans...');

  // Demo fan
  await upsertUser('demo@dollyfans.local', 'Password123!', 'Demo Fan', [Role.USER]);

  // Creators
  const luna = await upsertCreator({
    email: 'luna@dollyfans.local',
    password: 'Password123!',
    displayName: 'Luna Stella',
    username: 'luna',
    bio: 'Fitness coach & lifestyle. Allenamenti settimanali esclusivi e tips quotidiani.',
    priceCents: 999,
  });
  const max = await upsertCreator({
    email: 'max@dollyfans.local',
    password: 'Password123!',
    displayName: 'Max Arts',
    username: 'maxart',
    bio: 'Illustratore digitale. Tutorial passo-passo, WIP e file PSD esclusivi.',
    priceCents: 1499,
  });
  const sera = await upsertCreator({
    email: 'sera@dollyfans.local',
    password: 'Password123!',
    displayName: 'Sera Beats',
    username: 'soundbysera',
    bio: 'Producer e DJ. Stems, sample pack e tracce inedite ogni settimana.',
    priceCents: 1999,
  });
  const dario = await upsertCreator({
    email: 'dario@dollyfans.local',
    password: 'Password123!',
    displayName: 'Chef Dario',
    username: 'chef.dario',
    bio: 'Ricette gourmet, livestream cucina e Q&A privati con i miei abbonati.',
    priceCents: 799,
  });

  // Sample posts
  await ensurePost(luna.id, 'Allenamento total body — settimana 1', 'Workout 4x12 con focus core. Riscaldamento 5min. Stretching finale 10min.', PostVisibility.PUBLIC);
  await ensurePost(luna.id, 'Routine mattina (solo abbonati)', 'La mia morning routine completa con respirazione, stretching e affermazioni.', PostVisibility.SUBSCRIBERS_ONLY);
  await ensurePost(max.id, 'WIP: ritratto digitale', 'Lavoro in corso del nuovo ritratto. Brushes inclusi nel post per gli abbonati.', PostVisibility.SUBSCRIBERS_ONLY);
  await ensurePost(max.id, 'Tips: anatomia del viso', 'Tre tecniche per dare profondità ai volti nei tuoi disegni digitali.', PostVisibility.PUBLIC);
  await ensurePost(sera.id, 'Sample pack #07 — Lo-Fi Nights', '20 loop originali in BPM 70-90. Per gli abbonati il file ZIP completo.', PostVisibility.SUBSCRIBERS_ONLY);
  await ensurePost(dario.id, 'Risotto allo zafferano (perfetto)', 'Tre segreti che cambiano il risultato finale. Ricetta + lista spesa.', PostVisibility.PUBLIC);

  console.log('✅ Seed completato.');
  console.log('   Fan demo:    demo@dollyfans.local / Password123!');
  console.log('   Creator:     luna@, max@, sera@, dario@dollyfans.local / Password123!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
