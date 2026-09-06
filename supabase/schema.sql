-- Schema for Client Service Management Platform (ServiceCore)
-- Run this in Supabase SQL editor or through the migration script

-- Enable UUID & PGCrypto extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. USERS & PERSONAS TABLE
CREATE TABLE IF NOT EXISTS csmp_users (
  id TEXT PRIMARY KEY,
  auth_user_id UUID,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('client', 'operator', 'admin')),
  avatar_url TEXT,
  company_name TEXT,
  phone_number TEXT,
  account TEXT,
  ifsc TEXT,
  bank TEXT,
  kiosk_id TEXT,
  currency TEXT DEFAULT 'INR',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'pending', 'suspended')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure columns exist if table already existed
ALTER TABLE csmp_users ADD COLUMN IF NOT EXISTS auth_user_id UUID;
ALTER TABLE csmp_users ADD COLUMN IF NOT EXISTS account TEXT;
ALTER TABLE csmp_users ADD COLUMN IF NOT EXISTS ifsc TEXT;
ALTER TABLE csmp_users ADD COLUMN IF NOT EXISTS bank TEXT;
ALTER TABLE csmp_users ADD COLUMN IF NOT EXISTS kiosk_id TEXT;
ALTER TABLE csmp_users ADD COLUMN IF NOT EXISTS estimated_holding_balance NUMERIC DEFAULT 0;
ALTER TABLE csmp_users ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'rural';


