# Multi-Subdomain Architecture Design

**Date:** 2026-09-07
**Status:** Draft
**Domain:** egraminservices.com

---

## 1. Overview

Split the current single-SPA deployment into three independent subdomains, each serving a focused purpose:

| Subdomain | Purpose |
|-----------|---------|
| `egraminservices.com` | Landing page (marketing, features, pricing) |
| `auth.egraminservices.com` | Authentication only (login, signup, password reset) |
| `app.egraminservices.com` | Dashboard application (authenticated admin panel) |

Infrastructure: Azure Front Door + 3 Azure Static Web Apps. Monorepo with Turborepo.

---

## 2. Monorepo Structure

```
egspl/
├── apps/
│   ├── landing/              # egraminservices.com
│   │   ├── src/
│   │   │   ├── App.tsx       # Landing routes
│   │   │   ├── pages/        # Home, Pricing, Contact
│   │   │   └── main.tsx
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   ├── package.json
│   │   └── .env
│   ├── auth/                 # auth.egraminservices.com
│   │   ├── src/
│   │   │   ├── App.tsx       # Auth routes
│   │   │   ├── pages/        # Login, Signup, ForgotPassword, ResetPassword
│   │   │   ├── components/   # Auth forms
│   │   │   └── main.tsx
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   ├── package.json
│   │   └── .env
│   └── dashboard/            # app.egraminservices.com
│       ├── src/              # Current codebase moves here
│       │   ├── App.tsx       # Dashboard routes (no login/signup)
│       │   ├── components/
│       │   ├── pages/
│       │   └── main.tsx
│       ├── index.html
│       ├── vite.config.ts
│       ├── package.json
│       └── .env
├── packages/
│   ├── ui/                   # Shared UI components (buttons, forms, modals)
│   ├── config/               # Shared Vite, TS, ESLint configs
│   └── supabase/             # Supabase client, types, auth hooks, session utils
├── turbo.json
├── package.json              # Root workspace
├── pnpm-workspace.yaml
└── pnpm-lock.yaml
```

---

## 3. Routing

### Landing (`egraminservices.com`)

| Path | Component |
|------|-----------|
| `/` | Hero + features |
| `/pricing` | Pricing page |
| `/contact` | Contact form |
| `/login` | Redirect → `auth.egraminservices.com/login` |
| `/signup` | Redirect → `auth.egraminservices.com/signup` |

### Auth (`auth.egraminservices.com`)

| Path | Component |
|------|-----------|
| `/login` | Login form |
| `/signup` | Signup form |
| `/forgot-password` | Password reset request |
| `/reset-password` | Password reset form (token in URL) |
| `/auth/callback` | Supabase auth callback handler |

### Dashboard (`app.egraminservices.com`)

| Path | Component |
|------|-----------|
| `/` | Dashboard home (role-based) |
| `/admin/*` | Admin panel |
| `/vendor/*` | Vendor views |
| `/settings/*` | Settings |
| `/commission/*` | Commission calculator |
| `/requests/*` | Request management |
| `/*` | Catch-all → redirect to `/` |

---

## 4. Cross-Subdomain Session Sharing

**Approach:** Supabase session stored via parent-domain cookie (`.egraminservices.com`).

### Flow

1. User authenticates on `auth.egraminservices.com`
2. Supabase issues session tokens
3. Auth app calls `supabase.auth.setSession()` with cookie options:
   ```ts
   cookieOptions: {
     domain: '.egraminservices.com',
     path: '/',
     secure: true,
     sameSite: 'lax',
   }
   ```
4. Session cookie is set on `.egraminservices.com` (accessible to all subdomains)
5. Auth app redirects to `app.egraminservices.com/`
6. Dashboard app reads session from cookie on load
7. Supabase client initializes with existing session

### Logout

- Clear the session cookie from `.egraminservices.com`
- Redirect to `egraminservices.com`

---

## 5. Environment Variables

### Landing (`apps/landing/.env`)

```
VITE_APP_URL=https://egraminservices.com
VITE_AUTH_URL=https://auth.egraminservices.com
VITE_DASHBOARD_URL=https://app.egraminservices.com
```

