# BroCode Vercel Deployment Guide

This comprehensive guide covers deploying BroCode to Vercel with special focus on database consistency.

## Prerequisites

1. [Vercel account](https://vercel.com/signup)
2. GitHub repository with your BroCode codebase
3. Supabase account for PostgreSQL database (or any other PostgreSQL provider)

## Step 1: Prepare Your Codebase

Ensure your codebase includes:

- [x] Updated `next.config.mjs` with proper redirects and headers
- [x] Simplified `vercel.json` with minimal configuration
- [x] Prisma schema ready for production
- [x] Correct build scripts in `package.json`

## Step 2: Database Setup

### Option A: Vercel Postgres (Recommended)

1. In Vercel dashboard, go to **Storage** tab
2. Click **Create Database**
3. Select **Vercel Postgres**
4. Follow the setup wizard
5. Vercel will automatically add connection strings to your environment

**Benefits**:
- Serverless, scales automatically
- Automatically handled connection pooling
- Edge-compatible with Vercel functions
- Connection strings auto-populated in environment variables

### Option B: MongoDB Atlas

1. Create a [MongoDB Atlas cluster](https://www.mongodb.com/cloud/atlas/register)
2. Set up a new database
3. Create a database user with read/write permissions
4. Whitelist Vercel's IP addresses (`0.0.0.0/0` for all IPs)
5. Get connection string: `mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<dbname>`

### Option C: Upstash Redis (for session/cache)

1. In Vercel dashboard, go to **Storage** tab
2. Click **Create** → **Upstash Redis**
3. Choose region closest to your deployment
4. Connection details will be added to your environment variables

## Step 3: Database Migrations

### With Prisma (PostgreSQL)

```bash
# Run locally before deployment to test migrations
npx prisma migrate dev

# For production deployment
npx prisma migrate deploy
```

**Vercel Build Command Setup**

Your package.json already has the required setup:
```json
"vercel-build": "prisma generate && prisma migrate deploy && next build"
```

**Override Build Command in Vercel**:
1. In project settings, go to **Build & Development Settings**
2. Override the Build Command with: `npm run vercel-build`

### MongoDB (No Migrations)

With MongoDB, you don't need traditional migrations, but you should:

1. Create indexes for performance:
   ```js
   db.users.createIndex({ email: 1 }, { unique: true })
   ```

2. Add validation rules:
   ```js
   db.createCollection("users", {
     validator: {
       $jsonSchema: {
         bsonType: "object",
         required: ["email", "name"],
         properties: {
           email: { bsonType: "string" },
           name: { bsonType: "string" }
         }
       }
     }
   })
   ```

## Step 4: Environment Variables

Set these in your Vercel project settings:

```
# App URLs
NEXTAUTH_URL=https://brocode.vercel.app
NEXT_PUBLIC_APP_URL=https://brocode.vercel.app

# Database URLs
DATABASE_URL=postgres://username:password@host:port/database
REDIS_URL=redis://username:password@host:port

# Auth Secret (generate with: openssl rand -base64 32)
NEXTAUTH_SECRET=your-secure-nextauth-secret

# OAuth Providers (if applicable)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GITHUB_ID=your-github-id
GITHUB_SECRET=your-github-secret

# Node environment
NODE_ENV=production
```

## Step 5: Database Consistency Strategies

### Connection Pooling

Vercel functions are serverless, which means:
- Each function invocation may create a new connection
- Connection limits can be quickly exhausted

**Solution 1: Use PgBouncer**
If using a non-Vercel Postgres database:
1. Set up PgBouncer in front of your PostgreSQL database
2. Use the PgBouncer connection string for `DATABASE_URL`

**Solution 2: Use Prisma Connection URL**
Your Prisma schema should include:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL") // For direct connections during migrations
}
```

**Solution 3: Vercel Postgres**
Vercel Postgres automatically handles connection pooling.

### Data Validation

1. **Server-side validation**:
   - Use Zod for API route data validation
   - Prisma schema constraints for database-level validation

2. **Database constraints**:
   - Use `unique` constraints for fields like email
   - Set up foreign key relationships for referential integrity

3. **Transactions for multi-step operations**:
   ```js
   await prisma.$transaction(async (tx) => {
     // Operations that need to succeed or fail together
     const user = await tx.user.create({ ... })
     await tx.profile.create({ ... })
   })
   ```

## Step 6: Deployment Steps

1. Push your code to GitHub
2. In Vercel dashboard, click **Add New Project**
3. Import your GitHub repository
4. Configure build settings:
   - Framework: Next.js
   - Build Command: `npm run vercel-build`
   - Output Directory: `.next` (default)
5. Add environment variables (from Step 4)
6. Click **Deploy**

## Step 7: Post-Deployment Database Checks

1. **Verify database connections**:
   - Check Vercel logs for connection errors
   - Test database connectivity with API endpoints

2. **Monitor query performance**:
   - Use Vercel Analytics to identify slow API routes
   - Check database-specific monitoring (e.g., MongoDB Atlas Profiler)

3. **Setup database backups**:
   - Enable automated backups for production data
   - Test restore procedures

## Troubleshooting

### Connection Issues

**Problem**: "Too many connections" error
**Solution**: 
- Check connection pooling configuration
- Verify Prisma connection settings
- For MongoDB, enable connection pooling in the connection string

**Problem**: "Connection timeout" error
**Solution**:
- Check if database is accessible from Vercel's network
- Verify firewall settings
- Increase connection timeout value

### Migration Issues

**Problem**: Migrations fail during deployment
**Solution**:
- Check migration logs in Vercel deployment
- Ensure `prisma migrate deploy` is in your build command
- Verify database user has permission to modify schema

### Performance Issues

**Problem**: Slow API responses
**Solution**:
- Check database query performance
- Add indexes to frequently queried fields
- Use Redis for caching frequent queries

## Monitoring and Maintenance

1. Setup **Vercel Analytics** to monitor:
   - API response times
   - Error rates
   - Deployment reliability

2. Database monitoring:
   - Set up alerts for high connections
   - Monitor disk usage
   - Check query performance regularly

3. Regular backups:
   - Ensure automated backups are running
   - Periodically test restore procedures

## Scaling Considerations

As your BroCode platform grows:

1. **Database Scaling**:
   - Vercel Postgres: Upgrade compute size as needed
   - MongoDB Atlas: Upgrade cluster tier
   - Consider read replicas for read-heavy workloads

2. **Redis Caching**:
   - Implement caching for frequent database queries
   - Store session data in Redis instead of database

3. **Edge Functions**:
   - Move API logic to Edge functions when possible
   - Use Edge config for global configuration

## 7. Final Checks & Troubleshooting

- **Logs**: If you encounter issues, the first place to check is the Vercel deployment logs and the runtime logs for your functions.
- **Supabase Logs**: Check your Supabase database logs for any connection errors or query issues.
- **Local Testing**: Always ensure that your application runs correctly locally before deploying.

### Example `.env.local` for local development

```
# App URLs
NEXTAUTH_URL=https://brocode.vercel.app
NEXT_PUBLIC_APP_URL=https://brocode.vercel.app

# Database URLs
DATABASE_URL=postgres://username:password@host:port/database
REDIS_URL=redis://username:password@host:port

# Auth Secret (generate with: openssl rand -base64 32)
NEXTAUTH_SECRET=your-secure-nextauth-secret

# OAuth Providers (if applicable)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GITHUB_ID=your-github-id
GITHUB_SECRET=your-github-secret

# Node environment
NODE_ENV=production
```

As your BroCode platform grows:
- **Monitor Usage**: Keep an eye on your Vercel and Supabase usage to stay within free tier limits or upgrade as needed.
- **Custom Domain**: Add a custom domain to your Vercel project for a professional look.
- **CI/CD**: Set up a CI/CD pipeline for automated testing and deployments.

By following this guide, you'll ensure your BroCode platform runs reliably on Vercel with good database consistency and performance. 