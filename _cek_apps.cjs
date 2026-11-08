const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const apps = await prisma.ssoApp.findMany({ orderBy: { order: 'asc' } });
  console.log('=== sso_apps ===');
  apps.forEach((a) => {
    console.log(`  ${String(a.order).padStart(2)} | ${a.clientId.padEnd(20)} | ${a.nameApp.padEnd(20)} | aktif=${a.isActive}`);
  });

  const masuk = await prisma.permission.findMany({
    where: { key: { contains: ':masuk_' } },
    select: { key: true },
    orderBy: { key: 'asc' },
  });
  console.log('\n=== izin masuk terdaftar ===');
  const perApp = {};
  masuk.forEach((m) => {
    const app = m.key.split(':')[0];
    perApp[app] = (perApp[app] || 0) + 1;
  });
  Object.entries(perApp).forEach(([k, v]) => console.log(`  ${k.padEnd(22)} ${v} tingkat`));
})().catch((e) => console.error(e.message))
  .finally(() => prisma.$disconnect());
