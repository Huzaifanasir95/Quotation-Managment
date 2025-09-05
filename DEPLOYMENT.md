# QMS Deployment Guide

## Overview
This guide explains how to deploy the Quality Management System (QMS) to Vercel as a full-stack application with both frontend (Next.js) and backend (Node.js/Express) components.

## Prerequisites
- Vercel account (sign up at https://vercel.com)
- GitHub repository with your code
- Supabase database setup

## Deployment Steps

### 1. Prepare Your Repository
Ensure your GitHub repository is up to date with all the latest changes:
```bash
git add .
git commit -m "Add Vercel deployment configuration"
git push origin main
```

### 2. Deploy to Vercel

#### Option A: Deploy via Vercel Dashboard
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your GitHub repository (`malikadan212/QMS`)
4. Configure the project:
   - **Framework Preset**: Next.js
   - **Root Directory**: `./` (leave empty for root)
   - **Build Command**: `npm run vercel-build`
   - **Output Directory**: `qms-frontend/.next`
   - **Install Command**: `npm run install:all`

#### Option B: Deploy via Vercel CLI
```bash
npm i -g vercel
vercel login
vercel --prod
```

### 3. Configure Environment Variables
In your Vercel project settings, add these environment variables:

#### Frontend Variables:
- `NEXT_PUBLIC_API_BASE_URL`: `https://your-app-name.vercel.app/api/v1`
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anon key

#### Backend Variables:
- `NODE_ENV`: `production`
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key
- `SUPABASE_ANON_KEY`: Your Supabase anon key
- `JWT_SECRET`: Generate a secure random string
- `JWT_EXPIRES_IN`: `7d`
- `CORS_ORIGIN`: `https://your-app-name.vercel.app`
- `RATE_LIMIT_MAX`: `100`
- `RATE_LIMIT_WINDOW_MS`: `900000`

### 4. Domain Configuration
After deployment:
1. Your app will be available at `https://your-app-name.vercel.app`
2. API endpoints will be at `https://your-app-name.vercel.app/api/v1/*`
3. Update your frontend's API base URL to match your deployment URL

### 5. Custom Domain (Optional)
To use a custom domain:
1. Go to your Vercel project settings
2. Navigate to "Domains" tab
3. Add your custom domain
4. Update DNS records as instructed
5. Update environment variables with new domain

## Project Structure for Vercel

```
QMS/
├── package.json (root - monorepo config)
├── vercel.json (deployment config)
├── qms-frontend/ (Next.js app)
│   ├── package.json
│   ├── next.config.ts
│   └── app/
├── qms-backend/ (Express API)
│   ├── package.json
│   ├── api/
│   │   └── index.js (Vercel serverless entry)
│   └── src/
└── .env.example
```

## Routing Configuration

### Frontend Routes
- All pages: `https://your-app.vercel.app/*`
- Dashboard: `https://your-app.vercel.app/dashboard`
- Inventory: `https://your-app.vercel.app/inventory`

### Backend API Routes
- All APIs: `https://your-app.vercel.app/api/v1/*`
- Auth: `https://your-app.vercel.app/api/v1/auth/*`
- Products: `https://your-app.vercel.app/api/v1/products/*`

## Testing Deployment

### 1. Health Check
Test your backend:
```bash
curl https://your-app.vercel.app/api/v1/health
```

### 2. Frontend Test
Visit: `https://your-app.vercel.app`

### 3. API Test
Test an API endpoint:
```bash
curl https://your-app.vercel.app/api/v1/products
```

## Monitoring and Logs

### Vercel Functions Logs
1. Go to Vercel Dashboard
2. Select your project
3. Navigate to "Functions" tab
4. View real-time logs

### Frontend Logs
1. Use browser developer tools
2. Check Vercel Analytics (if enabled)

## Performance Optimization

The deployment includes:
- ✅ Next.js optimization (SSR, static generation)
- ✅ Bundle splitting for heavy libraries
- ✅ Image optimization
- ✅ Compression middleware
- ✅ Rate limiting
- ✅ Security headers

## Troubleshooting

### Common Issues:

1. **Build Failures**
   - Check Node.js version compatibility
   - Verify all dependencies are installed
   - Review build logs in Vercel dashboard

2. **API Not Working**
   - Verify environment variables are set
   - Check function logs for errors
   - Ensure CORS settings are correct

3. **Database Connection Issues**
   - Verify Supabase credentials
   - Check if service role key has proper permissions
   - Test connection from Supabase SQL editor

4. **Frontend Build Issues**
   - Check Next.js configuration
   - Verify TypeScript compilation
   - Review webpack bundle analysis

## Continuous Deployment

After initial setup:
1. Push to `main` branch triggers automatic deployment
2. Preview deployments for pull requests
3. Environment variables persist across deployments
4. Rollback available through Vercel dashboard

## Security Considerations

- Environment variables are encrypted
- HTTPS enforced by default
- Rate limiting configured
- CORS properly configured
- Security headers via Helmet.js
- Service role keys used for backend operations
- Anon keys used for frontend operations

## Support

For deployment issues:
1. Check Vercel documentation
2. Review function logs
3. Test locally first
4. Check environment variable configuration