### Auth (`apps/auth/.env`)

```
VITE_APP_URL=https://auth.egraminservices.com
VITE_AUTH_URL=https://auth.egraminservices.com
VITE_DASHBOARD_URL=https://app.egraminservices.com
VITE_SUPABASE_URL=<supabase-url>
VITE_SUPABASE_ANON_KEY=<supabase-anon-key>
```

### Dashboard (`apps/dashboard/.env`)

```
VITE_APP_URL=https://app.egraminservices.com
VITE_AUTH_URL=https://auth.egraminservices.com
VITE_DASHBOARD_URL=https://app.egraminservices.com
VITE_SUPABASE_URL=<supabase-url>
VITE_SUPABASE_ANON_KEY=<supabase-anon-key>
```

---

## 6. Supabase Configuration

| Setting | Value |
|---------|-------|
| Site URL | `https://app.egraminservices.com` |
| Redirect URLs | `https://auth.egraminservices.com/auth/callback`, `https://app.egraminservices.com/auth/callback` |

---

## 7. Shared Packages

### `packages/supabase`

- `client.ts` — Supabase client factory (accepts env vars)
- `auth.ts` — Auth helpers (login, signup, logout, session persistence with cookie)
- `types.ts` — Shared Supabase types
- `hooks.ts` — `useAuth()`, `useSession()` hooks

### `packages/ui`

- Shared buttons, inputs, modals, layout components
- Tailwind config shared across all apps

### `packages/config`

- `vite.ts` — Base Vite config (each app extends)
- `tsconfig.json` — Base TypeScript config
- `eslint.js` — Shared linting rules

---

## 8. Deployment

### Azure Resources

| Resource | Type | Purpose |
|----------|------|---------|
| Azure Front Door | CDN + Routing | Hostname-based routing |
| SWA: egspl-landing | Static Web App | Landing page |
| SWA: egspl-auth | Static Web App | Auth app |
| SWA: egspl-dashboard | Static Web App | Dashboard app |

### DNS (Azure DNS Zone - already configured)

| Record | Type | Value |
|--------|------|-------|
| `@` (root) | CNAME | Azure Front Door endpoint |
| `auth` | CNAME | Azure Front Door endpoint |
| `app` | CNAME | Azure Front Door endpoint |

### GitHub Actions CI/CD

Single workflow file (`.github/workflows/deploy.yml`) with three parallel jobs:

```yaml
jobs:
  deploy-landing:
    steps:
      - Checkout
      - pnpm install
      - pnpm --filter landing build
      - Deploy to SWA: egspl-landing

  deploy-auth:
    steps:
      - Checkout
      - pnpm install
      - pnpm --filter auth build
      - Deploy to SWA: egspl-auth

  deploy-dashboard:
    steps:
      - Checkout
      - pnpm install
      - pnpm --filter dashboard build
      - Deploy to SWA: egspl-dashboard
```

### Azure Front Door Routing Rules

| Hostname | Origin |
|----------|--------|
| `egraminservices.com` | SWA landing |
| `auth.egraminservices.com` | SWA auth |
| `app.egraminservices.com` | SWA dashboard |

---

## 9. Migration Steps

1. Initialize monorepo structure (pnpm workspaces + Turborepo)
2. Create `packages/` (supabase, ui, config)
3. Move current code into `apps/dashboard/`
4. Create `apps/auth/` (extract login, signup, callback from dashboard)
5. Create `apps/landing/` (new React app)
6. Update Supabase client to use cookie-based session sharing
7. Update auth flow across subdomains
8. Configure Azure Front Door + 3 SWA instances
9. Set up GitHub Actions CI/CD
10. Test cross-subdomain auth flow end-to-end

---

## 10. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Cookie not shared across subdomains | Use `.egraminservices.com` domain; test in all browsers |
| Supabase token refresh fails on different subdomain | Ensure cookie contains refresh token; test refresh flow |
| Azure Front Door latency | Configure caching rules; monitor performance |
| Build complexity increases | Turborepo caching; CI/CD parallel jobs |
| Shared component drift | Single source of truth in `packages/` |
