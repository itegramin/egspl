# Multi-Subdomain Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the current single-SPA deployment into three independent subdomains (landing, auth, dashboard) using a Turborepo monorepo with Azure Front Door routing.

**Architecture:** Turborepo monorepo with three Vite+React apps (`apps/landing`, `apps/auth`, `apps/dashboard`) sharing packages (`packages/supabase`, `packages/ui`, `packages/config`). Cross-subdomain session sharing via Supabase cookie on `.egraminservices.com`. Azure Front Door routes by hostname to three Azure Static Web Apps.

**Tech Stack:** pnpm workspaces, Turborepo, Vite 6, React 19, TypeScript 5.8, Tailwind CSS 4, Supabase Auth, Azure Static Web Apps, Azure Front Door, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-09-07-multi-subdomain-architecture-design.md`

## Global Constraints

- Node >= 20, pnpm >= 9
- Vite 6, React 19, TypeScript 5.8
- Tailwind CSS 4 (via `@tailwindcss/vite`)
- Supabase JS v2.112+
- Azure Static Web Apps deployment via `Azure/static-web-apps-deploy@v1`
- All env vars prefixed with `VITE_`
- Domain: `.egraminservices.com` for cross-subdomain cookies

---

## File Structure

### New Files

| File | Purpose |
|------|---------|
| `pnpm-workspace.yaml` | pnpm workspace definition |
| `turbo.json` | Turborepo pipeline config |
| `package.json` | Root workspace package.json (updated) |
| `packages/supabase/package.json` | Shared Supabase package |
| `packages/supabase/src/client.ts` | Supabase client factory with cookie config |
| `packages/supabase/src/auth.ts` | Auth helpers (login, signup, logout, session) |
| `packages/supabase/src/types.ts` | Re-export Supabase types |
| `packages/supabase/src/hooks.ts` | `useAuth()`, `useSession()` hooks |
| `packages/supabase/src/index.ts` | Package barrel export |
| `packages/supabase/tsconfig.json` | TypeScript config |
| `packages/ui/package.json` | Shared UI components package |
| `packages/ui/src/index.ts` | UI package barrel export |
| `packages/ui/tsconfig.json` | TypeScript config |
| `packages/config/package.json` | Shared configs package |
| `packages/config/vite.ts` | Base Vite config factory |
| `packages/config/tsconfig.json` | Base TypeScript config |
| `packages/config/eslint.js` | Shared ESLint config |
| `packages/config/index.ts` | Config package barrel export |
| `apps/landing/package.json` | Landing page package |
| `apps/landing/index.html` | Landing page HTML entry |
| `apps/landing/vite.config.ts` | Landing Vite config |
| `apps/landing/tsconfig.json` | Landing TypeScript config |
| `apps/landing/src/main.tsx` | Landing React entry |
| `apps/landing/src/App.tsx` | Landing routes |
| `apps/landing/src/pages/HomePage.tsx` | Hero + features |
| `apps/landing/src/pages/PricingPage.tsx` | Pricing page |
| `apps/landing/src/pages/ContactPage.tsx` | Contact form |
| `apps/landing/src/components/Header.tsx` | Landing header/nav |
| `apps/landing/src/components/Footer.tsx` | Landing footer |
| `apps/landing/.env.example` | Landing env vars |
| `apps/auth/package.json` | Auth app package |
| `apps/auth/index.html` | Auth app HTML entry |
| `apps/auth/vite.config.ts` | Auth Vite config |
| `apps/auth/tsconfig.json` | Auth TypeScript config |
| `apps/auth/src/main.tsx` | Auth React entry |
| `apps/auth/src/App.tsx` | Auth routes |
| `apps/auth/src/pages/LoginPage.tsx` | Login form |
| `apps/auth/src/pages/SignupPage.tsx` | Signup form |
| `apps/auth/src/pages/ForgotPasswordPage.tsx` | Password reset request |
| `apps/auth/src/pages/ResetPasswordPage.tsx` | Password reset form |
| `apps/auth/src/pages/AuthCallbackPage.tsx` | Supabase auth callback |
| `apps/auth/src/components/AuthLayout.tsx` | Shared auth layout |
| `apps/auth/.env.example` | Auth env vars |
| `apps/dashboard/package.json` | Dashboard package (moved from root) |
| `apps/dashboard/index.html` | Dashboard HTML entry (moved) |
| `apps/dashboard/vite.config.ts` | Dashboard Vite config |
| `apps/dashboard/tsconfig.json` | Dashboard TypeScript config |
| `apps/dashboard/src/main.tsx` | Dashboard React entry (updated) |
| `apps/dashboard/src/App.tsx` | Dashboard routes (updated) |
| `apps/dashboard/.env.example` | Dashboard env vars |
| `.github/workflows/deploy.yml` | Updated CI/CD for monorepo |

### Modified Files

| File | Change |
|------|--------|
| `package.json` | Convert to workspace root, add Turborepo |
| `src/lib/supabase.ts` | Move to `packages/supabase/src/client.ts`, add cookie domain config |
| `src/context/AuthContext.tsx` | Move to `packages/supabase/src/hooks.ts`, update imports |
| `src/components/auth/AuthScreen.tsx` | Move to `apps/auth/src/pages/LoginPage.tsx` (simplified) |
| `src/components/home/HomePage.tsx` | Move to `apps/landing/src/pages/HomePage.tsx` (marketing version) |

---

## Task 1: Initialize Monorepo Structure

**Files:**
- Create: `pnpm-workspace.yaml`
- Create: `turbo.json`
- Modify: `package.json` (root)

**Interfaces:**
- Consumes: None (foundation task)
- Produces: Working pnpm workspace with Turborepo

- [ ] **Step 1: Create pnpm-workspace.yaml**

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

- [ ] **Step 2: Create turbo.json**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "clean": {
      "cache": false
    }
  }
}
```

