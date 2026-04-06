/**
 * Minimal production seed — creates only:
 *   1. Aiderbrand company
 *   2. SYSTEM_ADMIN user (from env vars)
 *
 * Usage: npm run db:seed:admin
 */

import { PrismaClient, Role } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const email = process.env['SEED_ADMIN_EMAIL'] ?? 'admin@aiderbrand.com'
  const password = process.env['SEED_ADMIN_PASSWORD'] ?? 'ChangeMe123!'

  const company = await prisma.company.upsert({
    where: { slug: 'aiderbrand' },
    update: {},
    create: { name: 'Aiderbrand', slug: 'aiderbrand', isActive: true },
  })

  const hash = await bcrypt.hash(password, 12)

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name: 'Admin', passwordHash: hash, isActive: true },
  })

  await prisma.companyMembership.upsert({
    where: { userId_companyId: { userId: user.id, companyId: company.id } },
    update: {},
    create: { userId: user.id, companyId: company.id, role: Role.SYSTEM_ADMIN, isActive: true },
  })

  console.log(`✅ Admin ready: ${email}`)
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
