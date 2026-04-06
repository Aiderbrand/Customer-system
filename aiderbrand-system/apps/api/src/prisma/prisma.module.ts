import { Global, Module } from '@nestjs/common'
import { PrismaService } from './prisma.service'

/**
 * PrismaModule — global module exposing PrismaService to all modules.
 * Decorated with @Global() so no need to re-import in every module.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