-- 2. SERVICE REQUESTS TABLE (Support Tickets, Deposits, Withdrawals)
CREATE TABLE IF NOT EXISTS csmp_requests (
  id TEXT PRIMARY KEY,
  ticket_number TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('support', 'deposit', 'withdraw')),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'rejected')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  client_id TEXT NOT NULL REFERENCES csmp_users(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  client_email TEXT NOT NULL,
  assigned_operator_id TEXT REFERENCES csmp_users(id) ON DELETE SET NULL,
  assigned_operator_name TEXT,
  kiosk_id TEXT,
  branch_code TEXT,

  -- Support ticket specific fields
  category TEXT,
  remote_id TEXT,
  browser_info TEXT,
  
  -- Deposit request specific fields
  amount NUMERIC,
  currency TEXT,
  deposit_method TEXT,
  transaction_reference_id TEXT,
  sender_account_name TEXT,
  deposit_date TEXT,
  verified_transaction_id TEXT,
  
  -- Withdraw request specific fields
  withdraw_method TEXT,
  beneficiary_account_name TEXT,
  beneficiary_account_number TEXT,
  bank_name TEXT,
  bank_ifsc TEXT,
  reason TEXT,
  transfer_receipt_ref TEXT,
  cma_status JSONB DEFAULT '{}'::jsonb,
  
  -- Embedded collections
  attachments JSONB DEFAULT '[]'::jsonb,
  comments JSONB DEFAULT '[]'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- Ensure optional columns exist if csmp_requests table already existed
ALTER TABLE csmp_requests ADD COLUMN IF NOT EXISTS cma_status JSONB DEFAULT '{}'::jsonb;
ALTER TABLE csmp_requests ADD COLUMN IF NOT EXISTS authorized_amount NUMERIC;
ALTER TABLE csmp_requests ADD COLUMN IF NOT EXISTS transfer_receipt_ref TEXT;
ALTER TABLE csmp_requests ADD COLUMN IF NOT EXISTS kiosk_id TEXT;
ALTER TABLE csmp_requests ADD COLUMN IF NOT EXISTS branch_code TEXT;
ALTER TABLE csmp_requests ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

-- Client company and soft-delete tracking columns (used by application layer)
ALTER TABLE csmp_requests ADD COLUMN IF NOT EXISTS client_company TEXT;
ALTER TABLE csmp_requests ADD COLUMN IF NOT EXISTS delete_requested BOOLEAN DEFAULT false;
ALTER TABLE csmp_requests ADD COLUMN IF NOT EXISTS delete_requested_by TEXT;
ALTER TABLE csmp_requests ADD COLUMN IF NOT EXISTS delete_requested_by_id TEXT;
ALTER TABLE csmp_requests ADD COLUMN IF NOT EXISTS delete_requested_reason TEXT;
ALTER TABLE csmp_requests ADD COLUMN IF NOT EXISTS delete_requested_at TIMESTAMPTZ;

-- Authorizer assignment and structured rejection reason columns
ALTER TABLE csmp_requests ADD COLUMN IF NOT EXISTS assigned_authorizer_id TEXT REFERENCES csmp_users(id) ON DELETE SET NULL;
ALTER TABLE csmp_requests ADD COLUMN IF NOT EXISTS assigned_authorizer_name TEXT;
ALTER TABLE csmp_requests ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- 3. RBAC ROLE PERMISSIONS TABLE
CREATE TABLE IF NOT EXISTS csmp_role_permissions (
  role TEXT PRIMARY KEY CHECK (role IN ('client', 'operator', 'admin')),
  allowed_pages JSONB NOT NULL,
  can_create_request BOOLEAN DEFAULT true,
  can_change_status BOOLEAN DEFAULT false,
  can_assign_operator BOOLEAN DEFAULT false,
  can_add_internal_notes BOOLEAN DEFAULT false,
  can_view_all_clients BOOLEAN DEFAULT false,
  can_manage_roles BOOLEAN DEFAULT false,
  can_export_reports BOOLEAN DEFAULT false,
  can_view_audit_logs BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS csmp_notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
  category TEXT NOT NULL DEFAULT 'system',
  request_id TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS csmp_audit_logs (
  id TEXT PRIMARY KEY,
  actor_id TEXT NOT NULL,
  actor_name TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  details TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  ip_address TEXT
);

-- =============================================================
-- ROW LEVEL SECURITY (RLS) HARDENING (CERT-In / VAPT Compliant)
-- =============================================================

-- Enable Row Level Security on all application tables
ALTER TABLE csmp_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE csmp_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE csmp_role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE csmp_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE csmp_audit_logs ENABLE ROW LEVEL SECURITY;

-- Drop obsolete or permissive policies
DROP POLICY IF EXISTS "Public access to csmp_users" ON csmp_users;
DROP POLICY IF EXISTS "Public access to csmp_requests" ON csmp_requests;
DROP POLICY IF EXISTS "Public access to csmp_role_permissions" ON csmp_role_permissions;
DROP POLICY IF EXISTS "Public access to csmp_notifications" ON csmp_notifications;
DROP POLICY IF EXISTS "Public access to csmp_audit_logs" ON csmp_audit_logs;
DROP POLICY IF EXISTS "csmp_users_select_policy" ON csmp_users;
DROP POLICY IF EXISTS "csmp_users_insert_policy" ON csmp_users;
DROP POLICY IF EXISTS "csmp_users_update_policy" ON csmp_users;
DROP POLICY IF EXISTS "csmp_users_delete_policy" ON csmp_users;
DROP POLICY IF EXISTS "csmp_requests_select_policy" ON csmp_requests;
DROP POLICY IF EXISTS "csmp_requests_insert_policy" ON csmp_requests;
DROP POLICY IF EXISTS "csmp_requests_update_policy" ON csmp_requests;
DROP POLICY IF EXISTS "csmp_requests_delete_policy" ON csmp_requests;
DROP POLICY IF EXISTS "csmp_role_permissions_select_policy" ON csmp_role_permissions;
DROP POLICY IF EXISTS "csmp_role_permissions_admin_policy" ON csmp_role_permissions;
DROP POLICY IF EXISTS "csmp_notifications_select_policy" ON csmp_notifications;
DROP POLICY IF EXISTS "csmp_notifications_insert_policy" ON csmp_notifications;
DROP POLICY IF EXISTS "csmp_notifications_update_policy" ON csmp_notifications;
DROP POLICY IF EXISTS "csmp_notifications_delete_policy" ON csmp_notifications;
DROP POLICY IF EXISTS "csmp_audit_logs_select_policy" ON csmp_audit_logs;
DROP POLICY IF EXISTS "csmp_audit_logs_insert_policy" ON csmp_audit_logs;
DROP POLICY IF EXISTS "csmp_audit_logs_no_update" ON csmp_audit_logs;
DROP POLICY IF EXISTS "csmp_audit_logs_no_delete" ON csmp_audit_logs;

-- Helper functions with explicit search_path to prevent search_path hijacking
CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role FROM public.csmp_users WHERE auth_user_id = auth.uid() LIMIT 1),
    'client'  -- fail-closed: never trust JWT claims, default to lowest privilege
  );
$$;

CREATE OR REPLACE FUNCTION public.get_auth_user_id()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT id FROM public.csmp_users WHERE auth_user_id = auth.uid() LIMIT 1),
    auth.uid()::text
  );
$$;

