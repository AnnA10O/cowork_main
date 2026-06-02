/**
 * CoWork HQ — Database Seed
 * Run: npx ts-node prisma/seed.ts
 *
 * Creates:
 *  - 1 Admin account
 *  - 1 Sample Manager + Workspace
 *  - Sample pricing plans, desks, QR codes
 */

import { PrismaClient, Role, DayOfWeek, PricingType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding CoWork HQ database...');

  // ── 1. Admin ────────────────────────────────────────────────────────
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@coworkhq.in';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123456';
  const adminName = process.env.ADMIN_NAME || 'CoWork HQ Admin';

  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        name: adminName,
        passwordHash,
        role: Role.ADMIN,
        adminProfile: { create: {} },
      },
    });
    console.log(`✅ Admin created: ${admin.email}`);
  } else {
    console.log(`⏭️  Admin already exists: ${adminEmail}`);
  }

  // ── 2. Sample Manager ───────────────────────────────────────────────
  const managerEmail = 'manager@skycowork.in';
  let managerUser = await prisma.user.findUnique({ where: { email: managerEmail } });

  if (!managerUser) {
    const passwordHash = await bcrypt.hash('Manager@123', 12);
    managerUser = await prisma.user.create({
      data: {
        email: managerEmail,
        name: 'Raj Sharma',
        phone: '+919876543210',
        passwordHash,
        role: Role.MANAGER,
        managerProfile: {
          create: {
            businessName: 'Sky CoWork Spaces',
            gstNumber: '27AADCB2230M1ZT',
          },
        },
      },
    });
    console.log(`✅ Sample manager created: ${managerUser.email}`);
  }

  const manager = await prisma.manager.findUnique({ where: { userId: managerUser.id } });

  // ── 3. Sample Workspace ─────────────────────────────────────────────
  let workspace = await prisma.workspace.findFirst({ where: { managerId: manager.id } });

  if (!workspace) {
    workspace = await prisma.workspace.create({
      data: {
        managerId: manager.id,
        name: 'Sky CoWork — Koregaon Park',
        description: 'Premium co-working space in the heart of Koregaon Park, Pune. High-speed WiFi, standing desks, and a great café.',
        address: '101, North Main Road, Koregaon Park',
        city: 'Pune',
        state: 'Maharashtra',
        pincode: '411001',
        latitude: 18.5362,
        longitude: 73.8941,
        googleMapsUrl: 'https://maps.google.com/?q=Koregaon+Park+Pune',
        amenities: ['High-Speed WiFi', 'Cafeteria', 'Parking', 'AC', 'Lockers', 'Printing', 'Meeting Room'],
        workingHours: {
          create: [
            { day: DayOfWeek.MON, openTime: '08:00', closeTime: '22:00' },
            { day: DayOfWeek.TUE, openTime: '08:00', closeTime: '22:00' },
            { day: DayOfWeek.WED, openTime: '08:00', closeTime: '22:00' },
            { day: DayOfWeek.THU, openTime: '08:00', closeTime: '22:00' },
            { day: DayOfWeek.FRI, openTime: '08:00', closeTime: '22:00' },
            { day: DayOfWeek.SAT, openTime: '09:00', closeTime: '20:00' },
            { day: DayOfWeek.SUN, openTime: '10:00', closeTime: '18:00', isClosed: false },
          ],
        },
      },
    });
    console.log(`✅ Workspace created: ${workspace.name}`);
  }

  // ── 4. Pricing Plans ────────────────────────────────────────────────
  const existingPlans = await prisma.pricingPlan.count({ where: { workspaceId: workspace.id } });
  if (existingPlans === 0) {
    await prisma.pricingPlan.createMany({
      data: [
        { workspaceId: workspace.id, name: 'Day Pass',         type: PricingType.DAILY,   basePrice: 199 },
        { workspaceId: workspace.id, name: 'Weekly Hot Desk',  type: PricingType.WEEKLY,  basePrice: 999 },
        { workspaceId: workspace.id, name: 'Monthly Hot Desk', type: PricingType.MONTHLY, basePrice: 2999 },
        { workspaceId: workspace.id, name: 'Hourly',           type: PricingType.HOURLY,  basePrice: 49 },
      ],
    });
    console.log('✅ Pricing plans created');
  }

  // ── 5. Desks ────────────────────────────────────────────────────────
  const existingDesks = await prisma.desk.count({ where: { workspaceId: workspace.id } });
  if (existingDesks === 0) {
    const desks = [];
    // Row A — Standard desks
    for (let i = 1; i <= 8; i++) {
      desks.push({ workspaceId: workspace.id, deskNumber: `A${i}`, type: 'standard', premiumExtra: 0 });
    }
    // Row B — Window desks (₹75 extra)
    for (let i = 1; i <= 6; i++) {
      desks.push({ workspaceId: workspace.id, deskNumber: `B${i}`, type: 'window', description: 'Window view', premiumExtra: 75 });
    }
    // Row C — Private cabin (₹150 extra)
    for (let i = 1; i <= 4; i++) {
      desks.push({ workspaceId: workspace.id, deskNumber: `C${i}`, type: 'private', description: 'Private cabin desk', premiumExtra: 150 });
    }

    await prisma.desk.createMany({ data: desks });
    console.log(`✅ ${desks.length} desks created`);
  }

  // ── 6. QR Codes (one per desk, one for workspace entrance) ──────────
  const deskList = await prisma.desk.findMany({ where: { workspaceId: workspace.id } });
  const existingQRs = await prisma.qrCode.count({ where: { workspaceId: workspace.id } });
  if (existingQRs === 0) {
    // Workspace-level QR (for entrance)
    await prisma.qrCode.create({ data: { workspaceId: workspace.id } });
    // Per-desk QRs
    await prisma.qrCode.createMany({
      data: deskList.map((d) => ({ workspaceId: workspace.id, deskId: d.id })),
    });
    console.log(`✅ ${deskList.length + 1} QR codes generated`);
  }

  // ── 7. Sample Customer ──────────────────────────────────────────────
  const customerEmail = 'customer@test.com';
  const existingCustomer = await prisma.user.findUnique({ where: { email: customerEmail } });
  if (!existingCustomer) {
    const passwordHash = await bcrypt.hash('Customer@123', 12);
    await prisma.user.create({
      data: {
        email: customerEmail,
        name: 'Priya Patel',
        phone: '+919123456789',
        passwordHash,
        role: Role.CUSTOMER,
        customerProfile: { create: {} },
      },
    });
    console.log(`✅ Sample customer created: ${customerEmail}`);
  }

  // ── 8. Sample Staff Code ────────────────────────────────────────────
  const existingCode = await prisma.staffCode.findFirst({ where: { managerId: manager.id } });
  if (!existingCode) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    await prisma.staffCode.create({
      data: { managerId: manager.id, code: 'STAFF001', expiresAt },
    });
    console.log('✅ Sample staff code created: STAFF001');
  }

  console.log('\n🎉 Seed complete!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Admin:    ${adminEmail} / ${adminPassword}`);
  console.log(`Manager:  ${managerEmail} / Manager@123`);
  console.log(`Customer: ${customerEmail} / Customer@123`);
  console.log(`Staff code to test staff registration: STAFF001`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
