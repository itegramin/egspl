# 🛡️ ServiceCore — Enterprise Client Service & CRM Management Platform (CSMP)

[![React 19](https://img.shields.io/badge/React-19.0.1-blue.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.2-3178C6.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.2.3-646CFF.svg)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-v4.1-38B2AC.svg)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL%20%2B%20Auth%20%2B%20Realtime-3ECF8E.svg)](https://supabase.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

An enterprise-grade, multi-tenant **Client Service Management Platform (CSMP)** and **CRM Directory** designed for modern financial services, fintech holding accounts, technical support operations, and role-based client governance.

---

## 📑 Table of Contents

- [Key Highlights](#-key-highlights)
- [System Architecture & Data Flow](#-system-architecture--data-flow)
- [Core Functional Modules](#-core-functional-modules)
  - [1. Executive KPI Dashboard](#1-executive-kpi-dashboard)
  - [2. Technical Support Ticket Management](#2-technical-support-ticket-management)
  - [3. Holding Account Balance & Fund Operations](#3-holding-account-balance--fund-operations)
  - [4. Master Service Request Ledger & CSV Reporting](#4-master-service-request-ledger--csv-reporting)
  - [5. User Governance & Client CRM Directory](#5-user-governance--client-crm-directory)
  - [6. Granular Role-Based Access Control (RBAC)](#6-granular-role-based-access-control-rbac)
  - [7. Immutable Audit Trail & Compliance Logging](#7-immutable-audit-trail--compliance-logging)
  - [8. Real-Time Notifications & Alerts](#8-real-time-notifications--alerts)
  - [9. Authentication, Security & Persona Switching](#9-authentication-security--persona-switching)
- [Technology Stack](#-technology-stack)
- [Project Directory Structure](#-project-directory-structure)
- [Getting Started & Local Setup](#-getting-started--local-setup)
  - [Prerequisites](#prerequisites)
  - [Environment Configuration](#environment-configuration)
  - [Database Migration & Seeding](#database-migration--seeding)
  - [Running the Development Server](#running-the-development-server)
- [Default Personas & Test Credentials](#-default-personas--test-credentials)
- [Available Scripts](#-available-scripts)
- [Production Deployment Guide](#-production-deployment-guide)

---

## 🌟 Key Highlights

- **Full Multi-Role Platform**: Distinct personas for **Administrators**, **Operations Staff / Technicians**, and **Enterprise Clients**.
- **Real-Time Data Layer**: Synchronized across **Supabase PostgreSQL** and browser state with automatic offline fallback.
- **Enterprise User Governance**: List table view & card grid view, registration approval pipeline, dynamic role reassignment, and safe user deletion.
- **Financial Holding Operations**: Bank Wire, SEPA, and Crypto deposits/withdrawals with compliance verification references and automated balance updating.
- **Modern Responsive Design**: Tailwind CSS v4, smooth animations with Motion, celebration confetti on task resolution, and full Light/Dark mode.

---

## 🏛 System Architecture & Data Flow

```mermaid
graph TD
    ClientApp["Client / Operator / Admin Browser UI (React 19 + TypeScript + Vite)"]
    
    subgraph StateAndContext["State & Context Layer"]
        AuthCtx["AuthContext (Supabase Auth + Session + RBAC State)"]
        AppCtx["AppContext (Requests + Filters + Audit + Notifications)"]
        LocalStorage["LocalStorage Engine (Offline Fallback Cache)"]
    end

    subgraph BackendServices["Backend & Persistence Layer"]
        SupabaseAuth["Supabase Authentication (JWT / Email / OTP)"]
        PostgresDB[("Supabase PostgreSQL (Tables: csmp_users, csmp_requests, csmp_role_permissions, csmp_audit_logs, csmp_notifications)")]
        RealtimeEngine["Supabase Realtime Channel (Postgres CDC)"]
    end

    ClientApp --> AuthCtx
    ClientApp --> AppCtx
    AuthCtx <--> LocalStorage
    AppCtx <--> LocalStorage
    AuthCtx <--> SupabaseAuth
    AuthCtx <--> PostgresDB
    AppCtx <--> PostgresDB
    RealtimeEngine --> AppCtx
```

---

## 📦 Core Functional Modules

### 1. Executive KPI Dashboard
- **Real-time Metrics**: Tracks Active Requests, Urgent SLA Alerts, Total Holding Balances, and Pending Approvals.
- **SLA Breach Monitoring**: Flags tickets nearing or exceeding operational SLAs.
- **Interactive Visualizations**: Recharts data charts for ticket volume trends, category distribution, and operator workloads.
- **Quick Action Triggers**: One-click launches for creating support tickets, wire deposits, and withdrawal requests.

### 2. Technical Support Ticket Management
- **Structured Intake**: Priority levels (*Urgent, High, Medium, Low*), category classification (*Integration, Bug, Account Access, Feature Request, Billing*), environment diagnostics, and attachment uploads.
- **Two-Way Communication Threads**: Distinguishes between **Public Client Replies** and **Internal Staff Notes**.
- **Operator Assignment**: Direct assignment of tickets to available operators with workload visibility.

### 3. Holding Account Balance & Fund Operations
- **Wire & SEPA Deposits**: Ingest transaction reference numbers, sender account names, proof-of-payment attachments, and bank routing.
- **Compliance Withdrawals**: Multi-currency withdrawal requests with recipient IBAN/SWIFT verification and reason documentation.
- **Operational Verification**: Staff verification workflow with verified transaction ID logging and celebratory completion confetti.

### 4. Master Service Request Ledger & CSV Reporting
- **Multi-Dimensional Filters**: Search keywords, request type, lifecycle status, priority, date period, and assigned operator.
- **CSV Data Export**: One-click export of filtered service requests with complete audit timestamps.

### 5. User Governance & Client CRM Directory
- **Data List / Table View**: High-density table layout with contact info, company affiliations, role badges, holding account balances, request portfolio links, and governance actions.
- **Alternative Grid View**: Card-based presentation for visual scanning.
- **Registration Approval Flow**: Review pending user sign-ups and grant platform access with assigned privileges.
- **Role Elevation & Switching**: Admins can dynamically promote/reassign roles between Client, Operator, and Administrator.
- **Permanent User Deletion**: Secure account deletion with confirmation modal, self-deletion protection, and database purging.
- **Client Request Portfolio**: Interactive modal to inspect all service tickets and transactions for any specific client.

### 6. Granular Role-Based Access Control (RBAC)
- **Role Permission Matrix**: Visual toggles for page permissions and operational capabilities (e.g. status changes, operator assignment, role management, audit log access).
- **Dynamic Route Gating**: Unauthorized navigation attempts redirect to a friendly RBAC restriction screen.

### 7. Immutable Audit Trail & Compliance Logging
- Comprehensive event logging documenting actor, target entity, timestamp, IP address, and operational details for all key platform actions (logins, role changes, status updates, user deletions).

### 8. Real-Time Notifications & Alerts
- Push notifications for ticket assignments, status transitions, holding deposits, and pending account registrations with unread counters and batch mark-as-read.

### 9. Authentication, Security & Persona Switching
- **Supabase Auth**: Secure Email & Password, Magic Link (passwordless OTP), and Password Reset emails.
- **Quick Persona Login**: Fast 1-click persona switching for instant end-to-end testing between Admin, Operator, and Client workflows.

---

## 💻 Technology Stack

| Layer | Technology | Description |
| :--- | :--- | :--- |
| **Frontend Framework** | React 19 (`19.0.1`) | High-performance component architecture |
| **Language** | TypeScript (`5.8.2`) | Strict type-safety across models and APIs |
| **Build Tool** | Vite (`6.2.3`) | Fast HMR and optimized production bundling |
| **Styling** | Tailwind CSS (`v4.1.14`) | Utility-first CSS styling engine |
| **Icons** | Lucide React (`0.546.0`) | Modern, consistent icon library |
| **Animations** | Motion (`12.23.24`) | Smooth UI transitions & modal dialogs |
| **Charts** | Recharts (`3.10.1`) | Responsive analytics charts |
| **Backend & DB** | Supabase (`2.112.3`) | PostgreSQL, Realtime engine & Auth |
| **Database Migration** | TSX (`4.21.0`) + PG (`8.23.0`) | TypeScript database migration scripts |

---

## 📂 Project Directory Structure

```text
client-service-management/
├── assets/                  # Brand assets and graphics
├── scripts/
│   └── migrate.ts           # PostgreSQL schema migration & seeding runner
├── src/
│   ├── components/
│   │   ├── analytics/       # Analytics charts & performance metrics
│   │   ├── audit/           # Immutable audit logs viewer
│   │   ├── auth/            # Auth modal, Persona switcher, Pending approval screen
│   │   ├── common/          # Badges, Toasts, Confirmation modals
│   │   ├── crm/             # User Governance & Client CRM Directory (List & Cards)
│   │   ├── dashboard/       # Executive KPI dashboard & SLA widgets
│   │   ├── layout/          # Navbar, Sidebar, Page headers
│   │   ├── profile/         # User profile editor modal
│   │   ├── rbac/            # Role & Permissions matrix editor
│   │   ├── requests/        # Support tickets, Holding requests, Master ledger
│   │   └── settings/        # System configuration & preferences
│   ├── context/
│   │   ├── AppContext.tsx   # Global requests, filters, notifications, audit state
│   │   └── AuthContext.tsx  # User sessions, RBAC state, persona switching, user governance
│   ├── lib/
│   │   ├── storage.ts       # Local storage fallback & initial seed data
│   │   └── supabase.ts      # Supabase client, schema mappers & API operations
│   ├── types/
│   │   └── index.ts         # TypeScript models, enums & interfaces
│   ├── App.tsx              # Root router & layout orchestrator
│   ├── index.css            # Tailwind CSS configuration & design tokens
│   └── main.tsx             # Application entry point
├── supabase/
│   └── schema.sql           # Complete PostgreSQL schema, tables, RLS & seed SQL
├── .env.example             # Template for required environment variables
├── .env.local               # Local development environment configuration
├── DEPLOYMENT.md            # Production deployment & hosting guide
├── package.json             # Dependencies and NPM scripts
├── tsconfig.json            # TypeScript compiler configuration
└── vite.config.ts           # Vite build and plugin configuration
```

---

## 🚀 Getting Started & Local Setup

### Prerequisites
- **Node.js** (v18.0.0 or higher)
- **npm** (v9.0.0+) or **bun**

### Environment Configuration
1. Clone the repository and install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env.local` file by copying the template:
   ```bash
   cp .env.example .env.local
   ```

3. Configure your `.env.local` settings:
   ```env
   # Gemini AI integration (optional)
   GEMINI_API_KEY="your-gemini-api-key"
   APP_URL="http://localhost:3000"

   # Supabase Configuration (Local or Cloud)
   VITE_SUPABASE_URL="http://127.0.0.1:54321"
   VITE_SUPABASE_ANON_KEY="your-supabase-anon-key"
   SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role-key"
   DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
   ```

### Database Migration & Seeding
Run the automated migration script to provision the tables and seed default demo data:
```bash
npm run db:migrate
```

### Running the Development Server
Start the local Vite development server:
```bash
npm run dev
```
Open your browser and navigate to: **`http://localhost:3000`**

---

## 👥 Default Personas & Test Credentials

You can use the **Quick Persona Switcher** in the UI or log in using email/password:

| Persona | Role | Email | Default Password | Permissions |
| :--- | :--- | :--- | :--- | :--- |
| **Sarah Connor** | `Administrator` | `sarah.connor@servicecore.io` | `Password123!` | Full system governance, approvals, user deletion, RBAC editing |
| **Marcus Cole** | `Operator` | `marcus.cole@servicecore.io` | `Password123!` | Ticket assignment, technical support, internal notes, diagnostics |
| **Lin Chen** | `Operator` | `lin.chen@servicecore.io` | `Password123!` | Financial operations, SEPA/wire verification, balance adjustments |
| **Elena Vance** | `Client` | `elena@apexholdings.io` | `Password123!` | Create tickets, fund deposits, request withdrawals ($124,500 holding) |
| **David Sterling**| `Client` | `david@sterlingsolutions.com` | `Password123!` | Create tickets, manage £68,200 holding balance |
| **Maya Al-Mansoor**| `Client` | `maya@levantventures.co` | `Password123!` | Create tickets, manage €310,000 holding balance |

---

## 🛠 Available Scripts

- **`npm run dev`**: Starts the Vite development server on port 3000.
- **`npm run build`**: Compiles TypeScript and creates an optimized production bundle in `/dist`.
- **`npm run deploy`**: Builds the app and publishes directly to the `gh-pages` branch on GitHub.
- **`npm run preview`**: Locally previews the production build.
- **`npm run lint`**: Runs TypeScript type checking (`tsc --noEmit`).
- **`npm run db:migrate`**: Executes `supabase/schema.sql` migrations and seeds default data.
- **`npm run clean`**: Cleans up build artifacts.

---

## 🌐 Production & Cloud Deployment Guides

Detailed, production-ready infrastructure and hosting documentation are available in **[DEPLOYMENT.md](./DEPLOYMENT.md)**:

- 🐙 **[GitHub Pages Deployment Master Guide](./DEPLOYMENT.md#4-github-pages-deployment-master-guide)**:
  - **Automated GitHub Actions** (Pre-configured in [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml))
  - **1-Command CLI Deployment** (`npm run deploy`)
  - **SPA 404 Fallback Routing** ([`public/404.html`](./public/404.html))
  - **Supabase Cloud URL & Redirect Configuration** for GitHub Pages
- ☁️ **[Microsoft Azure Deployment Guide](./DEPLOYMENT.md#5-azure-deployment-master-guide)**:
  - **Azure Static Web Apps (SWA)** (Recommended, pre-configured with [`staticwebapp.config.json`](./staticwebapp.config.json))
  - **Azure App Service (Linux Web App)**
  - **Azure Container Apps (ACA) & Container Registry (ACR)**
  - **Azure Blob Storage + Azure Front Door CDN**
- ⚡ **[Deep-Dive Supabase Cloud Setup Guide](./DEPLOYMENT.md#3-deep-dive-supabase-cloud-setup)**:
  - Schema provisioning & seed execution (`supabase/schema.sql`)
  - Supavisor Connection Pooling (Port 6543)
  - Custom SMTP & Auth redirects (`https://yourdomain.com/**`)
  - Realtime WebSocket replication & Storage attachment policies
  - Automated backups & PITR recovery
- 🚀 **[Other Cloud Hosting Targets](./DEPLOYMENT.md#6-other-production-hosting-targets)**:
  - **Vercel** ([`vercel.json`](./vercel.json))
  - **Netlify** ([`netlify.toml`](./netlify.toml))
  - **Docker & Nginx** ([`Dockerfile`](./Dockerfile), [`nginx.conf`](./nginx.conf))
  - **AWS S3 + CloudFront** & **Cloudflare Pages**