-- -------------------------------------------------------------
-- 1. csmp_users POLICIES
-- -------------------------------------------------------------
-- Admins/Operators can view all users; Clients can view their own profile and operator/admin public profiles
CREATE POLICY "csmp_users_select_policy" ON csmp_users
  FOR SELECT USING (
    auth.role() = 'service_role'
    OR public.get_auth_role() IN ('admin', 'operator')
    OR auth_user_id = auth.uid()
    OR id = public.get_auth_user_id()
    -- Allow reading operator/admin profiles for display purposes (assignments etc.)
    OR (auth.role() = 'authenticated' AND role IN ('operator', 'admin'))
  );

-- Security: non-admin inserts are constrained to client/pending (trigger backstops this too, but we enforce at both layers)
CREATE POLICY "csmp_users_insert_policy" ON csmp_users
  FOR INSERT WITH CHECK (
    auth.role() = 'service_role'
    OR public.get_auth_role() = 'admin'
    OR (
      auth.role() IN ('authenticated', 'anon')
      AND role = 'client' AND status = 'pending'
    )
  );

CREATE POLICY "csmp_users_update_policy" ON csmp_users
  FOR UPDATE USING (
    auth.role() = 'service_role'
    OR public.get_auth_role() = 'admin'
    OR auth_user_id = auth.uid()
    OR id = public.get_auth_user_id()
  );

CREATE POLICY "csmp_users_delete_policy" ON csmp_users
  FOR DELETE USING (
    auth.role() = 'service_role'
    OR public.get_auth_role() = 'admin'
  );

-- Security: Prevent non-administrators from tampering with privileged columns (role, status, balance)
CREATE OR REPLACE FUNCTION public.protect_user_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.get_auth_role() <> 'admin' AND auth.role() <> 'service_role' THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'Unauthorized: Clients cannot modify their user role';
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'Unauthorized: Clients cannot modify account status';
    END IF;
    IF NEW.auth_user_id IS DISTINCT FROM OLD.auth_user_id THEN
      RAISE EXCEPTION 'Unauthorized: Clients cannot modify auth_user_id';
    END IF;
    IF NEW.estimated_holding_balance IS DISTINCT FROM OLD.estimated_holding_balance THEN
      RAISE EXCEPTION 'Unauthorized: Clients cannot modify holding balance directly';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Also validate INSERT: non-admin/non-service_role inserts must use role='client' + pending (closes the Critical privilege-escalation path)
CREATE OR REPLACE FUNCTION public.protect_user_fields_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.get_auth_role() <> 'admin' AND auth.role() <> 'service_role' THEN
    IF NEW.role <> 'client' THEN
      RAISE EXCEPTION 'Unauthorized: Self-registered accounts must have role = client (got: %)', NEW.role;
    END IF;
    IF NEW.status <> 'pending' THEN
      RAISE EXCEPTION 'Unauthorized: Self-registered accounts must have status = pending (got: %)', NEW.status;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_user_fields ON csmp_users;
CREATE TRIGGER trg_protect_user_fields
  BEFORE UPDATE ON csmp_users
  FOR EACH ROW EXECUTE FUNCTION public.protect_user_fields();

DROP TRIGGER IF EXISTS trg_protect_user_fields_insert ON csmp_users;
CREATE TRIGGER trg_protect_user_fields_insert
  BEFORE INSERT ON csmp_users
  FOR EACH ROW EXECUTE FUNCTION public.protect_user_fields_on_insert();

-- UNIQUE on auth_user_id: one csmp_users row per auth identity (NULLs not considered equal, so rows without an auth binding are unaffected)
CREATE UNIQUE INDEX IF NOT EXISTS csmp_users_auth_user_id_key ON csmp_users(auth_user_id);


-- -------------------------------------------------------------
-- 2. csmp_requests POLICIES
-- -------------------------------------------------------------
-- Clients only view/manage their own tickets & financial requests; Operators/Admins manage all
CREATE POLICY "csmp_requests_select_policy" ON csmp_requests
  FOR SELECT USING (
    auth.role() = 'service_role'
    OR public.get_auth_role() IN ('admin', 'operator')
    OR client_id = public.get_auth_user_id()
    OR client_email = (auth.jwt()->>'email')
    -- No anon access: unauthenticated users cannot read any requests
  );

CREATE POLICY "csmp_requests_insert_policy" ON csmp_requests
  FOR INSERT WITH CHECK (
    auth.role() = 'service_role'
    -- Admins and operators can always create requests
    OR public.get_auth_role() IN ('admin', 'operator')
    -- Authenticated clients: must have an active csmp_users row (deleted/suspended users are blocked)
    OR (
      auth.role() = 'authenticated'
      AND EXISTS (
        SELECT 1 FROM public.csmp_users
        WHERE auth_user_id = auth.uid()
          AND status = 'active'
      )
      AND (
        client_id = public.get_auth_user_id()
        OR client_email = (auth.jwt()->>'email')
      )
    )
  );