- [ ] **Step 3: Update root package.json**

Replace the root `package.json` with a workspace root:

```json
{
  "name": "egspl",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "lint": "turbo lint",
    "clean": "turbo clean"
  },
  "devDependencies": {
    "turbo": "^2.4.0",
    "typescript": "~5.8.2"
  },
  "packageManager": "pnpm@9.15.0"
}
```

- [ ] **Step 4: Install pnpm and run install**

```bash
corepack enable
corepack prepare pnpm@9.15.0 --activate
pnpm install
```

- [ ] **Step 5: Commit**

```bash
git add pnpm-workspace.yaml turbo.json package.json
git commit -m "chore: initialize Turborepo monorepo structure"
```

---

## Task 2: Create Shared `packages/config`

**Files:**
- Create: `packages/config/package.json`
- Create: `packages/config/vite.ts`
- Create: `packages/config/tsconfig.json`
- Create: `packages/config/eslint.js`
- Create: `packages/config/index.ts`

**Interfaces:**
- Consumes: None
- Produces: `defineAppViteConfig()`, `tsconfigBase`, shared ESLint config

- [ ] **Step 1: Create `packages/config/package.json`**

```json
{
  "name": "@egspl/config",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "index.ts",
  "devDependencies": {
    "@tailwindcss/vite": "^4.1.14",
    "@vitejs/plugin-react": "^5.0.4",
    "tailwindcss": "^4.1.14",
    "vite": "^6.2.3"
  }
}
```

- [ ] **Step 2: Create `packages/config/vite.ts`**

```ts
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, UserConfig } from 'vite';

export function defineAppViteConfig(options?: { alias?: Record<string, string> }): UserConfig {
  return defineConfig({
    base: '/',
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        ...options?.alias,
      },
    },
    build: {
      chunkSizeWarningLimit: 1200,
    },
  });
}
```

- [ ] **Step 3: Create `packages/config/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "esModuleInterop": true
  },
  "include": ["src"]
}
```

- [ ] **Step 4: Create `packages/config/eslint.js`**

```js
// Placeholder — add ESLint rules as needed
module.exports = {};
```

- [ ] **Step 5: Create `packages/config/index.ts`**

```ts
export { defineAppViteConfig } from './vite';
```

- [ ] **Step 6: Commit**

```bash
git add packages/config/
git commit -m "feat: add shared config package (vite, tsconfig, eslint)"
```

---

## Task 3: Create Shared `packages/supabase`

**Files:**
- Create: `packages/supabase/package.json`
- Create: `packages/supabase/src/client.ts`
- Create: `packages/supabase/src/auth.ts`
- Create: `packages/supabase/src/types.ts`
- Create: `packages/supabase/src/hooks.ts`
- Create: `packages/supabase/src/index.ts`
- Create: `packages/supabase/tsconfig.json`

**Interfaces:**
- Consumes: None (standalone package)
- Produces: `getSupabaseClient()`, `signInWithEmail()`, `signUpWithEmail()`, `signOut()`, `useAuth()`, `useAuthProvider()`

- [ ] **Step 1: Create `packages/supabase/package.json`**

```json
{
  "name": "@egspl/supabase",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "src/index.ts",
  "dependencies": {
    "@supabase/supabase-js": "^2.112.3",
    "react": "^19.0.1",
    "react-router-dom": "^7.18.3"
  },
  "devDependencies": {
    "@types/react": "^19.2.18",
    "typescript": "~5.8.2"
  }
}
```

- [ ] **Step 2: Create `packages/supabase/src/client.ts`**

```ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

let _client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!_client) {
    _client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        flowType: 'pkce',
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        cookieOptions: {
          name: 'egspl-session',
          domain: '.egraminservices.com',
          path: '/',
          secure: true,
          sameSite: 'lax',
        },
      },
    });
  }
  return _client;
}

export { supabaseUrl, supabaseAnonKey };
```

- [ ] **Step 3: Create `packages/supabase/src/auth.ts`**

```ts
import { getSupabaseClient, isSupabaseConfigured } from './client';
import type { Session, User as SupabaseAuthUser } from '@supabase/supabase-js';

export async function signInWithEmail(email: string, password: string) {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Supabase not configured' };
  }
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { success: false, error: error.message };
  return { success: true, session: data.session, user: data.user };
}

export async function signUpWithEmail(
  email: string,
  password: string,
  metadata: { name: string; role?: string; companyName?: string; phoneNumber?: string }
) {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Supabase not configured' };
  }
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: metadata },
  });
  if (error) return { success: false, error: error.message };
  if (data.user?.identities?.length === 0) {
    return { success: false, error: 'An account with this email already exists.' };
  }
  return {
    success: true,
    session: data.session,
    user: data.user,
    message: data.session
      ? undefined
      : 'Account created successfully! Please check your email to confirm your account.',
  };
}

export async function signInWithOtp(email: string) {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Supabase not configured' };
  }
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signInWithOtp({ email });
  if (error) return { success: false, error: error.message };
  return { success: true, message: 'Magic link sent! Check your email.' };
}

export async function resetPassword(email: string) {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Supabase not configured' };
  }
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${import.meta.env.VITE_DASHBOARD_URL}/reset-password`,
  });
  if (error) return { success: false, error: error.message };
  return { success: true, message: 'Password reset email sent! Check your inbox.' };
}

