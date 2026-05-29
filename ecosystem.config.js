module.exports = {
  apps: [
    {
      name: "socket-server",
      script: "socket-server.js",
      instances: 1,
      exec_mode: "fork",
      watch: false,
      max_memory_restart: "400M",

      // ── Default: AWS EC2 with Upstash Redis ──────────────────────────────────
      env: {
        NODE_ENV: "production",
        PORT: 4000,

        // Provider: "upstash" | "railway" | "aws"
        REDIS_PROVIDER: "upstash",

        // Upstash Redis (standard Redis protocol over TLS, works with ioredis)
        UPSTASH_REDIS_URL: "rediss://default:gQAAAAAAAd_2AAIgcDJiNmZlZGU3YWY2Yjg0Y2I1YmI3OWQzODE3MmMyMDgxZg@proven-sunbeam-122870.upstash.io:6379",

        // CORS — your Vercel frontend
        ALLOWED_ORIGINS: "https://brocode-ai.vercel.app",

        // Database — Supabase
        DATABASE_URL: "postgresql://postgres.mkgegbvvmflghgcrddtd:SHGJThGrPgyLBBRQ@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&pool_mode=session&connection_limit=20",
      },

      // ── Railway (pm2 start ecosystem.config.js --env railway) ────────────────
      env_railway: {
        NODE_ENV: "production",
        PORT: 4000,
        REDIS_PROVIDER: "railway",
        RAILWAY_REDIS_URL: "redis://default:BwrYMZhMDNqxVZDHjgsTGSOPAiFKJXgq@hopper.proxy.rlwy.net:28463",
        ALLOWED_ORIGINS: "https://brocode-ai.vercel.app",
        DATABASE_URL: "postgresql://postgres.mkgegbvvmflghgcrddtd:SHGJThGrPgyLBBRQ@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&pool_mode=session&connection_limit=20",
      },
    },
  ],
};