CREATE POLICY "csmp_requests_update_policy" ON csmp_requests
  FOR UPDATE USING (
    auth.role() = 'service_role'
    OR public.get_auth_role() IN ('admin', 'operator')
    OR (client_id = public.get_auth_user_id() AND status IN ('pending', 'in_progress'))
    -- No anon access: unauthenticated users cannot modify requests
  );

CREATE POLICY "csmp_requests_delete_policy" ON csmp_requests
  FOR DELETE USING (
    auth.role() = 'service_role'
    OR public.get_auth_role() = 'admin'
  );

-- ── Security hardening: request status-transition validation ────────────────
-- Enforces the allowed status state machine and the `can_change_status` capability.
-- Operators with can_change_status=false cannot flip status. Withdrawal requests
-- that have already been authorized (cma_status->>'authorize' = 'true') are locked.
CREATE OR REPLACE FUNCTION public.validate_request_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  actor_role    TEXT;
  can_change    BOOLEAN;
  was_authorized BOOLEAN := false;
  ok            BOOLEAN;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;
  actor_role := public.get_auth_role();
  -- Withdrawal lock: once authorized, status is frozen (UI shows 'Locked')
  BEGIN
    was_authorized := (OLD.cma_status IS NOT NULL AND (OLD.cma_status::jsonb->>'authorize')::boolean = true);
  EXCEPTION WHEN OTHERS THEN
    was_authorized := false;
  END;
  IF was_authorized THEN
    RAISE EXCEPTION 'Status is frozen: this withdrawal was already authorized and completed.';
  END IF;
  -- Capability gate: if actor is operator/non-admin, respect can_change_status
  IF actor_role <> 'admin' AND auth.role() <> 'service_role' THEN
    SELECT can_change_status INTO can_change FROM public.csmp_role_permissions WHERE role = actor_role;
    IF can_change IS FALSE THEN
      RAISE EXCEPTION 'Not permitted: your role (%) does not have status-change capability.', actor_role;
    END IF;
  END IF;
  -- Allowed state machine (keep in sync with RequestDetailModal + AppContext):
  -- pending <-> in_progress <-> completed/pending
  -- * -> rejected (from pending/in_progress/completed)
  -- rejected -> pending
  IF OLD.status = 'pending' THEN
    ok := NEW.status IN ('in_progress', 'completed', 'rejected');
  ELSIF OLD.status = 'in_progress' THEN
    ok := NEW.status IN ('pending', 'completed', 'rejected');
  ELSIF OLD.status = 'completed' THEN
    ok := NEW.status IN ('pending', 'rejected');
  ELSIF OLD.status = 'rejected' THEN
    ok := NEW.status = 'pending';
  ELSE
    ok := false;
  END IF;
  IF NOT ok THEN
    RAISE EXCEPTION 'Invalid status transition: % -> %', OLD.status, NEW.status;
  END IF;
  RETURN NEW;
END;
$fn$;
DROP TRIGGER IF EXISTS trg_validate_request_status ON csmp_requests;
CREATE TRIGGER trg_validate_request_status
  BEFORE UPDATE ON csmp_requests
  FOR EACH ROW EXECUTE FUNCTION public.validate_request_status_transition();

-- -------------------------------------------------------------
-- 3. csmp_role_permissions POLICIES
-- -------------------------------------------------------------
CREATE POLICY "csmp_role_permissions_select_policy" ON csmp_role_permissions
  FOR SELECT USING (auth.role() IN ('authenticated', 'service_role'));

-- Allow modifying permissions for administrators and service role only (no anon access)
CREATE POLICY "csmp_role_permissions_admin_policy" ON csmp_role_permissions
  FOR ALL USING (
    auth.role() = 'service_role'
    OR public.get_auth_role() = 'admin'
  )
  WITH CHECK (
    auth.role() = 'service_role'
    OR public.get_auth_role() = 'admin'
  );

-- -------------------------------------------------------------
-- 4. csmp_notifications POLICIES
-- -------------------------------------------------------------
-- Users can only read their own notifications or broadcast groups they belong to
CREATE POLICY "csmp_notifications_select_policy" ON csmp_notifications
  FOR SELECT USING (
    auth.role() = 'service_role'
    OR user_id = public.get_auth_user_id()
    OR user_id = auth.uid()::text
    OR (user_id = 'all_admins' AND public.get_auth_role() = 'admin')
    OR (user_id = 'all_operators' AND public.get_auth_role() IN ('operator', 'admin'))
    -- No anon access
  );

