import { PrismaClient } from '@prisma/client';
import { withPulse } from '@prisma/extension-pulse/workerd';

const prisma = new PrismaClient()
  .$extends(
    withPulse({
      apiKey: process.env['PULSE_API_KEY'] as string
    })
  )

export { prisma }
