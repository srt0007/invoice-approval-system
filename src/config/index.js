require('dotenv').config();

module.exports = {
  // Server
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',

  // OpenAI
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'gpt-4-vision-preview',
    maxTokens: 4096,
    temperature: 0.1, // Low temperature for consistent extraction
  },

  // MySQL Database
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    name: process.env.DB_NAME || 'invoice_processing',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },

  // File Upload
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB
    allowedTypes: (process.env.ALLOWED_FILE_TYPES || 'pdf,png,jpg,jpeg,tiff').split(','),
    uploadDir: './uploads',
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  },

  // Webhook
  webhook: {
    secret: process.env.WEBHOOK_SECRET,
  },

  // Processing
  processing: {
    maxConcurrent: parseInt(process.env.MAX_CONCURRENT_PROCESSING) || 10,
    timeoutMs: parseInt(process.env.PROCESSING_TIMEOUT_MS) || 30000,
    retryAttempts: 3,
    retryDelayMs: 1000,
  },

  // Cache
  cache: {
    enabled: process.env.CACHE_ENABLED === 'true',
    ttlSeconds: parseInt(process.env.CACHE_TTL_SECONDS) || 3600,
  },

  // Export
  export: {
    dir: './exports',
  },
};
