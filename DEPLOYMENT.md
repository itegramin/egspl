# 🚀 Azure Static Web Apps Deployment & Operations Guide

This guide details how to deploy and operate the **E-Gramin Client Service Management Platform (CSMP)** on **Microsoft Azure Static Web Apps (SWA)** using **GitHub Actions**.

---

## 📑 Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Prerequisites & Resources](#2-prerequisites--resources)
3. [Environment Variables & Secrets](#3-environment-variables--secrets)
4. [GitHub Actions CI/CD Pipeline](#4-github-actions-cicd-pipeline)
5. [Azure SWA Configuration (staticwebapp.config.json)](#5-azure-swa-configuration-staticwebappconfigjson)
6. [Supabase Cloud Production Setup](#6-supabase-cloud-production-setup)
7. [Custom Domains & SSL Certificates](#7-custom-domains--ssl-certificates)
8. [Post-Deployment Verification & Health Checks](#8-post-deployment-verification--health-checks)
9. [Troubleshooting & Common Issues](#9-troubleshooting--common-issues)

---

## 1. Architecture Overview

The production architecture leverages a decoupled cloud-native stack:

```text
       [ Users / Kiosk CSPs / Admins ]
                      │
                      │ (HTTPS / TLS 1.3)
                      ▼
    ┌───────────────────────────────────┐
    │     Azure Static Web Apps         │
    │  - Global Edge CDN Ingress        │
    │  - Immutable Asset Caching        │
    │  - SPA HTML5 Navigation Fallback  │
    │  - Security & CSP Headers         │
    └─────────────────┬─────────────────┘
                      │
        ┌─────────────┴─────────────┐
        ▼                           ▼
[ Static Assets / SPA ]     [ Database / Auth ]
(React 19 + Vite Dist)              │
                                    ▼
                         ┌───────────────────────┐
                         │    Supabase Cloud     │
                         │ - PostgreSQL 15+      │
                         │ - Supabase Auth (JWT) │
                         │ - Realtime CDC engine │
                         │ - S3-compatible files │
                         └───────────────────────┘
```

---

## 2. Prerequisites & Resources

To deploy this application, you will need:
1. An active **Azure Subscription** ([portal.azure.com](https://portal.azure.com)).
2. An **Azure Static Web App** resource created in your resource group.
3. A **GitHub Repository** with admin permissions to configure Repository Secrets.
4. A **Supabase Cloud Project** ([supabase.com](https://supabase.com)).

---

## 3. Environment Variables & Secrets

Configure the following secrets in **GitHub > Repository Settings > Secrets and variables > Actions**:

| Secret Name | Required | Description | Example |
| :--- | :---: | :--- | :--- |
| `AZURE_STATIC_WEB_APPS_API_TOKEN_POLITE_FOREST_025553500` | **Yes (UAT)** | Deployment deployment token for the UAT Azure SWA instance | `abc123token...` |
| `AZURE_STATIC_WEB_APPS_API_TOKEN_NICE_OCEAN_0DF4CC600` | **Yes (Prod)** | Deployment token for the Production Azure SWA instance | `def456token...` |
| `VITE_SUPABASE_URL` | **Yes** | HTTPS endpoint of your Supabase project | `https://xyz.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | **Yes** | Public Anonymous API Key for browser Auth & queries | `eyJhbGciOi...` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Optional | Alias for `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOi...` |

> [!NOTE]
> Vite embeds variables prefixed with `VITE_` into client bundles at build time. Never place secret service role keys in `VITE_` variables.

---

## 4. GitHub Actions CI/CD Pipeline

The CI/CD workflow is located at [`.github/workflows/azure-static-web-apps.yml`](file:///.github/workflows/azure-static-web-apps.yml).

### Workflow Jobs & Triggers:
- **Job 1 (`deploy_uat`)**: Runs strictly on `push` to `uat`. Builds and deploys directly to the UAT Azure Static Web App using `AZURE_STATIC_WEB_APPS_API_TOKEN_POLITE_FOREST_025553500`.
- **Job 2 (`deploy_prod`)**: Runs on `pull_request` against `prod` (creates or updates a temporary staging preview environment) AND on `push` to `prod` (when a PR is merged into production for live release). Uses `AZURE_STATIC_WEB_APPS_API_TOKEN_NICE_OCEAN_0DF4CC600`.
- **Job 3 (`close_prod_pr`)**: Runs when a PR targeting `prod` is closed (or merged). Tells Azure Static Web Apps to destroy the temporary PR staging environment.

### Job Configuration Breakdown:
```yaml
# 1. UAT Push Deployment
deploy_uat:
  if: github.event_name == 'push' && github.ref == 'refs/heads/uat'
  ...
  azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN_POLITE_FOREST_025553500 }}

# 2. Production PR Preview & Live Release Deployment
deploy_prod:
  if: (github.event_name == 'pull_request' && github.base_ref == 'prod' && github.event.action != 'closed') || (github.event_name == 'push' && github.ref == 'refs/heads/prod')
  ...
  azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN_NICE_OCEAN_0DF4CC600 }}

# 3. Clean up PR Staging Environment
close_prod_pr:
  if: github.event_name == 'pull_request' && github.base_ref == 'prod' && github.event.action == 'closed'
  ...
  azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN_NICE_OCEAN_0DF4CC600 }}
  action: "close"
```

---

## 5. Azure SWA Configuration (`staticwebapp.config.json`)

Azure Static Web Apps reads [`staticwebapp.config.json`](file:///staticwebapp.config.json) at the root of the repository:

```json
{
  "navigationFallback": {
    "rewrite": "/index.html",
    "exclude": [
      "/assets/*",
      "/*.{png,jpg,jpeg,gif,svg,ico,json,css,js,webp}"
    ]
  },
  "routes": [
    {
      "route": "/assets/*",
      "headers": {
        "cache-control": "public, max-age=31536000, immutable"
      }
    }
  ],
  "globalHeaders": {
    "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
    "X-Frame-Options": "DENY",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
    "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https://images.unsplash.com https://*.supabase.co https://api.dicebear.com; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://generativelanguage.googleapis.com; frame-ancestors 'none'; object-src 'none'; base-uri 'self';"
  },
  "mimeTypes": {
    ".json": "text/json"
  },
  "responseOverrides": {
    "404": {
      "rewrite": "/index.html",
      "statusCode": 200
    }
  }
}
```

### Why this is critical:
- **`navigationFallback`**: Essential for Single Page Applications. Ensures routes like `/dashboard`, `/support`, and `/holding` rewrite to `/index.html` on browser refresh without returning 404s.
- **`immutable` asset caching**: Hashed Vite bundles in `/assets/*` are cached at the edge for 1 year (`31536000s`).
- **Security Headers**: HSTS, X-Frame-Options (blocks clickjacking), nosniff, and strict CSP preventing cross-site scripting (XSS).

---

## 6. Supabase Cloud Production Setup

1. **Authentication Configuration**:
   - In **Supabase Dashboard > Authentication > URL Configuration**:
     - Set **Site URL** to your Azure custom domain (e.g. `https://egramin.in` or `https://<app>.azurestaticapps.net`).
     - Add Redirect URLs: `https://<app>.azurestaticapps.net/**`, `http://localhost:3000/**`.
2. **Storage Bucket**:
   - Create bucket: `csmp-attachments` with public read access or signed URL policies for ticket uploads.
3. **Database Schema & RLS**:
   - Run `npm run db:migrate` or paste `supabase/schema.sql` into the Supabase SQL Editor.

---

## 7. Custom Domains & SSL Certificates

1. In the Azure Portal, open your Static Web App resource.
2. Under **Settings**, select **Custom domains**.
3. Click **+ Add**:
   - For apex domains (`egramin.in`), choose **Custom domain on Azure DNS** or configure an ALIAS/ANAME record with TXT validation.
   - For subdomains (`app.egramin.in`), add a `CNAME` pointing to your Azure default hostname.
4. Azure automatically provisions and auto-renews a free SSL/TLS certificate.

---

## 8. Post-Deployment Verification & Health Checks

Once deployed, verify:
- [ ] Root access: `https://<your-domain>/` loads the landing page.
- [ ] Direct route refresh: Navigating to `https://<your-domain>/dashboard` and hitting browser refresh preserves the route without 404 errors.
- [ ] Favicon loads cleanly: `/favicon.svg` and `/favicon.ico` return HTTP 200.
- [ ] Static asset headers: Inspect network tab on `/assets/*.js` to verify `cache-control: public, max-age=31536000, immutable`.
- [ ] Realtime connection: Inspect console network tab to confirm WebSocket connection to `wss://<project>.supabase.co/realtime/v1/websocket`.

---

## 9. Troubleshooting & Common Issues

| Issue | Cause | Solution |
| :--- | :--- | :--- |
| **Blank white screen on route refresh** | `base` was set to relative `./` in `vite.config.ts` | Verify `base: '/'` is set in `vite.config.ts`. |
| **Unexpected token `<` error in JS console** | Navigation fallback rewrote a missing script file to `index.html` | Ensure assets are compiled properly and excluded from fallback rewrites. |
| **Supabase write errors / env configuration error** | GitHub Actions secrets missing or mistyped | Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are saved in GitHub Repository Secrets. |
| **Deprecation warning in GitHub Actions** | Outdated checkout action | Ensure workflow uses `actions/checkout@v4`. |
