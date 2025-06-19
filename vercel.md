# BroCode Vercel Deployment Guide

This guide will help you deploy the BroCode application to Vercel with optimized performance to prevent timeout errors.

## Pre-Deployment Checklist

1. **Environment Variables Setup**
   
   Create these in your Vercel project settings:

   ```
   # App URLs
   NEXTAUTH_URL=https://neetcode.vercel.app
   NEXTAUTH_URL_INTERNAL=https://neetcode.vercel.app
   NEXT_PUBLIC_URL=https://neetcode.vercel.app
   NEXT_PUBLIC_PROTOCOL=https
   
   # Generate a secure secret with: openssl rand -base64 32
   NEXTAUTH_SECRET=your_generated_secret_key
   
   # Database Configuration
   DATABASE_URL=postgresql://username:password@host:port/database?pgbouncer=true&connection_limit=50&pool_timeout=20
   DIRECT_URL=postgresql://username:password@host:port/database
   
   # Email Configuration
   EMAIL_SERVER_HOST=smtp.example.com
   EMAIL_SERVER_PORT=587
   EMAIL_SERVER_USER=your_email_username
   EMAIL_SERVER_PASSWORD=your_email_password
   EMAIL_FROM=notifications@neetcode.vercel.app
   
   # Node environment
   NODE_ENV=production
   ```

2. **Email Configuration**

   For production emails, we recommend using:
   - [SendGrid](https://sendgrid.com/) - Good for transactional emails
   - [Mailgun](https://www.mailgun.com/) - Excellent deliverability
   - [AWS SES](https://aws.amazon.com/ses/) - Cost-effective for high volume

   Configure your selected provider and update the email environment variables accordingly.

## Deployment Steps

1. **Push your code to GitHub**

2. **In the Vercel Dashboard:**
   - Click "Import Project"
   - Select your repository
   - Configure the project:
     - Framework Preset: Next.js
     - Build Command: `npm run vercel-build`
     - Output Directory: `.next`
   - Add all required environment variables
   - Deploy

## Performance Optimizations

The following optimizations are already configured in your `vercel.json` and `next.config.mjs`:

1. **Region Selection**
   - Deployed to `iad1` (US East) for optimal latency
   - Change this in `vercel.json` if your users are primarily in another region

2. **Function Configuration**
   - API routes allocated 1024MB memory
   - Maximum execution time of 10 seconds
   - Prevents timeouts for most operations

3. **Caching Strategy**
   - Static assets cached with `immutable` and long TTLs
   - API routes marked as no-cache
   - Pages cached for 1 hour with stale-while-revalidate of 24 hours

4. **Build Optimizations**
   - SWC minification enabled
   - Chunk splitting configured for optimal load times
   - ESLint and TypeScript errors ignored during production builds

## Troubleshooting

### Function Timeout Errors

If you still experience timeout errors:

1. **Optimize Database Queries**
   - Add proper indexes
   - Limit query results
   - Use pagination

2. **Implement Serverless Functions**
   - Move heavy processing to separate serverless functions
   - Consider using Vercel Edge Functions for lighter operations

3. **Database Connection Pooling**
   - Ensure your database connection string uses PgBouncer or similar
   - Limit maximum connections per function

### Database Migration Issues

If migrations fail during deployment:

1. **Check Migration Logs**
   - Review the Vercel deployment logs
   - Ensure `prisma migrate deploy` runs correctly

2. **Manual Migration**
   - Run migrations manually before deployment
   - Use `npx prisma migrate deploy` locally

## Monitoring

1. **Vercel Analytics**
   - Enable in Vercel dashboard
   - Monitor function execution times and errors

2. **Database Monitoring**
   - Set up alerts for high connection counts
   - Monitor query performance

## Contact

For assistance, consult the official documentation or contact our team at support@neetcode.io. 