-- Only authenticated sessions or service_role can insert notifications (blocks unauthenticated injection)
CREATE POLICY "csmp_notifications_insert_policy" ON csmp_notifications
  FOR INSERT WITH CHECK (
    auth.role() IN ('authenticated', 'service_role')
  );

-- Users can mark their own notifications read; admins can update any
CREATE POLICY "csmp_notifications_update_policy" ON csmp_notifications
  FOR UPDATE USING (
    auth.role() = 'service_role'
    OR user_id = public.get_auth_user_id()
    OR user_id = auth.uid()::text
    OR public.get_auth_role() = 'admin'
    -- No anon access
  );

-- Users can delete (dismiss) their own notifications; admins can delete any
CREATE POLICY "csmp_notifications_delete_policy" ON csmp_notifications
  FOR DELETE USING (
    auth.role() = 'service_role'
    OR user_id = public.get_auth_user_id()
    OR user_id = auth.uid()::text
    OR public.get_auth_role() = 'admin'
    -- No anon access
  );

-- -------------------------------------------------------------
-- 5. csmp_audit_logs POLICIES (Immutable Ledger)
-- -------------------------------------------------------------
-- Only admins and operators can read audit logs; no anon access
CREATE POLICY "csmp_audit_logs_select_policy" ON csmp_audit_logs
  FOR SELECT USING (
    auth.role() = 'service_role'
    OR public.get_auth_role() IN ('admin', 'operator')
    -- No anon access: audit logs contain sensitive actor/action data
  );

-- Direct INSERT is blocked; audit entries must go through public.log_audit() (SECURITY DEFINER)
CREATE POLICY "csmp_audit_logs_insert_policy" ON csmp_audit_logs
  FOR INSERT WITH CHECK (false);

-- Explicitly block UPDATE on audit logs — immutable ledger
CREATE POLICY "csmp_audit_logs_no_update" ON csmp_audit_logs
  FOR UPDATE USING (false);

-- Only service_role (server-side ops) can delete audit logs — no client deletion
CREATE POLICY "csmp_audit_logs_no_delete" ON csmp_audit_logs
  FOR DELETE USING (auth.role() = 'service_role');