export async function signOut() {
  if (!isSupabaseConfigured) return;
  const supabase = getSupabaseClient();
  await supabase.auth.signOut();
  // Clear the cross-subdomain cookie
  document.cookie = 'egspl-session=; path=/; domain=.egraminservices.com; expires=Thu, 01 Jan 1970 00:00:00 GMT';
}

export function onAuthStateChange(callback: (event: string, session: Session | null) => void) {
  const supabase = getSupabaseClient();
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
}

export async function getSession(): Promise<Session | null> {
  if (!isSupabaseConfigured) return null;
  const supabase = getSupabaseClient();
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function refreshSession(): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Supabase not configured' };
  }
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.getSession();
  if (error) return { success: false, error: error.message };
  if (!data.session) return { success: false, error: 'No active session' };
  return { success: true };
}
```

- [ ] **Step 4: Create `packages/supabase/src/types.ts`**

```ts
export type { Session, User as SupabaseAuthUser } from '@supabase/supabase-js';
```

- [ ] **Step 5: Create `packages/supabase/src/hooks.ts`**

```ts
import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import type { Session, SupabaseAuthUser } from './types';
import { onAuthStateChange, getSession, signInWithEmail, signUpWithEmail, signInWithOtp, resetPassword, signOut as authSignOut } from './auth';

interface AuthState {
  session: Session | null;
  supabaseUser: SupabaseAuthUser | null;
  isAuthenticated: boolean;
  isInitialLoading: boolean;
}

interface AuthActions {
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, metadata: Record<string, unknown>) => Promise<{ success: boolean; error?: string; message?: string }>;
  signInOtp: (email: string) => Promise<{ success: boolean; error?: string; message?: string }>;
  resetPwd: (email: string) => Promise<{ success: boolean; error?: string; message?: string }>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<{ success: boolean; error?: string }>;
}

export type AuthContextValue = AuthState & AuthActions;

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function useAuthState(): AuthState {
  const [session, setSession] = useState<Session | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseAuthUser | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    getSession().then((s) => {
      if (!mounted) return;
      setSession(s);
      setSupabaseUser(s?.user ?? null);
      setIsInitialLoading(false);
    });

    const { data: { subscription } } = onAuthStateChange((event, s) => {
      if (!mounted) return;
      setSession(s);
      setSupabaseUser(s?.user ?? null);
      setIsInitialLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return {
    session,
    supabaseUser,
    isAuthenticated: Boolean(session),
    isInitialLoading,
  };
}

export function useAuthProvider(): AuthContextValue {
  const authState = useAuthState();

  const signIn = useCallback(async (email: string, password: string) => {
    return signInWithEmail(email, password);
  }, []);

  const signUp = useCallback(async (email: string, password: string, metadata: Record<string, unknown>) => {
    return signUpWithEmail(email, password, metadata as { name: string; role?: string; companyName?: string; phoneNumber?: string });
  }, []);

  const signInOtp = useCallback(async (email: string) => {
    return signInWithOtp(email);
  }, []);

  const resetPwd = useCallback(async (email: string) => {
    return resetPassword(email);
  }, []);

  const signOut = useCallback(async () => {
    await authSignOut();
  }, []);

  const refreshSession = useCallback(async () => {
    const s = await getSession();
    if (!s) return { success: false, error: 'No session' };
    return { success: true };
  }, []);

  return {
    ...authState,
    signIn,
    signUp,
    signInOtp,
    resetPwd,
    signOut,
    refreshSession,
  };
}
```

- [ ] **Step 6: Create `packages/supabase/src/index.ts`**

```ts
export { getSupabaseClient, isSupabaseConfigured, supabaseUrl, supabaseAnonKey } from './client';
export { signInWithEmail, signUpWithEmail, signInWithOtp, resetPassword, signOut, onAuthStateChange, getSession, refreshSession } from './auth';
export { AuthContext, useAuth, useAuthState, useAuthProvider } from './hooks';
export type { AuthContextValue } from './hooks';
export type { Session, SupabaseAuthUser } from './types';
```

- [ ] **Step 7: Create `packages/supabase/tsconfig.json`**

```json
{
  "extends": "../config/tsconfig.json",
  "compilerOptions": {
    "outDir": "dist"
  },
  "include": ["src"]
}
```

- [ ] **Step 8: Commit**

```bash
git add packages/supabase/
git commit -m "feat: add shared supabase package with cross-subdomain session sharing"
```

---

## Task 4: Create Shared `packages/ui`

**Files:**
- Create: `packages/ui/package.json`
- Create: `packages/ui/src/index.ts`
- Create: `packages/ui/tsconfig.json`

**Interfaces:**
- Consumes: None
- Produces: Shared UI component exports (buttons, forms, modals)

- [ ] **Step 1: Create `packages/ui/package.json`**

```json
{
  "name": "@egspl/ui",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "src/index.ts",
  "dependencies": {
    "lucide-react": "^0.546.0",
    "motion": "^12.23.24",
    "react": "^19.0.1",
    "react-dom": "^19.0.1"
  },
  "devDependencies": {
    "@types/react": "^19.2.18",
    "typescript": "~5.8.2"
  }
}
```

- [ ] **Step 2: Create `packages/ui/src/index.ts`**

```ts
// Shared UI components will be added here as they are extracted from the dashboard.
// For now, this is a placeholder for the shared component library.
export {};
```

- [ ] **Step 3: Create `packages/ui/tsconfig.json`**

```json
{
  "extends": "../config/tsconfig.json",
  "compilerOptions": {
    "outDir": "dist"
  },
  "include": ["src"]
}
```

- [ ] **Step 4: Commit**

```bash
git add packages/ui/
git commit -m "feat: add shared UI package placeholder"
```

---

## Task 5: Create `apps/dashboard` (Move Existing Code)

**Files:**
- Create: `apps/dashboard/package.json`
- Create: `apps/dashboard/index.html` (moved from root)
- Create: `apps/dashboard/vite.config.ts`
- Create: `apps/dashboard/tsconfig.json`
- Move: `src/` → `apps/dashboard/src/`
- Move: `public/` → `apps/dashboard/public/`
- Move: `supabase/` → `apps/dashboard/supabase/`
- Modify: `apps/dashboard/src/main.tsx` (update imports)
- Modify: `apps/dashboard/src/App.tsx` (remove auth routes, add redirect to auth subdomain)

**Interfaces:**
- Consumes: `@egspl/config`, `@egspl/supabase`
- Produces: Working dashboard app at `apps/dashboard/`

- [ ] **Step 1: Create `apps/dashboard/package.json`**

```json
{
  "name": "@egspl/dashboard",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --port=3000 --host=0.0.0.0",
    "build": "vite build",
    "preview": "vite preview",
    "clean": "node -e \"const fs=require('fs'); fs.rmSync('dist', {recursive:true, force:true});\"",
    "lint": "tsc --noEmit"
  },
  "dependencies": {
    "@egspl/config": "workspace:*",
    "@egspl/supabase": "workspace:*",
    "@supabase/supabase-js": "^2.112.3",
    "canvas-confetti": "^1.9.4",
    "lottie-react": "^3.1.1",
    "lucide-react": "^0.546.0",
    "motion": "^12.23.24",
    "react": "^19.0.1",
    "react-dom": "^19.0.1",
    "react-router-dom": "^7.18.3",
    "recharts": "^3.10.1"
  },
  "devDependencies": {
    "@types/canvas-confetti": "^1.9.0",
    "@types/node": "^22.14.0",
    "@types/pg": "^8.23.1",
    "@types/react": "^19.2.18",
    "@types/react-dom": "^19.2.5",
    "typescript": "~5.8.2",
    "vite": "^6.2.3"
  }
}
```

- [ ] **Step 2: Create `apps/dashboard/vite.config.ts`**

```ts
import { defineAppViteConfig } from '@egspl/config/vite';

export default defineAppViteConfig({
  alias: {
    '@': __dirname,
  },
});
```

- [ ] **Step 3: Create `apps/dashboard/tsconfig.json`**

```json
{
  "extends": "../../packages/config/tsconfig.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"]
}
```

- [ ] **Step 4: Move source files**

```bash
# Create apps/dashboard directory structure
mkdir -p apps/dashboard/src apps/dashboard/public

