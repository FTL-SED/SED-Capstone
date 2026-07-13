const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')

// Prisma 7's client engine requires a driver adapter. The connection string
// comes from DATABASE_URL (loaded via dotenv in index.js).
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })

const prisma = new PrismaClient({ adapter })

module.exports = prisma