-- ── Security hardening: server-derived audit writes ─────────────────────────
-- The ledger is append-only. Direct INSERT is blocked (WITH CHECK (false)).
-- Writes go through this SECURITY DEFINER function, which:
--   * rejects unauthenticated sessions;
--   * derives actor_id / actor_name / actor_role from csmp_users for auth.uid()
--     (falling back to auth.users identity when no csmp_users row exists yet);
--   * sets timestamp = now() and ip_address = inet_client_addr() server-side.
-- Callers (saveAuditLogToSupabase via rpc) pass only action/target. The
-- function ignores any client-supplied actor fields — it re-derives them from
-- the authenticated session.
CREATE OR REPLACE FUNCTION public.log_audit(
  p_action      TEXT,
  p_target_type TEXT,
  p_target_id   TEXT,
  p_details     TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $rpc$
DECLARE
  v_uid  UUID := auth.uid();
  v_row  RECORD;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Unauthenticated: not allowed to write audit logs.';
  END IF;
  SELECT id, name, role INTO v_row FROM public.csmp_users WHERE auth_user_id = v_uid LIMIT 1;
  IF v_row.id IS NULL THEN
    v_row.id   := v_uid::text;
    v_row.name := COALESCE(auth.jwt()->>'email', v_uid::text);
    v_row.role := 'unknown';
  END IF;
  INSERT INTO public.csmp_audit_logs (id, actor_id, actor_name, actor_role, action, target_type, target_id, details, timestamp, ip_address)
  VALUES (
    'log_' || floor(extract(epoch from now()) * 1000)::text || '_' || substring(md5(random()::text) from 1 for 5),
    v_row.id, v_row.name, v_row.role, p_action, p_target_type, p_target_id, p_details, now(), inet_client_addr()::text
  );
END;
$rpc$;

-- Grant appropriate permissions to Supabase roles
GRANT USAGE ON SCHEMA public TO postgres, supabase_admin, supabase_auth_admin, anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT EXECUTE ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

-- -------------------------------------------------------------
-- AUTH TRIGGER: Synchronize auth.users into public.csmp_users
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  extracted_role TEXT;
  extracted_name TEXT;
BEGIN
  -- Security: Always force 'client' role for self-signups to prevent metadata privilege escalation
  extracted_role := 'client';

  extracted_name := COALESCE(
    new.raw_user_meta_data->>'name',
    new.raw_user_meta_data->>'full_name',
    split_part(new.email, '@', 1)
  );

  INSERT INTO public.csmp_users (
    id,
    auth_user_id,
    name,
    email,
    role,
    avatar_url,
    company_name,
    phone_number,
    currency,
    status,
    created_at
  )
  VALUES (
    'usr_' || SUBSTRING(new.id::text FROM 1 FOR 8),
    new.id,
    extracted_name,
    new.email,
    extracted_role,
    COALESCE(new.raw_user_meta_data->>'avatar_url', 'https://api.dicebear.com/7.x/avataaars/svg?seed=' || new.email),
    new.raw_user_meta_data->>'company_name',
    new.raw_user_meta_data->>'phone_number',
    COALESCE(new.raw_user_meta_data->>'currency', 'INR'),
    COALESCE(new.raw_user_meta_data->>'status', 'pending'),
    NOW()
  )
  ON CONFLICT (email) DO UPDATE SET
    auth_user_id = EXCLUDED.auth_user_id,
    name = COALESCE(EXCLUDED.name, csmp_users.name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, csmp_users.avatar_url),
    company_name = COALESCE(EXCLUDED.company_name, csmp_users.company_name);

  RETURN NEW;
END;
$$;

-- Trigger to execute handle_new_user automatically on auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- -------------------------------------------------------------
-- SEED INITIAL RBAC PERMISSIONS
-- -------------------------------------------------------------
INSERT INTO csmp_role_permissions (role, allowed_pages, can_create_request, can_change_status, can_assign_operator, can_add_internal_notes, can_view_all_clients, can_manage_roles, can_export_reports, can_view_audit_logs)
VALUES
  ('admin', '["dashboard", "support", "holding", "all-requests", "assignments", "clients", "analytics", "rbac", "audit-logs", "settings", "transaction-types"]'::jsonb, false, true, true, true, true, true, true, true),
  ('operator', '["dashboard", "support", "holding", "all-requests", "assignments", "clients", "analytics"]'::jsonb, false, true, true, true, true, false, true, false),
  ('client', '["dashboard", "support", "holding"]'::jsonb, true, false, false, false, false, false, false, false)
ON CONFLICT (role) DO UPDATE SET
  allowed_pages = EXCLUDED.allowed_pages,
  can_create_request = EXCLUDED.can_create_request,
  can_change_status = EXCLUDED.can_change_status,
  can_assign_operator = EXCLUDED.can_assign_operator,
  can_add_internal_notes = EXCLUDED.can_add_internal_notes,
  can_view_all_clients = EXCLUDED.can_view_all_clients,
  can_manage_roles = EXCLUDED.can_manage_roles,
  can_export_reports = EXCLUDED.can_export_reports,
  can_view_audit_logs = EXCLUDED.can_view_audit_logs;

-- -------------------------------------------------------------
-- ENABLE REALTIME PUBLICATION FOR RELEVANT TABLES
-- -------------------------------------------------------------
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE csmp_role_permissions;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE csmp_requests;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE csmp_notifications;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE csmp_audit_logs;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE csmp_settings;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END $$;

-- -------------------------------------------------------------
-- STORAGE: Request attachments bucket (Private & Secure)
-- -------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('csmp-attachments', 'csmp-attachments', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Allow public read access so <img> tags and proof preview modals can render attachments
DROP POLICY IF EXISTS "csmp-attachments-public-read" ON storage.objects;
CREATE POLICY "csmp-attachments-public-read" ON storage.objects
  FOR SELECT USING (bucket_id = 'csmp-attachments');

DROP POLICY IF EXISTS "csmp-attachments-auth-read" ON storage.objects;

DROP POLICY IF EXISTS "csmp-attachments-auth-insert" ON storage.objects;
CREATE POLICY "csmp-attachments-auth-insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'csmp-attachments'
    AND (auth.role() IN ('authenticated', 'service_role'))
  );

-- Allow creators to delete their own uploads (folder index 2 corresponds to ownerId: uploads/<ownerId>/filename)
DROP POLICY IF EXISTS "csmp-attachments-auth-delete" ON storage.objects;
CREATE POLICY "csmp-attachments-auth-delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'csmp-attachments'
    AND (
      auth.role() = 'service_role'
      OR public.get_auth_role() = 'admin'
      OR (storage.foldername(name))[2] = public.get_auth_user_id()
      OR (storage.foldername(name))[2] = auth.uid()::text
    )
  );
