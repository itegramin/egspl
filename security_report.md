# Security Assessment Report

**Target:** E-Gramin Client Service Management Platform (this repository) — `supabase/schema.sql`, `src/`, `.github/workflows/`, deployment config
**Date:** 2026-09-06
**Tester:** Claude Code (auto/best-free)
**Scope:** White-box source review (SAST, secrets, dependency SCA), RLS policy audit, auth/session flow review, application-layer authorization review
**Authorization:** Owner-authorized — local private repository, no external traffic sent

---

## Executive Summary

4 probing phases were run: (1) dependency audit — **clean** (npm audit: 0 vulns across 265 packages, prod+dev); (2) secret scanning of the working tree **and full git history** — **clean** (no real secrets committed; `.env.local` correctly untracked); (3) SAST (semgrep, 127 rules across OWASP Top 10 / React / JS / TS / security-audit) — **0 ERROR findings**, 6 LOW/WARNING (mostly CI supply-chain tags); (4) a manual audit of the Row-Level-Security policies and the auth/session/RBAC data flow.

The manual phase found the real issues. **This is a Supabase-backed SPA where the database is the security boundary, and the boundary is credibly bypassable**: one **Critical** RLS privilege-escalation, three **High** authorization gaps, and several **Medium/Low** hardening items. The codebase is unusually thoughtful about client-side hygiene (tokens out of localStorage, PII teased out of caches, role not read from JWT claims) — but the database layer leaves the commission/settings tables open to anonymous read/write, the per-role "Operational Action Capabilities" are cosmetic (UI-only), and one critical path lets an authenticated user promote themselves to `admin`.

**Most critical issue:** any authenticated (or even pre-login anon/signup) user can insert a `csmp_users` row for their own `auth_user_id` with `role='admin'`, self-promoting to administrator because the INSERT policy does not constrain the row's role and the `protect_user_fields` guard trigger fires only on UPDATE.

---

## Findings

### [CRITICAL] Privilege escalation: self-insert a `csmp_users` row with `role='admin'`

- **Severity:** CRITICAL
- **CWE:** CWE-269 (Improper Privilege Management) / CWE-863 (Incorrect Authorization)
- **OWASP:** A01:2025 — Broken Access Control
- **Location:** `supabase/schema.sql:227–233` (`csmp_users_insert_policy`) + `supabase/schema.sql:187–198` (`get_auth_role()`) + `supabase/schema.sql:275–278` (trigger scope)
- **Tool:** manual RLS audit

**Description:**
The INSERT policy on `csmp_users` allows any `authenticated` session to insert a row, and its `WITH CHECK` tests only `auth.role()` — it **never constrains the row's `role` column**:

```sql
CREATE POLICY "csmp_users_insert_policy" ON csmp_users
  FOR INSERT WITH CHECK (
    auth.role() = 'service_role'
    OR auth.role() = 'authenticated'   -- any logged-in user…
    OR auth.role() = 'anon'
  );
```

The guard that blocks role changes, `protect_user_fields()` (schema.sql:250), is attached as **`BEFORE UPDATE` only** (schema.sql:276–278) — it does not fire on INSERT.

Every policy in the schema derives the caller's role through `get_auth_role()`, which returns the first `csmp_users` row matching the caller's `auth_user_id`:

```sql
SELECT COALESCE(
  (SELECT role FROM public.csmp_users WHERE auth_user_id = auth.uid() LIMIT 1),
  (auth.jwt()->>'role')
);
```

