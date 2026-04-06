import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const cookieParser = require('cookie-parser') as typeof import('cookie-parser')
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  const config = app.get(ConfigService)
  const port = config.get<number>('PORT', 3001)
  const frontendUrl = config.get<string>('FRONTEND_URL', 'http://localhost:3000')

  // ─── Middleware ──────────────────────────────────────────────────────────────
  app.use(cookieParser())

  // ─── CORS ────────────────────────────────────────────────────────────────────
  app.enableCors({
    origin: frontendUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Company-Id'],
  })

  // ─── Global validation pipe ───────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )

  // ─── Global prefix ────────────────────────────────────────────────────────
  app.setGlobalPrefix('api/v1')

  await app.listen(port)

  console.log(`[Aiderbrand API] Running on http://localhost:${port}/api/v1`)
}

bootstrap()
