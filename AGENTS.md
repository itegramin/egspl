# 🤖 AI Agent Context, Memory & Developer Rules for E-Gramin CSMP

> **FOR ALL AI AGENTS (Antigravity, Claude Code, Cursor, Copilot, Windsurf, Roo Code, etc.):**  
> This file is the primary context and persistent memory for the **E-Gramin Client Service Management Platform (CSMP)**.  
> Read this file first before inspecting, modifying, or creating any code in this repository.

---

## 1. Project Overview & Business Domain

- **App Name**: E-Gramin Client Service Management Platform (CSMP)
- **Domain**: Rural Banking Correspondent (BC), Customer Service Point (CSP/Kiosk) Operations, and Citizen Financial Inclusion in India.
- **Core Capabilities**:
  - **Technical Support Helpdesk**: Issues regarding biometric fingerprint scanners, micro-ATM (mATM) devices, portal logins, and billing disputes.
  - **Holding Wallet Operations**: Deposit slips, dual-control withdrawal authorizations, Indian numbering currency conversion (`Rupees ... Only`), and live CSP balance adjustments.
  - **CRM & Kiosk Governance**: Directory of CSP kiosks, operator routing, new registration approval pipeline, and user status management (`active`, `pending`, `suspended`).
  - **Multi-Tenant RBAC**: Strict role boundaries between `admin`, `operator`, and `client`.
  - **Compliance & Auditing**: Immutable audit trails and real-time in-app notifications.

---

## 2. Critical Architectural Constraints (NEVER VIOLATE)

When making any code changes, all AI agents **must strictly adhere** to the following constraints:

1. **Azure Static Web Apps (SWA) Deployment**:
   - The application is deployed exclusively to **Azure Static Web Apps** via GitHub Actions (`.github/workflows/azure-static-web-apps.yml`).
   - **Vite Base Path**: Must ALWAYS be `base: '/'` in `vite.config.ts`. **NEVER** change to `base: './'`, because relative asset paths break deep SPA routes (e.g. `/dashboard`, `/support`) on Azure edge servers.
   - **SPA Routing**: Handled natively by `staticwebapp.config.json` via `"navigationFallback": { "rewrite": "/index.html" }`. **NEVER** re-introduce `public/404.html` or client-side redirect hacks.
   - **No Multi-Cloud Clutter**: Do **NOT** re-create `netlify.toml`, `vercel.json`, `Dockerfile`, `nginx.conf`, or `gh-pages` configs.

2. **Resilient Dual-Tier Data Layer**:
   - **Tier 1 (Cloud Backend)**: Supabase Cloud (PostgreSQL 15+, Auth JWTs, Realtime WebSockets, Storage).
   - **Tier 2 (Offline Fallback Engine)**: Browser LocalStorage (`src/lib/storage.ts`).
   - **Rule**: If Supabase environment variables are missing or network connectivity is lost, the application **MUST NOT CRASH**. Code must gracefully degrade to local mock/cache data via `src/lib/supabase.ts`. Failed network writes must queue via `queueRequestForRetry` and retry via `flushPendingRequestSync`.

3. **Authentication & Session Security**:
   - Supabase tokens are persisted in browser cookies via `cookieStorageAdapter` (`src/lib/cookieStorage.ts`) with `SameSite=Lax` and `Secure` attributes (NOT raw unencrypted localStorage).
   - Inactivity auto-logout is strictly enforced after 15 minutes by `SessionContext.tsx`.

4. **Rollup Manual Chunks & Bundle Size**:
   - `vite.config.ts` uses `build.rollupOptions.output.manualChunks` to split heavy libraries (`recharts`, `@supabase/supabase-js`, `lottie-react`, `lucide-react`, `canvas-confetti`) into cacheable edge chunks.
   - When importing large third-party libraries, ensure you do NOT introduce circular chunk dependencies.

---

## 3. Tech Stack Reference