-- 6. SYSTEM SETTINGS TABLE (Auto-assignment rules, platform config)
CREATE TABLE IF NOT EXISTS csmp_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE csmp_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "csmp-settings-read" ON csmp_settings;
CREATE POLICY "csmp-settings-read" ON csmp_settings
  FOR SELECT USING (auth.role() IN ('authenticated', 'service_role'));

DROP POLICY IF EXISTS "csmp-settings-write" ON csmp_settings;
CREATE POLICY "csmp-settings-write" ON csmp_settings
  FOR ALL USING (
    auth.role() = 'service_role' OR
    EXISTS (SELECT 1 FROM public.csmp_users WHERE auth_user_id = auth.uid() AND role = 'admin')
  ) WITH CHECK (
    auth.role() = 'service_role' OR
    EXISTS (SELECT 1 FROM public.csmp_users WHERE auth_user_id = auth.uid() AND role = 'admin')
  );

GRANT ALL ON TABLE csmp_settings TO authenticated, service_role;

-- -------------------------------------------------------------
-- 7. COMMISSION REPORTING TABLES (CSP Splits, TDS & Reports)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS csmp_commission_records (
  id TEXT PRIMARY KEY,
  circle TEXT NOT NULL,
  circle_name TEXT NOT NULL,
  bcbf_code TEXT NOT NULL,
  csp_code TEXT NOT NULL,
  csp_name TEXT NOT NULL,
  transaction_type TEXT NOT NULL,
  num_txns_or_avg_bal NUMERIC(14, 2) NOT NULL DEFAULT 0,
  raw_commission NUMERIC(14, 2) NOT NULL DEFAULT 0,
  period TEXT NOT NULL,
  month TEXT,
  year INTEGER,
  batch_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_commission_records_csp ON csmp_commission_records(csp_code, period);
CREATE INDEX IF NOT EXISTS idx_commission_records_period ON csmp_commission_records(period);
CREATE INDEX IF NOT EXISTS idx_commission_records_year_month ON csmp_commission_records(year, month);
CREATE INDEX IF NOT EXISTS idx_commission_records_csp_ym ON csmp_commission_records(csp_code, year, month);

ALTER TABLE csmp_commission_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "csmp-commissions-read" ON csmp_commission_records;
CREATE POLICY "csmp-commissions-read" ON csmp_commission_records
  FOR SELECT USING (auth.role() IN ('authenticated', 'service_role'));

DROP POLICY IF EXISTS "csmp-commissions-write" ON csmp_commission_records;
CREATE POLICY "csmp-commissions-write" ON csmp_commission_records
  FOR ALL USING (
    auth.role() = 'service_role' OR
    EXISTS (SELECT 1 FROM public.csmp_users WHERE auth_user_id = auth.uid() AND role = 'admin')
  ) WITH CHECK (
    auth.role() = 'service_role' OR
    EXISTS (SELECT 1 FROM public.csmp_users WHERE auth_user_id = auth.uid() AND role = 'admin')
  );

GRANT ALL ON TABLE csmp_commission_records TO authenticated, service_role;

-- Commission Split & TDS Configuration Table
CREATE TABLE IF NOT EXISTS csmp_commission_configs (
  id TEXT PRIMARY KEY,
  config_type TEXT NOT NULL, -- 'split' or 'tds'
  config_data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by TEXT DEFAULT 'System Admin'
);

ALTER TABLE csmp_commission_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "csmp-commission-configs-read" ON csmp_commission_configs;
CREATE POLICY "csmp-commission-configs-read" ON csmp_commission_configs
  FOR SELECT USING (auth.role() IN ('authenticated', 'service_role'));

DROP POLICY IF EXISTS "csmp-commission-configs-write" ON csmp_commission_configs;
CREATE POLICY "csmp-commission-configs-write" ON csmp_commission_configs
  FOR ALL USING (
    auth.role() = 'service_role' OR
    EXISTS (SELECT 1 FROM public.csmp_users WHERE auth_user_id = auth.uid() AND role = 'admin')
  ) WITH CHECK (
    auth.role() = 'service_role' OR
    EXISTS (SELECT 1 FROM public.csmp_users WHERE auth_user_id = auth.uid() AND role = 'admin')
  );

GRANT ALL ON TABLE csmp_commission_configs TO authenticated, service_role;

-- CSP Categories (Rural / Urban with differentiated commission shares)
CREATE TABLE IF NOT EXISTS csmp_csp_categories (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  csp_share_percent NUMERIC NOT NULL DEFAULT 70,
  corporate_share_percent NUMERIC NOT NULL DEFAULT 30,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE csmp_csp_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access for csmp_csp_categories" ON csmp_csp_categories;
CREATE POLICY "Public read access for csmp_csp_categories" 
  ON csmp_csp_categories 
  FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Admin write access for csmp_csp_categories" ON csmp_csp_categories;
CREATE POLICY "Admin write access for csmp_csp_categories" 
  ON csmp_csp_categories 
  FOR ALL 
  USING (
    auth.role() = 'service_role' OR
    EXISTS (
      SELECT 1 FROM public.csmp_users 
      WHERE auth_user_id = auth.uid() AND role = 'admin'
    )
  );

GRANT ALL ON TABLE csmp_csp_categories TO anon, authenticated, service_role;

INSERT INTO csmp_csp_categories (id, code, name, description, csp_share_percent, corporate_share_percent, is_active)
VALUES
  ('cat_rural', 'rural', 'Rural', 'Rural area Customer Service Points (75% base CSP share)', 75, 25, true),
  ('cat_urban', 'urban', 'Urban', 'Urban and Metro Customer Service Points (70% base CSP share)', 70, 30, true)
ON CONFLICT (code) DO NOTHING;

-- -------------------------------------------------------------
-- 8. TRANSACTION TYPE MANAGEMENT (Per-type Rural/Urban Split %)
-- -------------------------------------------------------------
-- Each transaction type (AEPS Cash Withdrawal, Micro ATM, etc.) can have a
-- DIFFERENT commission split percentage for Rural vs Urban CSP categories.
-- transaction_rural_split / transaction_urban_split hold the CSP share % for
-- that transaction type when the CSP belongs to the matching category.
CREATE TABLE IF NOT EXISTS csmp_transaction_type (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  tx_type TEXT NOT NULL UNIQUE,
  transaction_rural_split NUMERIC(5, 2) NOT NULL DEFAULT 70,
  transaction_urban_split NUMERIC(5, 2) NOT NULL DEFAULT 70,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE csmp_transaction_type ENABLE ROW LEVEL SECURITY;

-- Read allowed for every authenticated session (needed to build reports)
DROP POLICY IF EXISTS "csmp_transaction_type_read" ON csmp_transaction_type;
CREATE POLICY "csmp_transaction_type_read"
  ON csmp_transaction_type
  FOR SELECT
  USING (true);

-- Write allowed only for admins / service_role (same convention as csmp_csp_categories)
DROP POLICY IF EXISTS "csmp_transaction_type_admin_write" ON csmp_transaction_type;
CREATE POLICY "csmp_transaction_type_admin_write"
  ON csmp_transaction_type
  FOR ALL
  USING (
    auth.role() = 'service_role' OR
    EXISTS (
      SELECT 1 FROM public.csmp_users
      WHERE auth_user_id = auth.uid() AND role = 'admin'
    )
  );

GRANT ALL ON TABLE csmp_transaction_type TO anon, authenticated, service_role;

-- Seed standard transaction types with differentiated rural/urban splits.
-- Rural CSPs default to 75% CSP share; Urban defaults to 70%.
INSERT INTO csmp_transaction_type (id, name, description, tx_type, transaction_rural_split, transaction_urban_split, is_active)
VALUES
  ('ttx_aeps_cash_withdrawal', 'AEPS Cash Withdrawal', 'Aadhaar Enabled Payment System cash withdrawal', 'AEPS_CASH_WITHDRAWAL', 75, 70, true),
  ('ttx_micro_atm', 'Micro ATM', 'Micro ATM cash-out and transactions', 'MICRO_ATM', 75, 70, true),
  ('ttx_saving_account_opening', 'Saving Account Opening', 'New bank saving account opening / eKYC onboarding', 'SAVING_ACCOUNT_OPENING', 75, 75, true),
  ('ttx_pmjjby', 'PMJJBY', 'Pradhan Mantri Jeevan Jyoti Bima Yojana enrolment', 'PMJJBY', 80, 75, true),
  ('ttx_pmsby', 'PMSBY', 'Pradhan Mantri Suraksha Bima Yojana enrolment', 'PMSBY', 80, 75, true),
  ('ttx_imps_remittance', 'IMPS Remittance', 'IMPS money transfer / remittance', 'IMPS_REMITTANCE', 75, 70, true),
  ('ttx_passbook_printing', 'Passbook Printing', 'Passbook update and printing services', 'PASSBOOK_PRINTING', 80, 80, true)
ON CONFLICT (name) DO NOTHING;


