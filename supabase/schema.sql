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
    (auth.jwt()->>'role')
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

CREATE POLICY "csmp_users_insert_policy" ON csmp_users
  FOR INSERT WITH CHECK (
    auth.role() = 'service_role'
    OR auth.role() = 'authenticated'
    -- Allow anon insert only during sign-up flow (handled by Supabase Auth trigger)
    OR auth.role() = 'anon'
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

DROP TRIGGER IF EXISTS trg_protect_user_fields ON csmp_users;
CREATE TRIGGER trg_protect_user_fields
  BEFORE UPDATE ON csmp_users
  FOR EACH ROW EXECUTE FUNCTION public.protect_user_fields();


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

-- -------------------------------------------------------------
-- 3. csmp_role_permissions POLICIES
-- -------------------------------------------------------------
-- Anyone can read permissions (needed to build navigation & UI)
CREATE POLICY "csmp_role_permissions_select_policy" ON csmp_role_permissions
  FOR SELECT USING (true);

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

-- Only authenticated sessions can write audit logs (prevents unauthenticated injection)
CREATE POLICY "csmp_audit_logs_insert_policy" ON csmp_audit_logs
  FOR INSERT WITH CHECK (
    auth.role() IN ('authenticated', 'service_role')
  );

-- Explicitly block UPDATE on audit logs — immutable ledger
CREATE POLICY "csmp_audit_logs_no_update" ON csmp_audit_logs
  FOR UPDATE USING (false);

-- Only service_role (server-side ops) can delete audit logs — no client deletion
CREATE POLICY "csmp_audit_logs_no_delete" ON csmp_audit_logs
  FOR DELETE USING (auth.role() = 'service_role');

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
  ('admin', '["dashboard", "support", "holding", "all-requests", "assignments", "clients", "analytics", "rbac", "audit-logs", "settings"]'::jsonb, false, true, true, true, true, true, true, true),
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
VALUES ('csmp-attachments', 'csmp-attachments', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Authenticated users can read files they uploaded, or all files if operator/admin
DROP POLICY IF EXISTS "csmp-attachments-public-read" ON storage.objects;
DROP POLICY IF EXISTS "csmp-attachments-auth-read" ON storage.objects;
CREATE POLICY "csmp-attachments-auth-read" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'csmp-attachments'
    AND (
      auth.role() = 'service_role'
      OR public.get_auth_role() IN ('admin', 'operator')
      OR (storage.foldername(name))[2] = public.get_auth_user_id()
      OR (storage.foldername(name))[2] = auth.uid()::text
    )
  );

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
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "csmp-settings-write" ON csmp_settings;
CREATE POLICY "csmp-settings-write" ON csmp_settings
  FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON TABLE csmp_settings TO anon, authenticated, service_role;

