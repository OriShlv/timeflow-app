process.env.NODE_ENV = 'test';
process.env.DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://timeflow:timeflow@localhost:5432/timeflow_test';
process.env.REDIS_URL = process.env.REDIS_URL ?? 'redis://127.0.0.1:6379';
process.env.JWT_SECRET =
  process.env.JWT_SECRET ?? 'test-secret-32-chars-minimum-required-here';
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '15m';
process.env.OPS_ENABLED = 'false';