# Move source files
cp -r src/* apps/dashboard/src/
cp -r public/* apps/dashboard/public/
cp -r supabase apps/dashboard/

# Move index.html
cp index.html apps/dashboard/

# Keep root index.html as redirect for backward compatibility
```

- [ ] **Step 5: Update `apps/dashboard/src/main.tsx`**

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
```

- [ ] **Step 6: Update `apps/dashboard/src/App.tsx`**

Remove the `AuthScreen` import and route. Add a redirect to the auth subdomain if not authenticated:

```tsx
// In the route config, replace:
// <Route path="/login" element={<AuthScreen />} />
// With a component that redirects to auth subdomain:
import { Navigate } from 'react-router-dom';

const AuthRedirect = () => {
  window.location.href = import.meta.env.VITE_AUTH_URL || 'https://auth.egraminservices.com/login';
  return <div>Redirecting to login...</div>;
};

// In routes:
// <Route path="/login" element={<AuthRedirect />} />
// <Route path="/signup" element={<AuthRedirect />} />
```

- [ ] **Step 7: Create `apps/dashboard/.env.example`**

```
VITE_APP_URL=https://app.egraminservices.com
VITE_AUTH_URL=https://auth.egraminservices.com
VITE_DASHBOARD_URL=https://app.egraminservices.com
VITE_SUPABASE_URL=<supabase-url>
VITE_SUPABASE_ANON_KEY=<supabase-anon-key>
```

- [ ] **Step 8: Test dashboard builds**

```bash
cd apps/dashboard
pnpm install
pnpm build
```

Expected: Build succeeds, `dist/` directory created.

- [ ] **Step 9: Commit**

```bash
git add apps/dashboard/
git commit -m "feat: migrate dashboard to apps/dashboard with monorepo structure"
```

---

## Task 6: Create `apps/auth`

**Files:**
- Create: `apps/auth/package.json`
- Create: `apps/auth/index.html`
- Create: `apps/auth/vite.config.ts`
- Create: `apps/auth/tsconfig.json`
- Create: `apps/auth/src/main.tsx`
- Create: `apps/auth/src/App.tsx`
- Create: `apps/auth/src/pages/LoginPage.tsx`
- Create: `apps/auth/src/pages/SignupPage.tsx`
- Create: `apps/auth/src/pages/ForgotPasswordPage.tsx`
- Create: `apps/auth/src/pages/ResetPasswordPage.tsx`
- Create: `apps/auth/src/pages/AuthCallbackPage.tsx`
- Create: `apps/auth/src/components/AuthLayout.tsx`
- Create: `apps/auth/.env.example`

**Interfaces:**
- Consumes: `@egspl/config`, `@egspl/supabase`
- Produces: Working auth app at `apps/auth/`

- [ ] **Step 1: Create `apps/auth/package.json`**

```json
{
  "name": "@egspl/auth",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --port=3001 --host=0.0.0.0",
    "build": "vite build",
    "preview": "vite preview",
    "clean": "node -e \"const fs=require('fs'); fs.rmSync('dist', {recursive:true, force:true});\"",
    "lint": "tsc --noEmit"
  },
  "dependencies": {
    "@egspl/config": "workspace:*",
    "@egspl/supabase": "workspace:*",
    "lucide-react": "^0.546.0",
    "motion": "^12.23.24",
    "react": "^19.0.1",
    "react-dom": "^19.0.1",
    "react-router-dom": "^7.18.3"
  },
  "devDependencies": {
    "@types/node": "^22.14.0",
    "@types/react": "^19.2.18",
    "@types/react-dom": "^19.2.5",
    "typescript": "~5.8.2",
    "vite": "^6.2.3"
  }
}
```

- [ ] **Step 2: Create `apps/auth/index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Auth - eGramin Services</title>
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 3: Create `apps/auth/vite.config.ts`**

```ts
import { defineAppViteConfig } from '@egspl/config/vite';

export default defineAppViteConfig();
```

- [ ] **Step 4: Create `apps/auth/tsconfig.json`**

```json
{
  "extends": "../../packages/config/tsconfig.json",
  "include": ["src"]
}
```

- [ ] **Step 5: Create `apps/auth/src/main.tsx`**

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
```

- [ ] **Step 6: Create `apps/auth/src/App.tsx`**

```tsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { AuthCallbackPage } from './pages/AuthCallbackPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
```

- [ ] **Step 7: Create `apps/auth/src/components/AuthLayout.tsx`**

```tsx
import React from 'react';
import { Sparkles, Lock, ShieldCheck, WalletCards, Headphones } from 'lucide-react';
import { motion } from 'motion/react';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children, title, subtitle }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-emerald-600/20 via-teal-600/10 to-cyan-600/20 p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,...')] opacity-5" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">eGramin</h1>
              <p className="text-emerald-300/70 text-sm">Services</p>
            </div>
          </div>
          <h2 className="text-4xl font-bold text-white mb-4">
            Welcome to<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
              eGramin Services
            </span>
          </h2>
          <p className="text-slate-300/80 text-lg">
            Empowering rural and urban economies through digital commerce.
          </p>
        </div>
        <div className="relative z-10 grid grid-cols-2 gap-4">
          {[
            { icon: ShieldCheck, label: 'Bank-Grade Security' },
            { icon: Lock, label: 'Encrypted Data' },
            { icon: WalletCards, label: 'Digital Payments' },
            { icon: Headphones, label: '24/7 Support' },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2 text-slate-300/70">
              <Icon className="w-4 h-4 text-emerald-400" />
              <span className="text-sm">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right side - Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-white">eGramin</h1>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">{title}</h2>
          <p className="text-slate-400 mb-8">{subtitle}</p>
          {children}
        </motion.div>
      </div>
    </div>
  );
};
```

- [ ] **Step 8: Create `apps/auth/src/pages/LoginPage.tsx`**

```tsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle } from 'lucide-react';
import { signInWithEmail } from '@egspl/supabase';
import { AuthLayout } from '../components/AuthLayout';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const result = await signInWithEmail(email, password);
      if (result.success) {
        window.location.href = import.meta.env.VITE_DASHBOARD_URL || 'https://app.egraminservices.com';
      } else {
        setError(result.error || 'Login failed');
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout title="Sign In" subtitle="Enter your credentials to access your account">
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span className="text-red-300 text-sm">{error}</span>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-800/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
              placeholder="you@example.com"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 bg-slate-800/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
              placeholder="••••••••"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2">
            <input type="checkbox" className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-emerald-500/50" />
            <span className="text-sm text-slate-400">Remember me</span>
          </label>
          <Link to="/forgot-password" className="text-sm text-emerald-400 hover:text-emerald-300">
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              Sign In
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>

        <p className="text-center text-sm text-slate-400">
          Don't have an account?{' '}
          <Link to="/signup" className="text-emerald-400 hover:text-emerald-300 font-medium">
            Sign up
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
};
```

- [ ] **Step 9: Create `apps/auth/src/pages/SignupPage.tsx`**

Signup form with name, email, password, company name, phone number fields. Uses `signUpWithEmail` from `@egspl/supabase`. Redirects to dashboard on success or shows confirmation message.

- [ ] **Step 10: Create `apps/auth/src/pages/ForgotPasswordPage.tsx`**

Email input form that calls `resetPassword` from `@egspl/supabase`. Shows success message after submission.

- [ ] **Step 11: Create `apps/auth/src/pages/ResetPasswordPage.tsx`**

New password + confirm password form. On mount, exchanges the reset token from URL params for a session.

- [ ] **Step 12: Create `apps/auth/src/pages/AuthCallbackPage.tsx`**

```tsx
import { useEffect } from 'react';
import { getSupabaseClient } from '@egspl/supabase';

export const AuthCallbackPage: React.FC = () => {
  useEffect(() => {
    const supabase = getSupabaseClient();
    supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        window.location.href = import.meta.env.VITE_DASHBOARD_URL || 'https://app.egraminservices.com';
      }
    });
  }, []);

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-400">Completing authentication...</p>
      </div>
    </div>
  );
};
```

- [ ] **Step 13: Create `apps/auth/.env.example`**

```
VITE_APP_URL=https://auth.egraminservices.com
VITE_AUTH_URL=https://auth.egraminservices.com
VITE_DASHBOARD_URL=https://app.egraminservices.com
VITE_SUPABASE_URL=<supabase-url>
VITE_SUPABASE_ANON_KEY=<supabase-anon-key>
```

- [ ] **Step 14: Test auth app builds**

```bash
cd apps/auth
pnpm install
pnpm build
```

Expected: Build succeeds.

- [ ] **Step 15: Commit**

```bash
git add apps/auth/
git commit -m "feat: create auth app with login, signup, password reset, and callback"
```

---

## Task 7: Create `apps/landing`

**Files:**
- Create: `apps/landing/package.json`
- Create: `apps/landing/index.html`
- Create: `apps/landing/vite.config.ts`
- Create: `apps/landing/tsconfig.json`
- Create: `apps/landing/src/main.tsx`
- Create: `apps/landing/src/App.tsx`
- Create: `apps/landing/src/pages/HomePage.tsx`
- Create: `apps/landing/src/pages/PricingPage.tsx`
- Create: `apps/landing/src/pages/ContactPage.tsx`
- Create: `apps/landing/src/components/Header.tsx`
- Create: `apps/landing/src/components/Footer.tsx`
- Create: `apps/landing/.env.example`

**Interfaces:**
- Consumes: `@egspl/config`
- Produces: Working landing page at `apps/landing/`

- [ ] **Step 1: Create `apps/landing/package.json`**

```json
{
  "name": "@egspl/landing",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --port=3002 --host=0.0.0.0",
    "build": "vite build",
    "preview": "vite preview",
    "clean": "node -e \"const fs=require('fs'); fs.rmSync('dist', {recursive:true, force:true});\"",
    "lint": "tsc --noEmit"
  },
  "dependencies": {
    "@egspl/config": "workspace:*",
    "lucide-react": "^0.546.0",
    "motion": "^12.23.24",
    "react": "^19.0.1",
    "react-dom": "^19.0.1",
    "react-router-dom": "^7.18.3"
  },
  "devDependencies": {
    "@types/node": "^22.14.0",
    "@types/react": "^19.2.18",
    "@types/react-dom": "^19.2.5",
    "typescript": "~5.8.2",
    "vite": "^6.2.3"
  }
}
```

- [ ] **Step 2: Create `apps/landing/index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>eGramin Services - Digital Commerce Platform</title>
    <meta name="description" content="Empowering rural and urban economies through digital commerce" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 3: Create `apps/landing/vite.config.ts`**

```ts
import { defineAppViteConfig } from '@egspl/config/vite';

export default defineAppViteConfig();
```

- [ ] **Step 4: Create `apps/landing/tsconfig.json`**

```json
{
  "extends": "../../packages/config/tsconfig.json",
  "include": ["src"]
}
```

- [ ] **Step 5: Create `apps/landing/src/main.tsx`**

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
```

- [ ] **Step 6: Create `apps/landing/src/App.tsx`**

```tsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { PricingPage } from './pages/PricingPage';
import { ContactPage } from './pages/ContactPage';
import { Header } from './components/Header';
import { Footer } from './components/Footer';

export default function App() {
  return (
    <div className="min-h-screen bg-[#0f172a] text-white">
      <Header />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/login" element={<Navigate to={`${import.meta.env.VITE_AUTH_URL || 'https://auth.egraminservices.com'}/login`} replace />} />
        <Route path="/signup" element={<Navigate to={`${import.meta.env.VITE_AUTH_URL || 'https://auth.egraminservices.com'}/signup`} replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Footer />
    </div>
  );
}
```

- [ ] **Step 7: Create `apps/landing/src/components/Header.tsx`**

Landing page header with nav links to Home, Pricing, Contact, and CTA buttons for Login/Sign Up that redirect to auth subdomain.

- [ ] **Step 8: Create `apps/landing/src/components/Footer.tsx`**

Landing page footer with links, social icons, copyright.

- [ ] **Step 9: Create `apps/landing/src/pages/HomePage.tsx`**

Marketing landing page with hero section, features grid, testimonials, and CTA.

- [ ] **Step 10: Create `apps/landing/src/pages/PricingPage.tsx`**

Pricing tiers with feature comparison.

- [ ] **Step 11: Create `apps/landing/src/pages/ContactPage.tsx`**

Contact form with name, email, message fields.

- [ ] **Step 12: Create `apps/landing/.env.example`**

```
VITE_APP_URL=https://egraminservices.com
VITE_AUTH_URL=https://auth.egraminservices.com
VITE_DASHBOARD_URL=https://app.egraminservices.com
```

- [ ] **Step 13: Test landing app builds**

```bash
cd apps/landing
pnpm install
pnpm build
```

Expected: Build succeeds.

- [ ] **Step 14: Commit**

```bash
git add apps/landing/
git commit -m "feat: create landing page app with hero, pricing, and contact"
```

---

## Task 8: Update CI/CD Pipeline

**Files:**
- Modify: `.github/workflows/azure-static-web-apps.yml` → `.github/workflows/deploy.yml`

**Interfaces:**
- Consumes: Monorepo structure from Tasks 1-7
- Produces: Working CI/CD for all three apps

- [ ] **Step 1: Create `.github/workflows/deploy.yml`**

```yaml
name: Deploy All Apps

on:
  push:
    branches:
      - uat
      - prod
  pull_request:
    types: [opened, synchronize, reopened, closed]
    branches:
      - prod

jobs:
  # -------------------------------------------------------------
  # 0. RLS Regression Guard
  # -------------------------------------------------------------
  rls_regression:
    if: |
      (github.event_name == 'pull_request' && github.base_ref == 'prod' && github.event.action != 'closed') ||
      (github.event_name == 'push' && github.ref == 'refs/heads/prod')
    runs-on: ubuntu-latest
    name: RLS Policy Regression Guard
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9

      - name: Install dependencies
        run: pnpm install

      - name: Install Playwright browsers
        run: pnpm --filter @egspl/dashboard exec npx playwright install --with-deps chromium

      - name: Run RLS regression tests
        run: pnpm --filter @egspl/dashboard exec npx playwright test e2e/rls-policy.spec.ts --reporter=list
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY || secrets.VITE_SUPABASE_PUBLISHABLE_KEY }}

  # -------------------------------------------------------------
  # 1. Deploy Landing (UAT)
  # -------------------------------------------------------------
  deploy_landing_uat:
    if: github.event_name == 'push' && github.ref == 'refs/heads/uat'
    runs-on: ubuntu-latest
    name: Deploy Landing UAT
    steps:
      - uses: actions/checkout@v4

      - name: Install pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Build Landing
        run: pnpm --filter @egspl/landing build

      - name: Deploy to Azure Static Web Apps
        uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ secrets.AZURE_SWA_TOKEN_LANDING_UAT }}
          repo_token: ${{ secrets.GITHUB_TOKEN }}
          action: "upload"
          app_location: "apps/landing/dist"
          api_location: ""
          output_location: ""

  # -------------------------------------------------------------
  # 2. Deploy Auth (UAT)
  # -------------------------------------------------------------
  deploy_auth_uat:
    if: github.event_name == 'push' && github.ref == 'refs/heads/uat'
    runs-on: ubuntu-latest
    name: Deploy Auth UAT
    steps:
      - uses: actions/checkout@v4

      - name: Install pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Build Auth
        run: pnpm --filter @egspl/auth build
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY || secrets.VITE_SUPABASE_PUBLISHABLE_KEY }}

      - name: Deploy to Azure Static Web Apps
        uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ secrets.AZURE_SWA_TOKEN_AUTH_UAT }}
          repo_token: ${{ secrets.GITHUB_TOKEN }}
          action: "upload"
          app_location: "apps/auth/dist"
          api_location: ""
          output_location: ""

  # -------------------------------------------------------------
  # 3. Deploy Dashboard (UAT)
  # -------------------------------------------------------------
  deploy_dashboard_uat:
    if: github.event_name == 'push' && github.ref == 'refs/heads/uat'
    runs-on: ubuntu-latest
    name: Deploy Dashboard UAT
    steps:
      - uses: actions/checkout@v4

      - name: Install pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Build Dashboard
        run: pnpm --filter @egspl/dashboard build
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY || secrets.VITE_SUPABASE_PUBLISHABLE_KEY }}

      - name: Deploy to Azure Static Web Apps
        uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ secrets.AZURE_SWA_TOKEN_DASHBOARD_UAT }}
          repo_token: ${{ secrets.GITHUB_TOKEN }}
          action: "upload"
          app_location: "apps/dashboard/dist"
          api_location: ""
          output_location: ""

  # -------------------------------------------------------------
  # 4. Deploy Landing (Prod)
  # -------------------------------------------------------------
  deploy_landing_prod:
    if: (github.event_name == 'pull_request' && github.base_ref == 'prod' && github.event.action != 'closed') || (github.event_name == 'push' && github.ref == 'refs/heads/prod')
    needs: rls_regression
    runs-on: ubuntu-latest
    name: Deploy Landing Prod
    steps:
      - uses: actions/checkout@v4

      - name: Install pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Build Landing
        run: pnpm --filter @egspl/landing build

      - name: Deploy to Azure Static Web Apps
        uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ secrets.AZURE_SWA_TOKEN_LANDING_PROD }}
          repo_token: ${{ secrets.GITHUB_TOKEN }}
          action: "upload"
          app_location: "apps/landing/dist"
          api_location: ""
          output_location: ""

  # -------------------------------------------------------------
  # 5. Deploy Auth (Prod)
  # -------------------------------------------------------------
  deploy_auth_prod:
    if: (github.event_name == 'pull_request' && github.base_ref == 'prod' && github.event.action != 'closed') || (github.event_name == 'push' && github.ref == 'refs/heads/prod')
    needs: rls_regression
    runs-on: ubuntu-latest
    name: Deploy Auth Prod
    steps:
      - uses: actions/checkout@v4

      - name: Install pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Build Auth
        run: pnpm --filter @egspl/auth build
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY || secrets.VITE_SUPABASE_PUBLISHABLE_KEY }}

      - name: Deploy to Azure Static Web Apps
        uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ secrets.AZURE_SWA_TOKEN_AUTH_PROD }}
          repo_token: ${{ secrets.GITHUB_TOKEN }}
          action: "upload"
          app_location: "apps/auth/dist"
          api_location: ""
          output_location: ""

  # -------------------------------------------------------------
  # 6. Deploy Dashboard (Prod)
  # -------------------------------------------------------------
  deploy_dashboard_prod:
    if: (github.event_name == 'pull_request' && github.base_ref == 'prod' && github.event.action != 'closed') || (github.event_name == 'push' && github.ref == 'refs/heads/prod')
    needs: rls_regression
    runs-on: ubuntu-latest
    name: Deploy Dashboard Prod
    steps:
      - uses: actions/checkout@v4

      - name: Install pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Build Dashboard
        run: pnpm --filter @egspl/dashboard build
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY || secrets.VITE_SUPABASE_PUBLISHABLE_KEY }}

      - name: Deploy to Azure Static Web Apps
        uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ secrets.AZURE_SWA_TOKEN_DASHBOARD_PROD }}
          repo_token: ${{ secrets.GITHUB_TOKEN }}
          action: "upload"
          app_location: "apps/dashboard/dist"
          api_location: ""
          output_location: ""
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "ci: update CI/CD pipeline for monorepo multi-app deployment"
```

---

## Task 9: Update Supabase Configuration

**Files:**
- No code changes — manual configuration in Supabase dashboard

**Interfaces:**
- Consumes: All apps deployed
- Produces: Supabase configured for cross-subdomain auth

- [ ] **Step 1: Update Supabase Auth Settings**

In Supabase Dashboard → Authentication → URL Configuration:

| Setting | Value |
|---------|-------|
| Site URL | `https://app.egraminservices.com` |
| Redirect URLs | Add: `https://auth.egraminservices.com/auth/callback`, `https://app.egraminservices.com/auth/callback` |

- [ ] **Step 2: Commit configuration note**

```bash
echo "## Supabase Config\n\nUpdated Site URL and Redirect URLs in Supabase dashboard for cross-subdomain auth." > docs/supabase-config.md
git add docs/supabase-config.md
git commit -m "docs: note Supabase auth config for cross-subdomain setup"
```

---

## Task 10: End-to-End Testing

**Files:**
- Create: `e2e/cross-subdomain-auth.spec.ts`

**Interfaces:**
- Consumes: All apps deployed and configured
- Produces: Passing E2E tests for auth flow

- [ ] **Step 1: Create E2E test**

```ts
import { test, expect } from '@playwright/test';

const LANDING_URL = process.env.VITE_LANDING_URL || 'https://egraminservices.com';
const AUTH_URL = process.env.VITE_AUTH_URL || 'https://auth.egraminservices.com';
const DASHBOARD_URL = process.env.VITE_DASHBOARD_URL || 'https://app.egraminservices.com';

test.describe('Cross-Subdomain Auth Flow', () => {
  test('landing page loads and has login link', async ({ page }) => {
    await page.goto(LANDING_URL);
    await expect(page).toHaveTitle(/eGramin/);
    const loginLink = page.locator('a[href*="auth.egraminservices.com/login"]');
    await expect(loginLink).toBeVisible();
  });

  test('login page loads on auth subdomain', async ({ page }) => {
    await page.goto(`${AUTH_URL}/login`);
    await expect(page).toHaveTitle(/Sign In/);
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('signup page loads on auth subdomain', async ({ page }) => {
    await page.goto(`${AUTH_URL}/signup`);
    await expect(page).toHaveTitle(/Sign Up/);
  });

  test('dashboard redirects to auth when not logged in', async ({ page }) => {
    await page.goto(DASHBOARD_URL);
    await page.waitForTimeout(2000);
    const url = page.url();
    expect(url.includes('auth.egraminservices.com') || url.includes('login')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run E2E tests**

```bash
npx playwright test e2e/cross-subdomain-auth.spec.ts --reporter=list
```

Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add e2e/cross-subdomain-auth.spec.ts
git commit -m "test: add cross-subdomain auth E2E tests"
```

---

## Task 11: Azure Front Door Configuration

**Files:**
- No code changes — manual Azure portal configuration

**Interfaces:**
- Consumes: All three SWA instances deployed
- Produces: Azure Front Door routing by hostname

- [ ] **Step 1: Create Azure Front Door**

In Azure Portal:
1. Create a new Azure Front Door resource
2. Add three origins (one per SWA):
   - `egspl-landing.azurestaticapps.net`
   - `egspl-auth.azurestaticapps.net`
   - `egspl-dashboard.azurestaticapps.net`
3. Create three routing rules:
   - `egraminservices.com/*` → landing origin
   - `auth.egraminservices.com/*` → auth origin
   - `app.egraminservices.com/*` → dashboard origin
4. Configure HTTPS for all three hostnames
5. Enable WAF (optional but recommended)

- [ ] **Step 2: Update DNS CNAME records**

Update Azure DNS Zone CNAME records to point to Front Door endpoint:

| Record | Type | Value |
|--------|------|-------|
| `@` | CNAME | `<front-door-endpoint>.azurefd.net` |
| `auth` | CNAME | `<front-door-endpoint>.azurefd.net` |
| `app` | CNAME | `<front-door-endpoint>.azurefd.net` |

- [ ] **Step 3: Verify routing**

Test each subdomain:
- `https://egraminservices.com` → Landing page
- `https://auth.egraminservices.com/login` → Auth login page
- `https://app.egraminservices.com` → Dashboard (or redirect to auth)

- [ ] **Step 4: Document Azure setup**

```bash
echo "## Azure Front Door Setup\n\n- Front Door endpoint: <endpoint>\n- Origins: 3 SWA instances\n- Routing: hostname-based\n- HTTPS: enabled for all hostnames" > docs/azure-frontdoor-config.md
git add docs/azure-frontdoor-config.md
git commit -m "docs: document Azure Front Door configuration"
```

---

## Summary

| Task | Deliverable | Est. Time |
|------|-------------|-----------|
| 1 | Monorepo structure | 10 min |
| 2 | `packages/config` | 10 min |
| 3 | `packages/supabase` | 20 min |
| 4 | `packages/ui` | 5 min |
| 5 | `apps/dashboard` (move) | 20 min |
| 6 | `apps/auth` | 30 min |
| 7 | `apps/landing` | 25 min |
| 8 | CI/CD pipeline | 15 min |
| 9 | Supabase config | 5 min |
| 10 | E2E testing | 15 min |
| 11 | Azure Front Door | 20 min |
| **Total** | | **~2.5 hours** |
