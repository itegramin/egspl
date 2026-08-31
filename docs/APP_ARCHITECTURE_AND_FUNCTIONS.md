# E-Gramin Client Service Management Platform (CSMP): Complete Functional Architecture & Code Execution Flow

This master documentation provides an exhaustive, step-by-step technical breakdown of every major feature and workflow across the application, detailing frontend UI interactions, React Context state management, Supabase PostgreSQL persistence, Realtime WebSocket propagation, cross-tab synchronization, and security enforcement.

---

## Table of Contents
1. [System Architecture Overview](#1-system-architecture-overview)
2. [Authentication & Session Flow](#2-authentication--session-flow)
3. [Support Ticket Creation Flow](#3-support-ticket-creation-flow)
4. [Holding / Limit Deposit Request Flow](#4-holding--limit-deposit-request-flow)
5. [Holding / Limit Withdrawal & CMA Checkpoint Flow](#5-holding--limit-withdrawal--cma-checkpoint-flow)
6. [Request Status Transition Flow](#6-request-status-transition-flow)
7. [Operator Routing & Assignment Flow](#7-operator-routing--assignment-flow)
8. [Thread Messaging & Internal Staff Notes Flow](#8-thread-messaging--internal-staff-notes-flow)
9. [Two-Step Deletion & Approval Flow](#9-two-step-deletion--approval-flow)
10. [Role-Based Access Control (RBAC) Flow](#10-role-based-access-control-rbac-flow)
11. [Multi-Layer Real-Time Synchronization Engine](#11-multi-layer-real-time-synchronization-engine)
12. [Master Function Reference Index](#12-master-function-reference-index)

---

## 1. System Architecture Overview

```mermaid
graph TD
    subgraph Frontend [React + Vite SPA]
        UI[UI Components & Modals]
        AppContext[AppContext.tsx - Core State Engine]
        AuthContext[AuthContext.tsx - Auth & Identity Engine]
        BC[BroadcastChannel - csmp_live_sync]
    end

    subgraph Storage [Local Persistence]
        LS[(Browser LocalStorage Cache)]
    end

    subgraph Supabase [Supabase Backend & PostgreSQL]
        AuthService[Supabase GoTrue Auth]
        REST[PostgREST REST API]
        RealtimeEngine[Supabase Realtime WebSocket PubSub]
        
        subgraph Tables [PostgreSQL Database Tables]
            T_Users[(csmp_users)]
            T_Requests[(csmp_requests)]
            T_RBAC[(csmp_role_permissions)]
            T_Notifs[(csmp_notifications)]
            T_Audit[(csmp_audit_logs)]
        end
    end

    UI -->|Triggers Action| AppContext
    UI -->|Login / Profile| AuthContext
    AppContext <-->|Syncs non-PII State| LS
    AppContext -->|Broadcasts Event| BC
    BC -->|Syncs Open Tabs| UI
    
    AuthContext <-->|Auth JWT Session| AuthService
    AppContext <-->|CRUD via supabase.ts| REST
    REST <-->|Reads & Writes| Tables
    Tables -->|WAL Change Events| RealtimeEngine
    RealtimeEngine -->|Push Notifications & Updates| AppContext
```

---

## 2. Authentication & Session Flow

```mermaid
sequenceDiagram
    autonumber
    actor User as User (Sign In Form)
    participant AuthScreen as AuthScreen.tsx
    participant AuthCtx as AuthContext.tsx
    participant SupaAuth as supabase.auth
    participant DB_Users as csmp_users (Table)
    participant AppCtx as AppContext.tsx

    User->>AuthScreen: Submits Email & Password
    AuthScreen->>AuthCtx: signInWithPassword(email, password)
    AuthCtx->>SupaAuth: supabase.auth.signInWithPassword({ email, password })
    SupaAuth-->>AuthCtx: Auth Session (JWT access_token + user identity)
    
    AuthCtx->>DB_Users: matchUserToSession(user.id)
    DB_Users-->>AuthCtx: Matched User Profile (role, status, holding balance)
    
    rect rgb(240, 255, 240)
        note over AuthCtx, AppCtx: Session Validation & Hydration
        AuthCtx->>AuthCtx: Checks status !== 'suspended'
        AuthCtx->>AuthCtx: setUserState(matchedUser), setIsAuthenticated(true)
        AuthCtx->>AppCtx: Triggers syncWithSupabase() post-auth
    end
```

### Key Functions
* **`signInWithPassword(email, password)`** in [`src/context/AuthContext.tsx`](file:///d:/github-clone/egramin/src/context/AuthContext.tsx):
  1. Calls Supabase Auth to authenticate credentials.
  2. Resolves user profile and role from `csmp_users`.
  3. Verifies that the user is not suspended (`status !== 'suspended'`).
  4. Records `USER_SIGNED_IN` audit log into `csmp_audit_logs`.
* **`signOut()`** in [`src/context/AuthContext.tsx`](file:///d:/github-clone/egramin/src/context/AuthContext.tsx):
  1. Calls `supabase.auth.signOut()`.
  2. Clears sensitive state (`requests`, `notifications`, `auditLogs`) in `AppContext`.
  3. Redirects to `/auth` view.
* **`matchUserToSession(authUsr)`** in [`src/context/AuthContext.tsx`](file:///d:/github-clone/egramin/src/context/AuthContext.tsx):
  1. Links `auth.users.id` with `csmp_users.auth_user_id`.
  2. Auto-provisions new users as `client` with `status: 'pending'` if first login.

---

## 3. Support Ticket Creation Flow

```mermaid
sequenceDiagram
    autonumber
    actor Client as Client / Operator
    participant Modal as CreateRequestModal.tsx
    participant AppCtx as AppContext.tsx
    participant SupaLib as supabase.ts
    participant DB as csmp_requests (Table)
    participant Notifs as csmp_notifications (Table)
    participant Staff as Staff Members (Realtime)

    Client->>Modal: Submits Support Ticket (Title, Category, Priority, Files)
    Modal->>AppCtx: createSupportTicket(data)
    
    AppCtx->>AppCtx: Generates Ticket Number (e.g. TCK-2026-102)
    AppCtx->>AppCtx: Constructs SupportTicket object
    AppCtx->>AppCtx: Optimistic state update: setRequests([newTicket, ...requests])
    
    par Database Persistence & Audit
        AppCtx->>SupaLib: saveRequestToSupabase(newTicket)
        SupaLib->>DB: INSERT into csmp_requests
        AppCtx->>AppCtx: recordAudit('CREATED_SUPPORT_TICKET', ...)
    and Notifications Dispatch
        AppCtx->>Notifs: dispatchNotification(clientId, "Ticket Created", ...)
        AppCtx->>Notifs: dispatchNotification('all_staff', "New Support Request", ...)
    end

    DB-->>Staff: Realtime push notification received
```

### Key Functions
* **`createSupportTicket(data)`** in [`src/context/AppContext.tsx`](file:///d:/github-clone/egramin/src/context/AppContext.tsx):
  1. Auto-generates ticket sequence (`TCK-YYYY-XXX`).
  2. Formats attachments and environment info (`remoteId`, `browserInfo`).
  3. Dispatches 2 notifications: confirmation to the client and alert to all staff (`all_staff`).
  4. Persists the ticket to `csmp_requests` in Supabase.

---

## 4. Holding / Limit Deposit Request Flow

```mermaid
sequenceDiagram
    autonumber
    actor Client as Client
    participant Modal as CreateRequestModal.tsx
    participant AppCtx as AppContext.tsx
    participant SupaLib as supabase.ts
    participant DB as csmp_requests
    participant Staff as Financial Operators

    Client->>Modal: Submits Deposit Confirmation (Amount, Method, Proof Ref)
    Modal->>AppCtx: createHoldingDeposit(data)
    
    AppCtx->>AppCtx: Generates Ticket Number (HLD-2026-202)
    AppCtx->>AppCtx: Sets priority (urgent if >= 50,000, high otherwise)
    AppCtx->>AppCtx: Optimistic state update (setRequests)
    
    AppCtx->>SupaLib: saveRequestToSupabase(newDeposit)
    SupaLib->>DB: INSERT into csmp_requests
    
    AppCtx->>AppCtx: dispatchNotification(client.id, "Deposit Logged", ...)
    AppCtx->>AppCtx: dispatchNotification('all_staff', "Deposit Verification Required", ...)
    AppCtx->>AppCtx: recordAudit('CREATED_DEPOSIT_REQUEST', ...)
```

### Key Functions
* **`createHoldingDeposit(data)`** in [`src/context/AppContext.tsx`](file:///d:/github-clone/egramin/src/context/AppContext.tsx):
  1. Generates `HLD-YYYY-XXX` sequence.
  2. Sets deposit method (`bank_deposit`, `imps`, `upi`, `bank_wire`).
  3. Alerts financial operators for transaction proof verification.

---

## 5. Holding / Limit Withdrawal & CMA Checkpoint Flow

```mermaid
sequenceDiagram
    autonumber
    actor Staff as Compliance Admin / Operator
    participant Detail as RequestDetailModal.tsx
    participant AppCtx as AppContext.tsx
    participant DB as csmp_requests
    participant Client as Requesting Client

    Staff->>Detail: Checks CMA Checkbox: Configure (C), Make (M), or Authorize (A)
    Detail->>AppCtx: updateWithdrawalCmaStep(requestId, 'authorize', true, authorizedAmount)
    
    AppCtx->>AppCtx: Updates cmaStatus object { configure: true, make: true, authorize: true }
    Note over AppCtx: Authorize (A) = true triggers automatic status = 'completed'
    AppCtx->>AppCtx: Sets resolvedAt = NOW(), authorizedAmount = amount
    AppCtx->>AppCtx: Appends internal audit comment to thread
    
    AppCtx->>DB: saveRequestToSupabase(updatedWithdrawal)
    AppCtx->>AppCtx: recordAudit('UPDATED_WITHDRAWAL_CMA', ...)
    AppCtx->>Client: dispatchNotification(clientId, "Withdrawal Authorized & Completed!", ...)
    AppCtx->>Staff: Confetti animation triggers on Authorize
```

### Key Functions
* **`createHoldingWithdraw(data)`** in [`src/context/AppContext.tsx`](file:///d:/github-clone/egramin/src/context/AppContext.tsx): Logs withdrawal payout request.
* **`updateWithdrawalCmaStep(requestId, step, checked, authorizedAmount)`** in [`src/context/AppContext.tsx`](file:///d:/github-clone/egramin/src/context/AppContext.tsx):
  1. Updates the 3-tier CMA workflow:
     * **C - Configure**: Initial parameter & account validation.
     * **M - Make**: Payout transaction initiation.
     * **A - Authorize**: Final fund release authorization.
  2. When **Authorize (A)** is checked, it **automatically transitions request status to `completed`** and records the final authorized amount.

---

## 6. Request Status Transition Flow

```mermaid
sequenceDiagram
    autonumber
    actor Operator as Operator / Admin
    participant UI as RequestDetailModal.tsx / Action Dropdown
    participant AppCtx as AppContext.tsx
    participant DB as csmp_requests
    participant Client as Client

    Operator->>UI: Selects new status (e.g. 'completed' or 'rejected') with optional note
    UI->>AppCtx: updateRequestStatus(requestId, 'completed', note, verifiedTxId)
    
    AppCtx->>AppCtx: Sets status = 'completed', resolvedAt = NOW()
    AppCtx->>AppCtx: Appends status transition note to comments thread
    AppCtx->>DB: saveRequestToSupabase(targetReq)
    
    AppCtx->>Client: dispatchNotification(clientId, "Request Approved", note, 'success')
    AppCtx->>AppCtx: dispatchNotification('all_staff', "Status Update", ...)
    AppCtx->>AppCtx: recordAudit('UPDATED_REQUEST_STATUS', ...)
```

### Key Functions
* **`updateRequestStatus(requestId, newStatus, note, verifiedTxId)`** in [`src/context/AppContext.tsx`](file:///d:/github-clone/egramin/src/context/AppContext.tsx):
  1. Updates status (`pending`, `in_progress`, `completed`, `rejected`).
  2. Sets `resolvedAt` timestamp on terminal states.
  3. Embeds system comment into ticket history.
  4. Dispatches target notifications to both the client and staff logs.

---

## 7. Operator Routing & Assignment Flow

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Admin / Lead Operator
    participant UI as RequestDetailModal.tsx
    participant AppCtx as AppContext.tsx
    participant DB as csmp_requests
    participant Operator as Assigned Operator

    Admin->>UI: Selects operator from staff dropdown
    UI->>AppCtx: assignOperator(requestId, operatorId)
    
    AppCtx->>AppCtx: Updates assignedOperatorId & assignedOperatorName
    AppCtx->>AppCtx: Moves pending request to 'in_progress' automatically
    AppCtx->>DB: saveRequestToSupabase(updatedReq)
    
    AppCtx->>Operator: dispatchNotification(operatorId, "Assigned to TCK-XXX", ...)
    AppCtx->>AppCtx: recordAudit('ASSIGNED_OPERATOR', ...)
```

### Key Functions
* **`assignOperator(requestId, operatorId)`** in [`src/context/AppContext.tsx`](file:///d:/github-clone/egramin/src/context/AppContext.tsx):
  1. Resolves operator profile from `allUsers`.
  2. Binds operator to request.
  3. If status was `pending`, automatically upgrades it to `in_progress`.
  4. Sends private notification to the assigned operator's inbox.

---

## 8. Thread Messaging & Internal Staff Notes Flow

```mermaid
sequenceDiagram
    autonumber
    actor Author as Client OR Operator
    participant UI as RequestDetailModal.tsx
    participant AppCtx as AppContext.tsx
    participant DB as csmp_requests
    participant Recipient as Target Recipient

    Author->>UI: Submits message (content, attachments, isInternal flag)
    UI->>AppCtx: addComment(requestId, content, isInternal, attachments)
    
    AppCtx->>AppCtx: Constructs Comment object (authorId, role, avatar, timestamp)
    AppCtx->>AppCtx: Appends to comments array
    AppCtx->>DB: saveRequestToSupabase(updatedReq)
    
    alt isInternal === true (Staff Only)
        AppCtx->>AppCtx: recordAudit('ADDED_INTERNAL_NOTE', ...)
        Note over AppCtx: Hidden from client view
    else Public Message
        AppCtx->>Recipient: Dispatches notification to client or operator
        AppCtx->>AppCtx: recordAudit('POSTED_COMMENT', ...)
    end
```

### Key Functions
* **`addComment(requestId, content, isInternal, attachments)`** in [`src/context/AppContext.tsx`](file:///d:/github-clone/egramin/src/context/AppContext.tsx):
  1. Inserts comment with author metadata.
  2. If `isInternal: true`, flags comment for operator/admin view only.
  3. Routes smart notifications: if client replied, notifies assigned operator; if staff replied publicly, notifies client.

---

## 9. Two-Step Deletion & Approval Flow

```mermaid
sequenceDiagram
    autonumber
    actor Staff as Client / Operator
    participant UI as RequestDetailModal.tsx
    participant AppCtx as AppContext.tsx
    participant DB as csmp_requests
    actor Admin as Platform Admin

    Staff->>UI: Requests Deletion (Provides Reason)
    UI->>AppCtx: requestDeletion(requestId, reason)
    AppCtx->>AppCtx: Sets deleteRequested = true, deleteRequestedReason = reason
    AppCtx->>DB: saveRequestToSupabase(updatedReq)
    AppCtx->>Admin: dispatchNotification(admin.id, "Deletion Approval Needed", ...)

    alt Admin Approves Deletion
        Admin->>UI: Clicks "Approve Deletion"
        UI->>AppCtx: approveDeletion(requestId)
        AppCtx->>DB: deleteRequestFromSupabase(requestId)
        AppCtx->>Staff: dispatchNotification(requesterId, "Deletion Approved", ...)
    else Admin Rejects Deletion
        Admin->>UI: Clicks "Reject Deletion"
        UI->>AppCtx: rejectDeletion(requestId)
        AppCtx->>AppCtx: Clears deleteRequested flags, appends internal rejection note
        AppCtx->>DB: saveRequestToSupabase(updatedReq)
        AppCtx->>Staff: dispatchNotification(requesterId, "Deletion Rejected", ...)
    end
```

### Key Functions
* **`requestDeletion(requestId, reason)`**: Flags request for admin review without deleting data.
* **`approveDeletion(requestId)`**: Admin permanently deletes request from database.
* **`rejectDeletion(requestId)`**: Admin rejects deletion request and keeps ticket active.

---

## 10. Role-Based Access Control (RBAC) Flow

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Admin User
    participant Matrix as RolePermissionMatrix.tsx
    participant AppCtx as AppContext.tsx
    participant DB as csmp_role_permissions
    participant OtherTabs as Client Sessions

    Admin->>Matrix: Toggles page view or capability
    Matrix->>AppCtx: togglePageForRole(role, pageId) OR updateRolePermission(role, updates)
    
    AppCtx->>AppCtx: Optimistic state update (setPermissions)
    AppCtx->>DB: savePermissionsToSupabase(role, updatedPerms)
    AppCtx->>AppCtx: BroadcastChannel.postMessage('RBAC_UPDATED')
    AppCtx->>AppCtx: recordAudit('MODIFIED_RBAC_PERMISSIONS', ...)
    
    DB-->>OtherTabs: Realtime event triggers
    OtherTabs->>OtherTabs: Updates permissions state
    OtherTabs->>OtherTabs: Sidebar navigation updates reactively
    OtherTabs->>OtherTabs: Route guard redirects if active page was revoked
```

### Key Functions
* **`togglePageForRole(role, pageId)`**: Adds/removes page ID in `allowed_pages` (jsonb).
* **`updateRolePermission(role, updates)`**: Updates functional capabilities and syncs to Supabase.
* **`isPageAllowed(pageId)`**: Evaluates if the current user's role has access to `pageId`.

---

## 11. Multi-Layer Real-Time Synchronization Engine

The application implements a 3-tier synchronization architecture to guarantee real-time updates across distributed sessions:

```mermaid
graph LR
    subgraph Layer1 [Layer 1: Supabase Realtime WebSocket]
        L1[postgres_changes on csmp_requests, csmp_notifications, csmp_role_permissions, csmp_audit_logs]
    end

    subgraph Layer2 [Layer 2: Browser BroadcastChannel]
        L2[BroadcastChannel 'csmp_live_sync' for zero-latency same-device tab sync]
    end

    subgraph Layer3 [Layer 3: Periodic Heartbeat Polling]
        L3[4-second interval background polling fallback]
    end

    Layer1 --> AppState[React Context State]
    Layer2 --> AppState
    Layer3 --> AppState
```

1. **Supabase Realtime Channel (`csmp_realtime_updates`)**:
   * Direct WebSocket subscriptions on PostgreSQL tables (`csmp_requests`, `csmp_notifications`, `csmp_role_permissions`, `csmp_audit_logs`).
   * Pushes database changes to all connected users globally.
2. **Cross-Tab BroadcastChannel (`csmp_live_sync`)**:
   * Instant cross-tab messaging on the same machine without consuming network bandwidth.
3. **Heartbeat Polling Interval (4000ms)**:
   * Self-healing background polling to guarantee consistency under unstable network conditions.

---

## 12. Master Function Reference Index

| Function Name | Location | Triggered When | Description |
|---|---|---|---|
| `signInWithPassword` | `AuthContext.tsx` | User submits login form | Authenticates with Supabase, loads user profile, verifies status. |
| `signOut` | `AuthContext.tsx` | User clicks Sign Out | Terminates auth session, resets sensitive in-memory state. |
| `createSupportTicket` | `AppContext.tsx` | Submitting new support request | Generates `TCK-` ID, uploads attachments, alerts client + staff. |
| `createHoldingDeposit` | `AppContext.tsx` | Submitting deposit slip | Generates `HLD-` ID, alerts finance operators for verification. |
| `createHoldingWithdraw` | `AppContext.tsx` | Submitting withdrawal payout | Generates payout ticket, queues for compliance checks. |
| `updateWithdrawalCmaStep` | `AppContext.tsx` | Clicking C, M, or A checkpoint | Manages 3-step CMA workflow; Authorize (A) auto-completes request. |
| `updateRequestStatus` | `AppContext.tsx` | Status dropdown changed | Updates status (`pending`, `in_progress`, `completed`, `rejected`), logs note, triggers confetti on complete. |
| `assignOperator` | `AppContext.tsx` | Selecting operator in modal | Assigns staff member, upgrades status to `in_progress`, notifies operator. |
| `addComment` | `AppContext.tsx` | Posting comment or internal note | Adds public reply or internal staff note to thread, routes notifications. |
| `requestDeletion` | `AppContext.tsx` | Clicking "Request Deletion" | Submits deletion proposal with reason for admin review. |
| `approveDeletion` | `AppContext.tsx` | Admin clicks "Approve Deletion" | Permanently deletes request from database. |
| `rejectDeletion` | `AppContext.tsx` | Admin clicks "Reject Deletion" | Clears deletion flag, logs rejection note to thread. |
| `togglePageForRole` | `AppContext.tsx` | Clicking page checkbox in RBAC | Updates `allowed_pages` (jsonb) column for role in `csmp_role_permissions`. |
| `updateRolePermission` | `AppContext.tsx` | Clicking capability toggle in RBAC | Updates operational flags in `csmp_role_permissions`. |
| `markNotificationAsRead` | `AppContext.tsx` | Clicking notification item | Marks single notification as read in database. |
| `markAllNotificationsAsRead` | `AppContext.tsx` | Clicking "Mark All Read" | Bulk updates unread notifications in database. |
| `checkSupabaseHealth` | `supabase.ts` | Settings view / Health check | Probes database connectivity, measures latency, returns table counts. |
| `exportRequestsToCSV` | `storage.ts` | Clicking "Export CSV" | Serializes filtered request dataset into downloadable CSV spreadsheet. |
