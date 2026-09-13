function env(name: string, fallback = "") {
  return process.env[name] ?? fallback;
}

export const ENV = {
  appId: env("APP_ID", "qingshui-media-service"),
  cookieSecret: env("JWT_SECRET"),
  databaseUrl: env("DATABASE_URL"),
  isProduction: process.env.NODE_ENV === "production",
  publicAppUrl: env("PUBLIC_APP_URL", "http://localhost:3000"),
  cronSecret: env("CRON_SECRET"),
  smtpHost: env("SMTP_HOST"),
  smtpPort: Number(env("SMTP_PORT", "587")),
  smtpUser: env("SMTP_USER"),
  smtpPass: env("SMTP_PASS"),
  smtpFrom: env("SMTP_FROM"),
  notificationEmail: env("NOTIFICATION_EMAIL"),
  storageEndpoint: env("S3_ENDPOINT"),
  storageRegion: env("S3_REGION", "auto"),
  storageBucket: env("S3_BUCKET"),
  storageAccessKeyId: env("S3_ACCESS_KEY_ID"),
  storageSecretAccessKey: env("S3_SECRET_ACCESS_KEY"),
  storagePublicBaseUrl: env("S3_PUBLIC_BASE_URL"),
  googleCalendarClientId: env("GOOGLE_CALENDAR_CLIENT_ID"),
  googleCalendarClientSecret: env("GOOGLE_CALENDAR_CLIENT_SECRET"),
  googleCalendarRedirectUri: env("GOOGLE_CALENDAR_REDIRECT_URI"),
  externalApiUrl: env("EXTERNAL_API_BASE_URL"),
  externalApiKey: env("EXTERNAL_API_KEY"),
  schedulerApiUrl: env("SCHEDULER_API_URL"),
  schedulerApiKey: env("SCHEDULER_API_KEY"),
};

export function assertStandaloneEnvironment() {
  if (!ENV.cookieSecret || ENV.cookieSecret.length < 32) {
    throw new Error("JWT_SECRET must contain at least 32 characters");
  }
  if (!ENV.databaseUrl) throw new Error("DATABASE_URL is required");
}
