# 🚀 Enterprise Production Deployment & Infrastructure Guide

This guide details how to deploy the **ServiceCore Client Service Management Platform (CSMP)** to production environments with maximum reliability, security, enterprise compliance, and performance.

---

## 📑 Table of Contents

1. [Production Architecture Overview](#1-production-architecture-overview)
2. [Environment Variables Reference](#2-environment-variables-reference)
3. [Deep-Dive Supabase Cloud Setup](#3-deep-dive-supabase-cloud-setup)
   - [3.1 Create Project & Region Selection](#31-create-project--region-selection)
   - [3.2 Provision Schema & Seed Database](#32-provision-schema--seed-database)
   - [3.3 Production Connection Pooling (Supavisor)](#33-production-connection-pooling-supavisor)
   - [3.4 Supabase Authentication & Custom SMTP Setup](#34-supabase-authentication--custom-smtp-setup)
   - [3.5 Enable Realtime Replication](#35-enable-realtime-replication)
   - [3.6 Storage Buckets & Attachment Policies](#36-storage-buckets--attachment-policies)
   - [3.7 Database Backups & PITR](#37-database-backups--pitr)
4. [GitHub Pages Deployment Master Guide](#4-github-pages-deployment-master-guide)
   - [Method 1: Automated GitHub Actions (Recommended)](#method-1-automated-github-actions-recommended)
   - [Method 2: 1-Command CLI Deployment (gh-pages)](#method-2-1-command-cli-deployment-gh-pages)
   - [Supabase Cloud Configuration for GitHub Pages](#supabase-cloud-configuration-for-github-pages)
5. [Azure Deployment Master Guide](#5-azure-deployment-master-guide)
   - [Method 1: Azure Static Web Apps (Recommended for Azure)](#method-1-azure-static-web-apps-recommended-for-azure)
   - [Method 2: Azure App Service (Linux Web App)](#method-2-azure-app-service-linux-web-app)
   - [Method 3: Azure Container Apps (ACA) & Container Registry (ACR)](#method-3-azure-container-apps-aca--container-registry-acr)
   - [Method 4: Azure Blob Storage + Azure Front Door CDN](#method-4-azure-blob-storage--azure-front-door-cdn)
6. [Other Production Hosting Targets](#6-other-production-hosting-targets)
   - [Option A: Vercel](#option-a-vercel)
   - [Option B: Netlify](#option-b-netlify)
   - [Option C: Docker & Nginx Self-Hosted](#option-c-docker--nginx-self-hosted)
   - [Option D: AWS S3 + CloudFront](#option-d-aws-s3--cloudfront)
   - [Option E: Cloudflare Pages](#option-e-cloudflare-pages)
7. [SPA Routing & Rewrite Rules Matrix](#7-spa-routing--rewrite-rules-matrix)
8. [Post-Deployment Verification & Health Checks](#8-post-deployment-verification--health-checks)
9. [Security & Production Readiness Checklist](#9-security--production-readiness-checklist)

---

## 1. Production Architecture Overview

The platform uses a decoupled, cloud-native architecture:
- **Frontend Layer**: Client-side Single Page Application (SPA) built with React 19, TypeScript, and Vite, served via global CDN edges with HTTPS/TLS 1.3 and immutable asset caching.
- **Backend & Database Layer**: Managed **Supabase Cloud** (Enterprise PostgreSQL, Supabase Auth service, Realtime WebSocket replication, and S3-compatible Object Storage).
- **Resilience Layer**: LocalStorage fallback caching engine ensuring zero-downtime offline functionality during network blips.

```text
                           [ Users / Clients / Staff ]
                                        │
                                        │ (HTTPS / TLS 1.3)
                                        ▼
                     ┌──────────────────────────────────────┐
                     │    Global Edge CDN & Ingress         │
                     │  (Azure SWA / Front Door / Vercel)   │
                     └──────────────────┬───────────────────┘
                                        │
                         ┌──────────────┴──────────────┐
                         ▼                             ▼
                 [ Static SPA Assets ]         [ API / WebSocket ]
                 (HTML / CSS / JS / Assets)            │
                                                       ▼
                                             [ Supabase Cloud ]
                                        ┌──────────────────────────────┐
                                        │ ├── PostgreSQL 15+ (Tables)  │
                                        │ ├── Supabase Auth (JWT / OTP)│
                                        │ ├── Supavisor (Conn Pooler)  │
                                        │ ├── Realtime CDC (WebSockets)│
                                        │ └── Storage (Attachments)    │
                                        └──────────────────────────────┘
```

---

## 2. Environment Variables Reference

Configure these variables in your hosting platform (Azure App Settings, Vercel/Netlify Environment Variables, or Docker `.env`):

| Variable | Required | Description | Example |
| :--- | :---: | :--- | :--- |
| `VITE_SUPABASE_URL` | **Yes** | Public REST/GraphQL endpoint of your Supabase project | `https://xyzproject.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | **Yes** | Public Anonymous API key for client-side Auth & queries | `eyJhbGciOi...` |
| `DATABASE_URL` | Migrations Only | Direct/Pooled PostgreSQL connection string for migrations | `postgresql://postgres.[ref]:[pass]@aws-0-[region].pooler.supabase.com:6543/postgres` |
| `SUPABASE_SERVICE_ROLE_KEY` | Backend Only | Secret master key for elevated administration tasks (DO NOT expose in client) | `eyJhbGciOi...` |
| `GEMINI_API_KEY` | Optional | API key for optional AI assistance features | `AIzaSy...` |
| `APP_URL` | Optional | Production canonical URL | `https://servicecore.yourcompany.com` |

---

## 3. Deep-Dive Supabase Cloud Setup

### 3.1 Create Project & Region Selection
1. Navigate to the [Supabase Cloud Dashboard](https://supabase.com/dashboard) and sign in.
2. Click **New Project** and configure:
   - **Name**: `servicecore-csmp-prod`
   - **Database Password**: Generate and securely store a 20+ character password in your secrets manager (e.g. Azure Key Vault / 1Password).
   - **Region**: Choose a region close to your primary enterprise users (e.g., `East US (Virginia)`, `West Europe (Frankfurt)`, `Southeast Asia (Singapore)`).
   - **Pricing Plan**: Free (for staging) or Pro/Enterprise (for production automated backups & SLA).
3. Once provisioned, navigate to **Project Settings > API** and copy:
   - **Project URL** (`https://[project-ref].supabase.co`) -> `VITE_SUPABASE_URL`
   - **Project API Anon Key** (`eyJ...`) -> `VITE_SUPABASE_ANON_KEY`

---

### 3.2 Provision Schema & Seed Database
The complete schema definition, table indexes, default permissions, and seed personas are contained in [`supabase/schema.sql`](./supabase/schema.sql).

#### Method A: Run via Supabase Web SQL Editor (Recommended)
1. In the Supabase Dashboard left menu, click **SQL Editor**.
2. Click **New Query**.
3. Copy the contents of [`supabase/schema.sql`](./supabase/schema.sql) and paste it into the editor.
4. Click **Run**.
5. Verify in the **Table Editor** that the following tables are populated:
   - `csmp_users` (Platform accounts, roles, company details, holding account balances)
   - `csmp_requests` (Support tickets, wire/SEPA deposit requests, and withdrawal orders)
   - `csmp_role_permissions` (Role access rules for admin, operator, client)
   - `csmp_notifications` (Real-time user alerts)
   - `csmp_audit_logs` (Audit trails)

#### Method B: Automated CLI Migration Runner
Set your production connection string and run:
```bash
export DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres"
npm run db:migrate
```

---

### 3.3 Production Connection Pooling (Supavisor)
For high-concurrency production deployments:
1. Go to **Project Settings > Database > Connection Pooling Configuration**.
2. **Pool Mode**: Select `Transaction` for standard stateless queries.
3. Use the **Connection String (Port 6543)** for application migrations and serverless connections to prevent database connection exhaustion.

---

### 3.4 Supabase Authentication & Custom SMTP Setup

#### 1. Site URL & Redirect Whitelisting
1. In the Supabase Dashboard, go to **Authentication > URL Configuration**.
2. Set **Site URL** to your primary domain (e.g., `https://servicecore.yourcompany.com` or your `*.azurestaticapps.net` URL).
3. Under **Redirect URLs**, add:
   - `https://servicecore.yourcompany.com/**`
   - `https://servicecore.yourcompany.com`
   - `http://localhost:3000` (for local development)

#### 2. Configure Production SMTP Provider
By default, Supabase sends up to 30 emails/hour on shared IPs. For enterprise production, configure custom SMTP:
1. Go to **Authentication > SMTP Settings**.
2. Toggle **Enable Custom SMTP**.
3. Fill in credentials from your enterprise mail provider (SendGrid, AWS SES, Resend, or Postmark):
   - **Sender Email**: `support@yourcompany.com`
   - **Sender Name**: `ServiceCore Platform`
   - **Host**: `smtp.sendgrid.net` (or `smtp.resend.com`)
   - **Port**: `587`
   - **User**: `apikey` (or username)
   - **Password**: `[Your-API-Key]`
4. Click **Save**.

#### 3. Custom Email Templates
Under **Authentication > Email Templates**, customize:
- **Confirm Signup**: Welcome email with activation link.
- **Magic Link**: One-time secure passwordless sign-in token.
- **Reset Password**: Password recovery link.

---

### 3.5 Enable Realtime Replication
To enable live UI updates when operators or clients update tickets:
1. In Supabase Dashboard, go to **Database > Replication**.
2. Under **supabase_realtime** publication, ensure the following tables are enabled:
   - `csmp_requests` (Live ticket comments, status transitions)
   - `csmp_notifications` (Instant push notification badges)
   - `csmp_audit_logs` (Live compliance stream)

---

### 3.6 Storage Buckets & Attachment Policies
1. Go to **Storage > New Bucket**.
2. Create a bucket named `csmp-attachments`.
3. Set bucket to **Private** (or Public for avatar CDN).
4. Add RLS policy:
   ```sql
   -- Allow authenticated users to upload attachments
   CREATE POLICY "Authenticated users can upload attachments"
   ON storage.objects FOR INSERT
   WITH CHECK (auth.role() = 'authenticated');

   -- Allow users to read attachments
   CREATE POLICY "Authenticated users can view attachments"
   ON storage.objects FOR SELECT
   USING (auth.role() = 'authenticated');
   ```

---

### 3.7 Database Backups & PITR
- On Supabase Pro/Enterprise, daily automated backups are enabled by default.
- For financial holding operations, navigate to **Project Settings > Database > Point in time recovery** and enable **PITR** (up to 7–28 days recovery).

---

## 4. GitHub Pages Deployment Master Guide

GitHub Pages is a fast, zero-cost static hosting solution directly integrated into your GitHub repository. The application is pre-configured with `base: './'` in `vite.config.ts` and an automated SPA routing fallback [`public/404.html`](./public/404.html).

---

### Method 1: Automated GitHub Actions (Recommended)

The repository includes a ready-to-use GitHub Actions workflow in [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml) that builds and deploys the app on every push to `main`.

#### Step 1: Configure Repository Secrets
1. Navigate to your repository on GitHub.
2. Go to **Settings > Secrets and variables > Actions**.
3. Click **New repository secret** and add:
   - `VITE_SUPABASE_URL`: Your Supabase Cloud project URL (e.g. `https://xyzproject.supabase.co`)
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase Cloud Anon key (`eyJ...`)
   - `GEMINI_API_KEY`: *(Optional)* Your Gemini AI key

#### Step 2: Enable GitHub Pages in Repository Settings
1. In your GitHub repository, navigate to **Settings > Pages** (in the left sidebar).
2. Under **Build and deployment > Source**, select **GitHub Actions** from the dropdown.

#### Step 3: Trigger Deployment
1. Push any commit to your `main` branch (or go to the **Actions** tab, select **Deploy to GitHub Pages**, and click **Run workflow**).
2. The workflow will automatically install dependencies, build the Vite app with your Supabase secrets, generate `404.html`, and deploy to GitHub Pages.
3. Your live application will be published at:
   ```text
   https://<your-github-username>.github.io/<repository-name>/
   ```

---

### Method 2: 1-Command CLI Deployment (`gh-pages`)

If you prefer deploying directly from your local terminal:

1. Create a `.env.production` file (or export environment variables):
   ```env
   VITE_SUPABASE_URL="https://your-project.supabase.co"
   VITE_SUPABASE_ANON_KEY="your-anon-key"
   ```

2. Run the single deployment command:
   ```bash
   npm run deploy
   ```
   *(This automatically executes `npm run build` and pushes the production `dist/` directory to the `gh-pages` branch).*

3. On GitHub, go to **Settings > Pages**, choose **Deploy from a branch > `gh-pages` > `/ (root)`**, and click **Save**.

---

### Supabase Cloud Configuration for GitHub Pages

To ensure authentication and real-time features work seamlessly on GitHub Pages:

1. Open your [Supabase Cloud Dashboard](https://supabase.com/dashboard).
2. Navigate to **Authentication > URL Configuration**.
3. Set **Site URL** to your GitHub Pages URL:
   ```text
   https://<your-github-username>.github.io/<repository-name>/
   ```
4. Add the following entries to **Redirect URLs**:
   - `https://<your-github-username>.github.io/<repository-name>/**`
   - `https://<your-github-username>.github.io/<repository-name>/`
   - `http://localhost:3000` (for local development)
5. Click **Save**.

---

## 5. Azure Deployment Master Guide

Azure provides multiple reliable hosting options for Single Page Applications (SPAs).

---

### Method 1: Azure Static Web Apps (Recommended for Azure)

**Azure Static Web Apps (SWA)** is the optimal, cost-effective hosting choice for Vite + React applications on Azure, offering global CDN distribution, automatic GitHub Actions CI/CD, free SSL certificates, and custom domain mapping.

#### Step 1: Push Repository to GitHub
Ensure all code including [`staticwebapp.config.json`](./staticwebapp.config.json) is committed:
```bash
git add .
git commit -m "Configure Azure Static Web App deployment"
git push origin main
```

#### Step 2: Create Azure Static Web App via Azure Portal
1. Open the [Azure Portal](https://portal.azure.com/).
2. In the search bar, search for **Static Web Apps** and click **Create**.
3. Fill in the **Basics** tab:
   - **Subscription**: Your Azure Subscription
   - **Resource Group**: Create new or select existing (e.g. `rg-servicecore-prod`)
   - **Name**: `swa-servicecore-prod`
   - **Plan type**: **Free** (or **Standard** for enterprise SLAs & private endpoints)
   - **Region**: Choose closest region (e.g., `East US 2` or `West Europe`)
   - **Deployment source**: Select **GitHub** and authorize your account.
4. Fill in **Build Details**:
   - **Build Presets**: Select `Custom` (or `Vite`)
   - **App location**: `/`
   - **Api location**: Leave empty
   - **Output location**: `dist`
5. Click **Review + Create**, then click **Create**.

#### Step 3: Configure Environment Variables in GitHub & Azure
1. In your GitHub Repository, go to **Settings > Secrets and variables > Actions**.
2. Under **Repository secrets**, ensure the following secrets are added:
   - `VITE_SUPABASE_URL`: `https://[your-project-ref].supabase.co`
   - `VITE_SUPABASE_ANON_KEY`: `[your-supabase-anon-key]`
   - `GEMINI_API_KEY`: *(Optional)* `[your-gemini-api-key]`
3. In your Azure Static Web Apps GitHub Actions workflow (`.github/workflows/azure-static-web-apps-*.yml`), ensure the `env:` block passes these secrets to the `Azure/static-web-apps-deploy@v1` build step:
   ```yaml
   env:
     VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
     VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
     GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
   ```
4. *(Optional for Backend / API)* In Azure Portal, you can also set these under **Static Web App > Environment variables** for any Azure Functions backend endpoints.
5. Push a commit or re-run the workflow to build the app with your live Supabase credentials baked in.

#### Step 4: Custom Domain & Free SSL
1. In your Static Web App, navigate to **Custom domains**.
2. Click **+ Add > Custom domain on other DNS**.
3. Enter your domain (e.g. `servicecore.yourcompany.com`).
4. Add the provided CNAME record in your DNS provider (Cloudflare, GoDaddy, Azure DNS).
5. Azure automatically issues and auto-renews a free TLS/SSL certificate.

> [!NOTE]
> The included [`staticwebapp.config.json`](./staticwebapp.config.json) file automatically configures fallback routing to `/index.html`, asset cache headers, and strict security headers (`X-Frame-Options`, `X-Content-Type-Options`).

---

### Method 2: Azure App Service (Linux Web App)

For enterprise scenarios requiring deployment within Azure Virtual Networks (VNet) or dedicated App Service Plans:

#### Step 1: Deploy using Azure CLI
```bash
# 1. Login to Azure
az login

# 2. Create Resource Group
az group create --name rg-servicecore-prod --location eastus

# 3. Create Linux App Service Plan
az appservice plan create \
  --name plan-servicecore \
  --resource-group rg-servicecore-prod \
  --sku B1 \
  --is-linux

# 4. Create Web App with Node 20 runtime
az webapp create \
  --resource-group rg-servicecore-prod \
  --plan plan-servicecore \
  --name app-servicecore-prod \
  --runtime "NODE:20-lts"
```

#### Step 2: Configure Environment Variables
```bash
az webapp config appsettings set \
  --resource-group rg-servicecore-prod \
  --name app-servicecore-prod \
  --settings \
    VITE_SUPABASE_URL="https://[your-project-ref].supabase.co" \
    VITE_SUPABASE_ANON_KEY="[your-anon-key]" \
    NODE_ENV="production"
```

#### Step 3: Deploy Build Artifacts
```bash
# Build locally
npm run build

# Deploy dist folder
az webapp deploy \
  --resource-group rg-servicecore-prod \
  --name app-servicecore-prod \
  --src-path dist \
  --type static
```

---

### Method 3: Azure Container Apps (ACA) & Container Registry (ACR)

For containerized microservices or Kubernetes deployments:

#### Step 1: Create Azure Container Registry (ACR)
```bash
az acr create \
  --resource-group rg-servicecore-prod \
  --name acrservicecoreprod \
  --sku Basic \
  --admin-enabled true
```

#### Step 2: Build and Push Docker Image
```bash
# Build container image using the included Dockerfile
az acr build \
  --registry acrservicecoreprod \
  --image servicecore-csmp:v1.0 .
```

#### Step 3: Deploy to Azure Container Apps
```bash
# Create ACA Environment
az containerapp env create \
  --name env-servicecore \
  --resource-group rg-servicecore-prod \
  --location eastus

# Deploy Container App
az containerapp create \
  --name csmp-web \
  --resource-group rg-servicecore-prod \
  --environment env-servicecore \
  --image acrservicecoreprod.azurecr.io/servicecore-csmp:v1.0 \
  --target-port 80 \
  --ingress external \
  --query properties.configuration.ingress.fqdn
```

---

### Method 4: Azure Blob Storage + Azure Front Door CDN

For high-throughput, low-cost static hosting on Azure:

1. **Create Storage Account & Enable Static Website**:
   ```bash
   az storage account create \
     --name stservicecoreprod \
     --resource-group rg-servicecore-prod \
     --location eastus \
     --sku Standard_ZRS

   az storage blob service-properties update \
     --account-name stservicecoreprod \
     --static-website \
     --index-document index.html \
     --404-document index.html
   ```

2. **Upload Build Files**:
   ```bash
   npm run build
   az storage blob upload-batch \
     --account-name stservicecoreprod \
     --source dist \
     --destination '$web' \
     --overwrite
   ```

3. **Attach Azure Front Door CDN**:
   - Create an **Azure Front Door Standard/Premium** profile.
   - Set endpoint origin to the Storage `$web` hostname.
   - Configure a URL Rewrite rule to redirect missing routes to `/index.html`.

---

## 5. Other Production Hosting Targets

### Option A: Vercel
1. Import repository to [Vercel](https://vercel.com).
2. Set Environment Variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
3. The included [`vercel.json`](./vercel.json) handles zero-configuration SPA routing and asset caching.

### Option B: Netlify
1. Import repository to [Netlify](https://netlify.com).
2. Set Environment Variables in Site Settings.
3. The included [`netlify.toml`](./netlify.toml) configures build and redirect rules automatically.

### Option C: Docker & Nginx Self-Hosted
Use the included multi-stage [`Dockerfile`](./Dockerfile) and [`nginx.conf`](./nginx.conf):
```bash
docker build -t servicecore-csmp:latest .
docker run -d -p 80:80 \
  -e VITE_SUPABASE_URL="https://xyz.supabase.co" \
  -e VITE_SUPABASE_ANON_KEY="eyJ..." \
  --name servicecore-prod \
  servicecore-csmp:latest
```

### Option D: AWS S3 + CloudFront
1. `npm run build`
2. `aws s3 sync dist/ s3://servicecore-production-bucket --delete`
3. Create CloudFront distribution with S3 origin and Custom Error Response (404 -> 200 -> `/index.html`).

### Option E: Cloudflare Pages
1. Connect GitHub repository to **Cloudflare Pages**.
2. Framework: `Vite`, Build: `npm run build`, Output: `dist`.
3. Add environment variables.

---

## 6. SPA Routing & Rewrite Rules Matrix

To prevent `404 Not Found` errors when users refresh deep URLs, the appropriate rewrite rules are pre-configured:

| Provider | Configuration File | Implementation |
| :--- | :--- | :--- |
| **Azure SWA** | [`staticwebapp.config.json`](./staticwebapp.config.json) | `"navigationFallback": { "rewrite": "/index.html" }` |
| **Vercel** | [`vercel.json`](./vercel.json) | `"rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]` |
| **Netlify** | [`netlify.toml`](./netlify.toml) | `[[redirects]] from = "/*" to = "/index.html" status = 200` |
| **Nginx / Docker** | [`nginx.conf`](./nginx.conf) | `try_files $uri $uri/ /index.html;` |

---

## 7. Post-Deployment Verification & Health Checks

After deploying, run through this verification checklist:

1. **Supabase Connectivity**: Verify that the status indicator in the top navbar displays a green **Supabase Connected** badge.
2. **Authentication**: Log in with administrator account `sarah.connor@servicecore.io` (`Password123!`).
3. **User Governance**: Navigate to **User Governance & Client CRM Directory** and test the List layout, Role dropdown, and User Deletion dialog.
4. **Ticket Submission**: Submit a new technical support ticket and verify live comment threads.
5. **Holding Fund Operations**: Submit a $50,000 wire deposit request and approve it as Lin Chen or Sarah Connor.
6. **Audit Trail**: Confirm that all actions are recorded in the **Audit Trail** log viewer.
7. **Theme Persistence**: Toggle between Dark Mode and Light Mode and refresh the page to verify persistent settings.

---

## 8. Security & Production Readiness Checklist

- [x] **Enforce HTTPS / TLS 1.3**: All traffic strictly encrypted.
- [x] **Row Level Security (RLS)**: Verified active on all Supabase tables.
- [x] **Public Anon Key Safety**: Secret `SUPABASE_SERVICE_ROLE_KEY` is never bundled into client code.
- [x] **Self-Deletion Guardrails**: Active logged-in users cannot delete their own administrator account.
- [x] **HTTP Security Headers**: `X-Frame-Options`, `X-Content-Type-Options`, and `Referrer-Policy` enabled.
- [x] **Asset Caching**: 1-year immutable caching on hashed static assets (`/assets/*`).
- [x] **Automated Database Backups**: Configured in Supabase Cloud settings.
- [x] **CORS & Domain Whitelisting**: Supabase Auth Site URL configured to match production domain.