**Evidence (PoC):**
Any authenticated user (the Supabase anon key + their own session is all that's needed — both are client-side) can insert a row mapping their uid to an `admin` role:

```
POST /rest/v1/csmp_users
Authorization: Bearer <attacker's valid access token>
apikey: <VITE_SUPABASE_ANON_KEY>

{
  "id": "usr_attacker_admin",
  "auth_user_id": "<attackers uid>",
  "name": "Evil Admin",
  "email": "attacker@example.com",
  "role": "admin",
  "status": "active"
}
```

- `csmp_users_insert_policy` → passes (`auth.role()` is `authenticated`), row `role` value never inspected.
- `protect_user_fields` → **not** invoked (no UPDATE).
- `get_auth_role()` → returns `'admin'` server-side (fresh uid has no other lower-privilege row; LIMIT-1 without ORDER BY selects the attacker's row).
- From here every `get_auth_role() = 'admin'` policy authorizes the attacker: user deletion, role updates, request deletion, `csmp_role_permissions` writes, commission-category / transaction-type writes.

The app's own `signUpWithPassword` (AuthContext.tsx:430) does exactly this upsert path with `role:'client'` — an attacker simply issues the same call with `role:'admin'`. Because the app is a public SPA with the anon key bundled client-side, the app's sign-in UI is not a prerequisite; the Supabase Auth REST API and PostgREST are directly callable.

**Remediation:**
1. Make the INSERT policy enforce `role = 'client'` (and `status = 'pending'`) for non-service-role inserts:

```sql
CREATE POLICY "csmp_users_insert_policy" ON csmp_users
  FOR INSERT WITH CHECK (
    auth.role() = 'service_role'
    OR (auth.role() IN ('authenticated', 'anon') AND role = 'client' AND status = 'pending')
  );
```

2. Add the same guard as a `BEFORE INSERT` trigger (extend `protect_user_fields` to `BEFORE INSERT OR UPDATE`), enforcing `NEW.role = 'client'` and `NEW.status = 'pending'` when the actor is not admin/service_role. The existing trigger already has the right logic; it just needs INSERT coverage.
3. Add a `UNIQUE (auth_user_id)` constraint on `csmp_users` so each auth identity owns exactly one profile.
4. Audit current `csmp_users` data for duplicate `auth_user_id` rows.

**Verification:**
As a non-admin, attempt the INSERT above → must fail with RLS/trigger rejection. Then as admin, attempt again → must succeed.

---

### [HIGH] Commission and settings tables: anonymous read **and write**

- **Severity:** HIGH
- **CWE:** CWE-284 / CWE-863 (Authorization Incorrect)
- **OWASP:** A01:2025 — Broken Access Control
- **Location:** `supabase/schema.sql:567–577` (`csmp_settings`), `605–615` (`csmp_commission_records`), `626–636` (`csmp_commission_configs`)
- **Tool:** manual RLS audit

**Description:**
These three tables enable RLS but then immediately grant **wide-open** policies and — decisively — `GRANT ALL ... TO anon`:

```sql
-- csmp_settings
CREATE POLICY "csmp-settings-write" ON csmp_settings
  FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON TABLE csmp_settings TO anon, authenticated, service_role;

-- csmp_commission_records
CREATE POLICY "csmp-commissions-write" ON csmp_commission_records
  FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON TABLE csmp_commission_records TO anon, authenticated, service_role;

-- csmp_commission_configs (the split % / TDS config that drives reporting)
CREATE POLICY "csmp-commission-configs-write" ON csmp_commission_configs
  FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON TABLE csmp_commission_configs TO anon, authenticated, service_role;
```

**Evidence (PoC):**
With only the public anon key (bundled in the frontend), **no login required**:

```
POST /rest/v1/csmp_commission_configs      → anyone can INSERT/UPDATE/DELETE
POST /rest/v1/csmp_commission_records      → anyone can INSERT/UPDATE/DELETE
PATCH /rest/v1/csmp_settings               → anyone can change branding/behaviour
GET  /rest/v1/csmp_commission_records      → anyone can READ csp_name, csp_code, bcbf_code, raw_commission
GET  /rest/v1/csmp_commission_configs      → anyone can READ the split % engine
```

This is the **database-side manifestation of the exact symptom you reported**: the "Operational Action Capabilities" and page-access permissions you configured are UI-only; at the DB layer the commission tables and settings trust *anyone, including unauthenticated visitors*. Financial records (CSP identity + amounts) are both openly readable and freely tamperable. The sibling tables `csmp_csp_categories` and `csmp_transaction_type` got the correct admin-gated write policy — the commission/config/settings tables were left behind with the permissive pattern.

**Remediation:**
Adopt the same convention already used for `csmp_csp_categories` (schema.sql:659–669) and `csmp_transaction_type` (schema.sql:708–718) for all three tables:

```sql
CREATE POLICY "csmp-commissions-write" ON csmp_commission_records
  FOR ALL USING (
    auth.role() = 'service_role' OR
    EXISTS (SELECT 1 FROM public.csmp_users
            WHERE auth_user_id = auth.uid() AND role = 'admin')
  ) WITH CHECK (
    auth.role() = 'service_role' OR
    EXISTS (SELECT 1 FROM public.csmp_users
            WHERE auth_user_id = auth.uid() AND role = 'admin')
  );
```

Keep `SELECT USING (true)` **only if** the requirement is genuinely public read — which is questionable for commission *records* (financial PII). Prefer restricting read to `authenticated` (and ideally admins/operators) and drop `TO anon` from the grants for these tables.

**Verification:**
As anon (no auth header other than the anon key): read/write must now be denied with HTTP 401/403. As admin: allowed.

---

### [HIGH] "Operational Action Capabilities" are cosmetic — enforced only in the React UI

- **Severity:** HIGH
- **CWE:** CWE-862 (Missing Authorization) — function-level
- **OWASP:** A01:2025 — Broken Access Control
- **Location:** `src/types/app.type.ts:266–269`; `src/components/requests/RequestList.tsx:76–78,697`; `src/components/requests/RequestDetailModal.tsx:209–211,587,637`; `src/lib/supabase.ts:564–567`; `supabase/schema.sql:314–320` (`csmp_requests_update_policy`)
- **Tool:** manual review

**Description:**
`canChangeStatus`, `canAssignOperator`, `canAddInternalNotes`, `canCreateRequest`, etc., gate only button visibility/disabled state in the components. Behind the UI:

- `updateRequestInSupabase(reqId, updates)` (supabase.ts:564) is a bare `supabase.from('csmp_requests').update(updates).eq('id', reqId)` with **no capability check**.
- `csmp_requests_update_policy` (schema.sql:314) authorizes **any operator** to update **any** request row:

```sql
OR public.get_auth_role() IN ('admin', 'operator')
```

- There is **no column-level restriction and no status-transition trigger/constraint** anywhere in the schema (verified: no `VALIDATE CONSTRAINT`, no status-flow trigger; only `protect_user_fields`).

**Evidence (PoC):**
An operator whose RBAC matrix has `canChangeStatus: false` can still, from the browser console with their own session and the public anon key:

```
PATCH /rest/v1/csmp_requests?id=eq.<anyrequest>
{"status": "completed"}
```

→ accepted. Likewise `canCreateRequest:false` does not stop a direct `INSERT`, and `canAssignOperator:false` does not stop a direct `PATCH {assigned_operator_id: …}`. The same is true for `allowed_pages` / page-level nav — those are UI affordances, not server authorization.

**Remediation:**
Decide where authorization actually lives for operational actions, then enforce it at the DB:
1. **Column/transition control** — a `BEFORE UPDATE` trigger on `csmp_requests` that validates `status` moves along an allowed state machine (`pending → in_progress → completed` etc.), per `get_auth_role()`, mirroring `protect_user_fields`.
2. **Capability lookup in RLS** — extend policies to consult `csmp_role_permissions.can_change_status` / `can_assign_operator` for the actor's role (the table row is already there):
   ```sql
   AND EXISTS (SELECT 1 FROM public.csmp_role_permissions rp
               WHERE rp.role = public.get_auth_role()
                 AND rp.can_change_status = true)
   ```
3. At minimum, gate status changes to the row's allowed transitions and keep operator capability flags in sync between UI and trigger.

**Verification:**
With an operator whose `can_change_status=false`, `PATCH {status}` must now 401/403/trigger-reject. Re-enable the flag → allowed.

---

### [HIGH] Stored HTML injection into the PDF/print export (`document.write`)

- **Severity:** HIGH
- **CWE:** CWE-79 (Improper Neutralization of Untrusted Input)
- **OWASP:** A03:2025 — Injection
- **Location:** `src/components/requests/DownloadModal.tsx:254–304`
- **Tool:** manual review (semgrep did not flag the template-string sink)

**Description:**
`triggerPDFPrint` builds a full HTML document by concatenating record fields **unescaped** into a template string, then writes it with `win.document.write(html)` into a **same-origin** `window.open('', '_blank')` popup:

```ts
const tableRows = flattened.map((r, i) =>
  `<tr ...>${headers.map(h => `<td ...>${r[h] ?? ''}</td>`).join('')}</tr>`
).join('');
…
win.document.write(html);
```

Field values (`description`, notes, `client_email`, `csp_name`, etc.) are client-derived — a client can store `<img src=x onerror=…>` in a request description. When an admin later exports that list to "PDF/Print", the payload is written verbatim into a same-origin document. Because the popup is same-origin, its scripts can reach `window.opener` (the main app) — reading cookies and app state. **Session tokens live in JS-readable cookies** (see below), so this is a viable session-theft path.

**Remediation:**
Use the DOM API to build the export document instead of HTML-string interpolation (create `document.createElement('td'); td.textContent = value`), or run every value through a strict HTML-escape function (`&` / `<` / `>` / `"` / `'`) before interpolation. Adjust `recordToFlat` so values entering the template are always escaped.

**Verification:**
Insert a row with description `</td><img src=x onerror=alert(document.domain)>`, export the view to PDF, and confirm no script executes (and the cell renders the literal text).

---

### [MEDIUM] Commission records (financial PII) cached in plaintext localStorage

- **Severity:** MEDIUM
- **CWE:** CWE-922 (Sensitive Data in Web Storage) / CWE-312
- **OWASP:** A02:2025 — Cryptographic Failures (at-rest data handling)
- **Location:** `src/lib/storage.ts:42,396–428` (`COMMISSION_RECORDS_KEY`, `saveCommissionRecords`)
- **Tool:** manual review

**Description:**
Requests and notifications were deliberately removed from localStorage ("Financial & PII protection", storage.ts:131–145), yet `saveCommissionRecords` writes up to 500 records containing `csp_name`, `csp_code`, `bcbf_code`, `transaction_type`, `circle_name`, and `raw_commission` — person-identifiable financial data — in plaintext to `localStorage['csmp_commission_records_v1']`. localStorage is readable by any script on the page (the XSS vector above) and persists after logout unless explicitly cleared.

**Remediation:**
Mirror the decisions made for requests/notifications: remove commission *records* from localStorage (keep them in React state / fetch on demand), or cache only an aggregated, non-identifying view (totals/counts by period) with no CSP names, codes, or per-record amounts. Verify `clearSensitiveStorage()` also clears any remaining commission cache.

**Verification:**
After exporting a commission report, inspect `localStorage` — no `csmp_commission_records_v1` entry should exist.

---

### [MEDIUM] Audit-log integrity: any authenticated user can forge ledger rows

- **Severity:** MEDIUM
- **CWE:** CWE-355 (Improper Output Neutralization for Logs) — audit-data integrity
- **OWASP:** A09:2025 — Logging & Monitoring Failures
- **Location:** `supabase/schema.sql:398–401` (`csmp_audit_logs_insert_policy`)
- **Tool:** manual RLS audit

**Description:**
The audit log is well-guarded against UPDATE (immutable) and DELETE (service_role only) — but INSERT is allowed for **any authenticated** role:

```sql
CREATE POLICY "csmp_audit_logs_insert_policy" ON csmp_audit_logs
  FOR INSERT WITH CHECK (auth.role() IN ('authenticated', 'service_role'));
```

Any logged-in user can insert arbitrary `csmp_audit_logs` rows (e.g., fabricate `ADMIN_APPROVED_USER` entries, or fake actor/timestamp fields). The ledger is presented as "immutable," but its *ingress* is untrusted, weakening its evidentiary value — exactly the class of thing CERT-In / VAPT-compliance reviewers look for.

**Remediation:**
Write audit rows only through a `SECURITY DEFINER` function (e.g., `public.log_audit(…)`) that (a) requires an authenticated session and (b) derives the actor + timestamp server-side from `auth.uid()` / `now()` — never accepting client-supplied actor/timestamp. Keep the table's direct INSERT policy `FOR INSERT WITH CHECK (false)` and revoke direct INSERT from `anon, authenticated`.

**Verification:**
As a non-admin, attempt a direct `INSERT` into `csmp_audit_logs` → must fail; logging through the function → must succeed with the server-derived actor.

---

### [LOW] `get_auth_role()` trusts the JWT's own `role` claim when no `csmp_users` row exists

- **Severity:** LOW
- **CWE:** CWE-290 (Authentication Bypass by Spoofing) — defense-in-depth
- **OWASP:** A07:2025 — Identification & Authentication Failures
- **Location:** `supabase/schema.sql:187–198`
- **Tool:** manual review (this directly addresses the JWT-forgery concern raised during review)

**Description / honest verdict on the JWT concern:**
The concern raised was that a forged/self-signed JWT could elevate privileges. That specific attack is **not** viable here: PostgREST/Supabase verifies the presented token's signature against the project **signing secret** (not the public anon key), and a self-signed token fails that verification — `auth.uid()` is null and the caller is treated as unauthenticated. `get_auth_role()`'s `auth.jwt()->>'role'` fallback is therefore only reachable by a **validly-issued** Supabase token, and Supabase's default access tokens do **not** embed a custom `role` claim (the value is null, so the COALESCE returns null, i.e. no privilege).

It is still a **defense-in-depth flaw** to leave a JWT-derived value as the fallback: if the project ever customizes JWT claims (app_metadata → JWT) on the Auth server, that claim silently becomes the GRANT point for every policy. The fail-safe should be to deny, not to trust a claim:

```sql
SELECT COALESCE(
  (SELECT role FROM public.csmp_users WHERE auth_user_id = auth.uid() LIMIT 1),
  'client'                    -- fail closed, never a claim
);
```

**Verification:** sign into the app with a user whose `csmp_users` row is missing → role resolves to `client`, not the JWT claim.

---

### [LOW] Supply-chain hygiene: mutable GitHub Actions tags

- **Severity:** LOW
- **CWE:** CWE-1357 (Reliance on Uncontrolled Component)
- **OWASP:** A06:2025 — Vulnerable & Outdated Components
- **Location:** `.github/workflows/azure-static-web-apps.yml:22,29,51,58,81` (`actions/checkout@v4`, `Azure/static-web-apps-deploy@v1`)
- **Tool:** semgrep `github-actions-mutable-action-tag`

**Description:**
CI steps reference mutable major tags. A maintainer or attacker who moves the tag to a modified action could change what this repo executes.
**Remediation:** pin actions to full SHAs (`actions/checkout@<40-hex-sha>`, `Azure/static-web-apps-deploy@<sha>`), update via a Dependabot/renovate flow that audits the SHA moves.

---

### [LOW] Migration script can disable TLS verification as a fallback

- **Severity:** LOW
- **CWE:** CWE-295 (Improper Certificate Validation)
- **OWASP:** A02:2025 — Cryptographic Failures
- **Location:** `scripts/migrate.ts:35–53`
- **Tool:** semgrep `bypass-tls-verification`

**Description:**
When `supabase/supabase-ca.crt` is absent, `getSslConfig()` falls back to `rejectUnauthorized: false`. The code documents the trade-off and the CA cert is deliberately git-excluded (`supabase/supabase-ca.crt` in `.gitignore`). This is an ops-time decision, but any connection made without the CA present has no MITM protection. **Remediation:** fail the migration and print the "download the CA cert" instructions instead of silently connecting unvalidated; keep the pinned-CA path as the only branch that connects remotely.

---

### [LOW] RBAC permission matrix readable by anonymous visitors

- **Severity:** LOW
- **CWE:** CWE-200 (Exposure of Sensitive Information)
- **OWASP:** A05:2025 — Security Misconfiguration
- **Location:** `supabase/schema.sql:332–334` (`csmp_role_permissions_select_policy` USING (true)) + `GRANT … TO anon` (line 413)
- **Tool:** manual RLS audit

**Description:**
Reading `csmp_role_permissions` is the one piece of the recon a stranger shouldn't need (which pages/capabilities each role holds). `USING (true)` is technically a "read as anon" posture.
**Remediation:** restrict read to `authenticated` (still lets the app build nav after login):
```sql
CREATE POLICY "csmp_role_permissions_select_policy" ON csmp_role_permissions
  FOR SELECT USING (auth.role() IN ('authenticated', 'service_role'));
```
and drop `anon` from the GRANT on that table.

---

## What was tested and found clean

| Check | Result |
|---|---|
| `npm audit` (prod+dev, 265 pkgs) | 0 vulnerabilities |
| semgrep — OWASP Top 10 + React + JS + TS + security-audit (127 rules) | 0 ERROR findings |
| Git-history secret scan (all branches) | no real secrets committed |
| Working-tree secret scan (`src/`, `supabase/`, env examples) | clean |
| `.env.local` git tracking | correctly excluded (`.gitignore` `*.local`, `.env.*`) |
| Service-role key exposure in client | none — client ships only the anon key (`src/lib/supabase.ts:54–58`) |

## Defensive design confirmed sound (keep these)

- **Session tokens in Secure, SameSite=Lax cookies** (`src/lib/cookieStorage.ts`) — not localStorage; CSRF-resistant. *Caveat:* not `HttpOnly`, so XSS still equals token theft — the DownloadModal fix (HIGH above) is the mitigation that matters.
- **Role resolved from `csmp_users` DB row, never from JWT claims** in the app (`AuthContext.tsx:270`, `src/lib/supabase.ts` RLS `get_auth_role()`).
- **Self-signup always `client` + `pending`**, role promotion is admin-gated — in *app logic* (AuthContext); good — now needs to be mirrored at the DB (see CRITICAL fix).
- **Requests / notifications never written to localStorage** (PII avoidance).
- **`protect_user_fields` trigger** blocks role/status/balance changes on UPDATE.
- **Immutable audit ledger** (UPD blocked, DELETE service_role-only) — excepting the forged-INSERT gap above.
- **Suspended users are force-signed-out and RLS-blocked**; suspend-before-delete closes the race on user deletion.

---

## Coverage Statement

- **Tested:** source-level SAST, dependency SCA, secret scan (git history + working tree), full RLS-policy review of every table, auth/session flow, authorization flow, CI/CD config, TLS config.
- **NOT tested:** no live HTTP testing — no black-box scan of a deployed instance was performed, so real-world response headers (CSP/HSTS presence on Azure Static Web Apps), rate limiting, and WAF behavior are unverified. A live-instance check of the CRITICAL/HIGH RLS vectors (anon reads/writes, self-insert) on the *deployed* Supabase project is strongly recommended, since RLS policy fixes only take effect when the migration is applied.
- A clean result from any automated tool covers only what it was pointed at: semgrep did not flag the RLS policy flaws (it scans code, not DDL semantics), and neither scanner reasons about the *capability-vs-row-level* authorization gap. The manual phase was required to find the four DB-layer findings.

## Remediation priority

1. **Apply the CRITICAL + the two HIGH RLS fixes** as one migration (insert-policy role constraint + INSERT trigger + UNIQUE(auth_user_id); commission/settings admin-gated policies; drop `anon` grants).
2. **Add the request status-transition trigger** so `canChangeStatus`/assignment caps are real.
3. **Fix the DownloadModal HTML injection** (DOM building or escaping) — closes the session-theft path.
4. **Move audit writes behind a `SECURITY DEFINER` function.**
5. Then the LOW items (CI tag pinning, migrate TLS fail-closed, permission-matrix read restriction) and the localStorage commission-cache removal.

## Appendix: Raw tool output locations

| Tool / check | Output |
|---|---|
| npm audit | 0 vulns (inline) |
| semgrep (ERROR) | 0 findings |
| semgrep (WARN) | 6 (5× CI mutable tags, 1× TLS fallback) |
| gitleaks | not installed — replaced with git-history + entropy grep (clean) |
| trivy | not installed — SCA covered by npm audit |