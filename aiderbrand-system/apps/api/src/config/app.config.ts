import { registerAs } from '@nestjs/config'

export default registerAs('app', () => ({
  port: parseInt(process.env['PORT'] ?? '3001', 10),
  nodeEnv: process.env['NODE_ENV'] ?? 'development',
  frontendUrl: process.env['FRONTEND_URL'] ?? 'http://localhost:3000',
  mail: {
    enabled: process.env['MAIL_ENABLED'] === 'true',
    from: {
      email: process.env['MAIL_FROM_EMAIL'] ?? 'no-reply@example.com',
      name: process.env['MAIL_FROM_NAME'] ?? 'Aiderbrand',
    },
    smtp: {
      host: process.env['SMTP_HOST'] ?? '',
      port: parseInt(process.env['SMTP_PORT'] ?? '587', 10),
      user: process.env['SMTP_USER'] ?? '',
      pass: process.env['SMTP_PASS'] ?? '',
      secure: process.env['SMTP_SECURE'] === 'true',
    },
  },

  jwt: {
    accessSecret: process.env['JWT_ACCESS_SECRET'] ?? 'CHANGE_ME_ACCESS',
    refreshSecret: process.env['JWT_REFRESH_SECRET'] ?? 'CHANGE_ME_REFRESH',
    accessExpiresIn: process.env['JWT_ACCESS_EXPIRES_IN'] ?? '15m',
    refreshExpiresIn: process.env['JWT_REFRESH_EXPIRES_IN'] ?? '7d',
  },

  invitation: {
    expiresInHours: parseInt(process.env['INVITATION_EXPIRES_IN_HOURS'] ?? '72', 10),
  },

  passwordReset: {
    expiresInHours: parseInt(process.env['PASSWORD_RESET_EXPIRES_IN_HOURS'] ?? '1', 10),
  },
}))
