// Shared Prisma client singleton. Import this instead of instantiating
// `new PrismaClient()` per-module, so the app holds one connection pool.
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default prisma