| Layer | Technology | Notes / Version |
| :--- | :--- | :--- |
| **Framework** | [React 19](https://react.dev/) | Using modern hooks, functional components, zero legacy class components |
| **Language** | [TypeScript 5.8](https://www.typescriptlang.org/) | Strict typing enabled (`tsconfig.json`), no unchecked `any` |
| **Bundler** | [Vite 6](https://vitejs.dev/) | `@vitejs/plugin-react`, `@tailwindcss/vite` |
| **Routing** | [React Router v7](https://reactrouter.com/) | HTML5 History API (`react-router-dom`) |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com/) | CSS-first configuration in `src/index.css`, full dark mode support |
| **Icons** | [Lucide React](https://lucide.dev/) | `lucide-react` (clean, tree-shakeable icons) |
| **Animations** | [Motion](https://motion.dev/) | `motion/react` (Framer Motion v12) + `src/lib/animations.ts` |
| **Visualizations** | [Recharts v3](https://recharts.org/) | Responsive charts in `AnalyticsView.tsx` and `DashboardOverview.tsx` |
| **Backend & DB** | [Supabase](https://supabase.com/) | `@supabase/supabase-js` v2 (Auth, PostgreSQL, Realtime, Storage) |
| **Migrations** | `tsx` + `pg` | Runner in `scripts/migrate.ts` executing `supabase/schema.sql` |
| **CI/CD & Cloud** | Azure Static Web Apps | GitHub Actions workflow in `.github/workflows/azure-static-web-apps.yml` |

---

## 4. Directory & Code Organization

```text
src/
├── components/
│   ├── analytics/        # Executive KPI charts, SLA breach reporting, operator workload
│   ├── assignments/      # Workload balancing & ticket reassignment
│   ├── audit/            # Audit logs viewer & activity filters
│   ├── auth/             # Login, registration, pending approval & session expiry screens
│   ├── common/           # Reusable widgets (Badge, Toast, LottieIcon, LoadingScreen, etc.)
│   ├── crm/              # CSP Kiosk & Client directory, registration approval flow
│   ├── dashboard/        # Main dashboard overview with metric cards & quick action modals
│   ├── home/             # Public landing page showcasing CSP services
│   ├── layout/           # Sidebar (filtered by role) & Navbar (persona switcher, alerts)
│   ├── notifications/    # Slide-over notification drawer & logs view
│   ├── profile/          # User profile editing modal
│   ├── rbac/             # Interactive Role-Permission matrix
│   ├── requests/         # SupportTicketsView, HoldingRequestsView, RequestList, DetailModal
│   └── settings/         # System settings, white-label branding, theme customization
├── context/
│   ├── AppContext.tsx    # Global operational state (requests, CRM users, notifications, audit)
│   ├── AuthContext.tsx   # User identity, authentication, session tokens, test personas
│   └── SessionContext.tsx# 15-minute user inactivity monitor & countdown modal
├── lib/
│   ├── animations.ts     # Reusable Framer Motion variants & spring transitions
│   ├── cookieStorage.ts  # SameSite/Secure cookie adapter for Supabase client
│   ├── dateUtils.ts      # Date formatting and SLA calculation functions
│   ├── indianCurrency.ts # Indian currency format (Lakhs/Crores) & Amount in Words generator
│   ├── lottieAssets.ts   # Lottie vector loaders (loading, empty, success)
│   ├── security.ts       # Input sanitization and hash generation helpers
│   ├── storage.ts        # Browser LocalStorage fallback engine with mock seed data
│   ├── supabase.ts       # Supabase client instantiation, DB mappers, offline sync queue
│   └── validators.ts     # Form validators for IFSC codes, account numbers, emails, phones
├── types/
│   ├── app.type.ts       # Central domain models (User, ServiceRequest, AuditLog, etc.)
│   └── supabase.types.ts # PostgreSQL schema definitions
├── App.tsx               # App routing, auth gating, layout container
├── main.tsx              # Application bootstrap & error boundary
└── index.css             # Tailwind v4 theme variables and global styles
```

---

## 5. Domain Models & Core Types

All core interfaces are defined in [`src/types/app.type.ts`](file:///src/types/app.type.ts):

### 5.1 User Role & Status
```typescript
export type UserRole = 'admin' | 'operator' | 'client';
export type UserStatus = 'active' | 'pending' | 'suspended';
```

### 5.2 Polymorphic Service Request
Requests are a discriminated union of three types:
```typescript
export type RequestType = 'support' | 'deposit' | 'withdraw';
export type ServiceRequest = SupportTicket | HoldingDepositRequest | HoldingWithdrawRequest;
```
- **`SupportTicket`**: Has `category: 'matm' | 'biometric' | 'software' | 'account' | 'billing'`, `browserInfo`, `remoteId`.
- **`HoldingDepositRequest`**: Has `amount`, `amountInWords`, `currency`, `depositMethod`, `transactionReferenceId`, `senderAccountName`, `depositDate`, `verifiedTransactionId`.
- **`HoldingWithdrawRequest`**: Has `amount`, `amountInWords`, `currency`, `withdrawMethod`, `beneficiaryAccountName`, `beneficiaryAccountNumberOrAddress`, `bankNameOrNetwork`, `swiftOrIban`, `cmaStatus`, `authorizedAmount`.

### 5.3 Indian Currency Standard
Always format currency figures using the helper functions in `src/lib/indianCurrency.ts`:
- `formatIndianCurrency(amount, { showSymbol: true })` ➔ `₹ 1,50,000.00`
- `formatAmountInWords(amount, { currency: 'INR' })` ➔ `"Rupees One Lakh Fifty Thousand Only"`

---

## 6. How-To Recipes for AI Agents

### Recipe 1: Adding a New Page or Module
To add a new module (e.g. `reports`), follow these exact 5 steps:
1. **Create the View**: Create `src/components/reports/ReportsView.tsx`.
2. **Update `PageId`**: In `src/types/app.type.ts`, append `'reports'` to `type PageId = ...`.
3. **Register Page Definition**: In `src/types/app.type.ts`, add an entry to `APP_PAGE_DEFINITIONS`:
   ```typescript
   { id: 'reports', label: 'Reports', icon: 'BarChart2', description: 'Financial & operational reports' },
   ```
4. **Grant RBAC Permission**: In `src/lib/supabase.ts`, add `'reports'` to `INITIAL_ROLE_PERMISSIONS.admin.allowedPages`.
5. **Mount in Router & Layout**:
   - In `src/App.tsx`, import `ReportsView` and add `case 'reports': return <ReportsView />;` inside `MainLayout.renderPage()`.
   - In `src/App.tsx`, add `<Route path="/reports" element={<AppContent />} />` under `<Routes>`.

### Recipe 2: Adding a Custom Field to Service Requests
1. **Update Domain Type**: Add the field to `src/types/app.type.ts` in `ServiceRequest` or its specific subtypes.
2. **Update DB Mappers**: In `src/lib/supabase.ts`:
   - Add column reading in `mapDbRequest(row: DbRequest)`.
   - Add column writing in `mapRequestToDb(req: ServiceRequest)`.
3. **Update UI Form**:
   - Add input in `src/components/requests/CreateRequestModal.tsx`.
   - Add display section in `src/components/requests/RequestDetailModal.tsx`.
4. **Update DB Schema**: If this column persists to PostgreSQL, append `ALTER TABLE csmp_requests ADD COLUMN IF NOT EXISTS <col_name> TEXT;` in `supabase/schema.sql`.

### Recipe 3: Checking Permissions in UI Components
```tsx
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';

const { user } = useAuth();
const { isPageAllowed, permissions } = useApp();

// Check if user has access to a specific page
if (!isPageAllowed('clients')) return null;

// Check if user role has a specific capability
const canExport = permissions[user.role]?.canExportReports;
```

---

## 7. Mandatory Verification Workflow

After making any code changes, **YOU MUST** run these commands and ensure they pass before concluding:

```bash
# 1. Typecheck: Verify 0 TypeScript compilation errors
npm run lint

# 2. Build: Verify Vite bundle succeeds with clean chunks and zero warnings
npm run build

# 3. Clean: Test cross-platform build cleanup
npm run clean
```

If `npm run lint` fails:
- Inspect the error file and line number.
- Fix missing types or incorrect properties immediately. Do not use `@ts-ignore` or `any` workarounds.

If `npm run build` fails or warns about chunks > 600 kB:
- Inspect `vite.config.ts` Rollup `manualChunks`.
- Ensure new large libraries are properly chunked without circular dependencies.

---

## 8. Development Rules & Best Practices

- **Dark Mode**: All components must support dark mode. Always pair background and text colors (e.g. `bg-white dark:bg-slate-900 text-slate-900 dark:text-white`).
- **Responsive Layouts**: Design for mobile and desktop using Tailwind responsive breakpoints (`sm:`, `md:`, `lg:`). Kiosk CSP operators often use budget tablets and laptops.
- **Accessibility & UX**: All buttons, modals, and interactive elements must have clear focus states, hover feedback, and descriptive ARIA labels where appropriate.
- **No Console Pollution**: Remove temporary `console.log` statements before finishing. Keep `console.warn` and `console.error` only for genuine operational alerts.
- **Security & Privacy**: Never log sensitive bank account numbers, passwords, or session tokens to the console or audit logs in plaintext.
