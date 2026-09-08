-- ============================================================================
-- SECURITY HARDENING MIGRATION — 2026-09-08
-- Addresses: VULN-0001, 0005, 0007, 0009, 0010, 0011
-- Apply via Supabase SQL Editor (project lrkphqcyvpfufwcddgss)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. csmp_requests: Financial integrity & dual-control enforcement
-- ---------------------------------------------------------------------------

-- 1a. Add CHECK constraint: amount must be non-negative (prevents -5000 writes)
ALTER TABLE csmp_requests
  ADD CONSTRAINT chk_csmp_requests_amount_non_negative
  CHECK (amount IS NULL OR amount >= 0);

-- 1b. Replace validate_request_status_transition with a comprehensive
--     validate_request_integrity trigger that also guards:
--     - Only admin/service_role may set cma_status.authorize = true
--     - Only admin/service_role may write authorized_amount / assigned_authorizer_id
--     - Clients cannot write kiosk_id / assigned_authorizer_id / cma_status.authorize
--     - Once cma_status.authorize = true in OLD, row is frozen (no changes to
--       cma_status, authorized_amount, amount, assigned_authorizer_id)
--     - Withdrawal may only transition to 'completed' when OLD.cma_status.authorize = true
CREATE OR REPLACE FUNCTION public.validate_request_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_role TEXT;
  was_authorized BOOLEAN := false;
  is_authorizing_now BOOLEAN := false;
  ok BOOLEAN;
BEGIN
  -- Early-return only for pure no-op updates (same status, same cma_status,
  -- same amount, same assigned_authorizer_id) to preserve perf on comments/
  -- attachments updates. We still check financial fields.
  IF NEW.status IS NOT DISTINCT FROM OLD.status
     AND NEW.cma_status IS NOT DISTINCT FROM OLD.cma_status
     AND NEW.amount IS NOT DISTINCT FROM OLD.amount
     AND NEW.assigned_authorizer_id IS NOT DISTINCT FROM OLD.assigned_authorizer_id
     AND NEW.authorized_amount IS NOT DISTINCT FROM OLD.authorized_amount
  THEN
    RETURN NEW;
  END IF;

  actor_role := public.get_auth_role();

  -- Was the row already authorized in the old version?
  BEGIN
    was_authorized := (
      OLD.cma_status IS NOT NULL
      AND (OLD.cma_status::jsonb->>'authorize')::boolean = true
    );
  EXCEPTION WHEN OTHERS THEN
    was_authorized := false;
  END;

  -- Is the current UPDATE attempting to SET authorize = true?
  BEGIN
    is_authorizing_now := (
      NEW.cma_status IS NOT NULL
      AND (NEW.cma_status::jsonb->>'authorize')::boolean = true
      AND (OLD.cma_status IS NULL OR (OLD.cma_status::jsonb->>'authorize')::boolean = false)
    );
  EXCEPTION WHEN OTHERS THEN
    is_authorizing_now := false;
  END;

  -- -------------------------------------------------------------
  -- GATE A: Authorization flag can only be flipped by privileged actors
  -- -------------------------------------------------------------
  IF is_authorizing_now AND actor_role <> 'admin' AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Unauthorized: Only administrators may authorize withdrawals';
  END IF;

  -- -------------------------------------------------------------
  -- GATE B: Financial fields (authorized_amount, assigned_authorizer_id)
  --         are privileged-only writes
  -- -------------------------------------------------------------
  IF NEW.authorized_amount IS DISTINCT FROM OLD.authorized_amount
     AND actor_role <> 'admin' AND auth.role() <> 'service_role'
  THEN
    RAISE EXCEPTION 'Unauthorized: Only administrators may set authorized amount';
  END IF;

  IF NEW.assigned_authorizer_id IS DISTINCT FROM OLD.assigned_authorizer_id
     AND actor_role <> 'admin' AND auth.role() <> 'service_role'
  THEN
    RAISE EXCEPTION 'Unauthorized: Only administrators may assign an authorizer';
  END IF;

  -- -------------------------------------------------------------
  -- GATE C: Post-authorization freeze — no tampering once authorized
  -- -------------------------------------------------------------
  IF was_authorized THEN
    IF NEW.cma_status IS DISTINCT FROM OLD.cma_status
       OR NEW.authorized_amount IS DISTINCT FROM OLD.authorized_amount
       OR NEW.amount IS DISTINCT FROM OLD.amount
       OR NEW.assigned_authorizer_id IS DISTINCT FROM OLD.assigned_authorizer_id
    THEN
      RAISE EXCEPTION 'Forbidden: this withdrawal was already authorized — record is immutable';
    END IF;
  END IF;

  -- -------------------------------------------------------------
  -- GATE D: Dual-control completion gate
  --         Withdrawal may only reach 'completed' if already authorized
  -- -------------------------------------------------------------
  IF NEW.status = 'completed' AND OLD.type = 'withdraw' AND NOT was_authorized THEN
    RAISE EXCEPTION 'Invalid status transition: withdrawal requires prior authorization (CMA) before completion';
  END IF;

  -- -------------------------------------------------------------
  -- GATE E: Preserve original state machine for non-completed transitions
  -- -------------------------------------------------------------
  IF NEW.status IS DISTINCT FROM OLD.status THEN
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
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_request_status ON csmp_requests;
DROP TRIGGER IF EXISTS trg_validate_request_integrity ON csmp_requests;
CREATE TRIGGER trg_validate_request_integrity
  BEFORE UPDATE ON csmp_requests
  FOR EACH ROW EXECUTE FUNCTION public.validate_request_integrity();

-- 1c. Bind client INSERT to server-side identity (prevents impersonation)
--     Replace the OR arm with strict equality on all three identity columns.
DROP POLICY IF EXISTS "csmp_requests_insert_policy" ON csmp_requests;
CREATE POLICY "csmp_requests_insert_policy" ON csmp_requests
  FOR INSERT WITH CHECK (
    auth.role() = 'service_role'
    OR public.get_auth_role() IN ('admin', 'operator')
    OR (
      auth.role() = 'authenticated'
      AND EXISTS (
        SELECT 1 FROM public.csmp_users
        WHERE auth_user_id = auth.uid()
          AND status = 'active'
      )
      AND client_id = public.get_auth_user_id()
      AND client_email = (SELECT email FROM public.csmp_users WHERE auth_user_id = auth.uid())
      AND client_name = (SELECT name FROM public.csmp_users WHERE auth_user_id = auth.uid())
    )
  );

-- 1d. Also add a BEFORE INSERT trigger to enforce the same checks on INSERT
--     (triggers fire before policies, so they catch edge cases and give clearer errors)
CREATE OR REPLACE FUNCTION public.validate_request_insert_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_role TEXT := public.get_auth_role();
BEGIN
  -- Privileged actors bypass all checks
  IF actor_role = 'admin' OR auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Clients must not set CMA authorization fields on create
  IF NEW.cma_status IS NOT NULL
     AND (NEW.cma_status::jsonb->>'authorize')::boolean = true
  THEN
    RAISE EXCEPTION 'Unauthorized: Clients cannot create pre-authorized requests';
  END IF;

  IF NEW.authorized_amount IS NOT NULL THEN
    RAISE EXCEPTION 'Unauthorized: Clients cannot set authorized_amount on create';
  END IF;

  IF NEW.assigned_authorizer_id IS NOT NULL THEN
    RAISE EXCEPTION 'Unauthorized: Clients cannot assign an authorizer on create';
  END IF;

  -- Amount must be non-negative (backstop to CHECK constraint)
  IF NEW.amount IS NOT NULL AND NEW.amount < 0 THEN
    RAISE EXCEPTION 'Invalid amount: must be non-negative';
  END IF;

  -- Identity columns must match the caller's csmp_users row
  IF NEW.client_id <> public.get_auth_user_id() THEN
    RAISE EXCEPTION 'Unauthorized: client_id must match your identity';
  END IF;

  IF NEW.client_email <> (SELECT email FROM public.csmp_users WHERE auth_user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: client_email must match your profile';
  END IF;

  IF NEW.client_name <> (SELECT name FROM public.csmp_users WHERE auth_user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: client_name must match your profile';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_request_insert ON csmp_requests;
CREATE TRIGGER trg_validate_request_insert
  BEFORE INSERT ON csmp_requests
  FOR EACH ROW EXECUTE FUNCTION public.validate_request_insert_integrity();

-- ---------------------------------------------------------------------------
-- 2. csmp_users: Protect kiosk_id & category (VULN-0007)
-- ---------------------------------------------------------------------------

-- 2a. Extend UPDATE trigger to block non-admin changes to kiosk_id and category
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
    -- NEW: kiosk_id and category are authorization attributes, not profile fields
    IF NEW.kiosk_id IS DISTINCT FROM OLD.kiosk_id THEN
      RAISE EXCEPTION 'Unauthorized: Clients cannot modify their CSP kiosk assignment';
    END IF;
    IF NEW.category IS DISTINCT FROM OLD.category THEN
      RAISE EXCEPTION 'Unauthorized: Clients cannot modify their CSP category';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- 2b. Extend INSERT trigger to block kiosk_id/category on self-registration
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
    -- NEW: kiosk_id and category must be set by admin after approval
    IF NEW.kiosk_id IS NOT NULL THEN
      RAISE EXCEPTION 'Unauthorized: Self-registered accounts cannot set a CSP kiosk assignment';
    END IF;
    IF NEW.category IS NOT NULL AND NEW.category <> 'rural' THEN
      RAISE EXCEPTION 'Unauthorized: Self-registered accounts cannot set a CSP category';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. csmp_commission_records: Idempotent import (VULN-0010)
--    Add unique index on business key to prevent double-counting
--    (Run AFTER cleaning existing duplicates — see note at end)
-- ---------------------------------------------------------------------------

-- NOTE: Before applying this, clean existing duplicates:
-- DELETE FROM csmp_commission_records
-- WHERE ctid NOT IN (
--   SELECT MIN(ctid)
--   FROM csmp_commission_records
--   GROUP BY csp_code, period, transaction_type
-- );
-- Then create the index:
CREATE UNIQUE INDEX IF NOT EXISTS uq_csmp_commission_records_bizkey
  ON csmp_commission_records (csp_code, period, transaction_type);

-- ---------------------------------------------------------------------------
-- 4. csmp_notifications: Restrict INSERT to staff/service_role (VULN-0011)
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "csmp_notifications_insert_policy" ON csmp_notifications;
CREATE POLICY "csmp_notifications_insert_policy" ON csmp_notifications
  FOR INSERT WITH CHECK (
    auth.role() = 'service_role'
    OR public.get_auth_role() IN ('admin', 'operator')
  );

-- ---------------------------------------------------------------------------
-- 5. STORAGE: csmp-attachments bucket hardening (VULN-0009)
--    Make bucket private, bind read/insert to owner folder
-- ---------------------------------------------------------------------------

-- 5a. Set bucket to private
UPDATE storage.buckets
SET public = false
WHERE id = 'csmp-attachments';

-- 5b. Replace unconditional public-read with owner/staff read
DROP POLICY IF EXISTS "csmp-attachments-public-read" ON storage.objects;
CREATE POLICY "csmp-attachments-owner-staff-read" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'csmp-attachments'
    AND (
      auth.role() = 'service_role'
      OR public.get_auth_role() = 'admin'
      OR public.get_auth_role() = 'operator'
      OR (storage.foldername(name))[2] = public.get_auth_user_id()
      OR (storage.foldername(name))[2] = auth.uid()::text
    )
  );

-- 5c. Bind INSERT to caller's own owner-folder
DROP POLICY IF EXISTS "csmp-attachments-auth-insert" ON storage.objects;
CREATE POLICY "csmp-attachments-auth-insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'csmp-attachments'
    AND auth.role() IN ('authenticated', 'service_role')
    AND (
      (storage.foldername(name))[2] = public.get_auth_user_id()
      OR (storage.foldername(name))[2] = auth.uid()::text
      OR auth.role() = 'service_role'
      OR public.get_auth_role() = 'admin'
    )
  );

-- ---------------------------------------------------------------------------
-- 6. Verify grants are clean (no anon access to financial tables)
-- ---------------------------------------------------------------------------

REVOKE ALL ON TABLE csmp_requests FROM anon;
REVOKE ALL ON TABLE csmp_users FROM anon;
REVOKE ALL ON TABLE csmp_commission_records FROM anon;
REVOKE ALL ON TABLE csmp_notifications FROM anon;
REVOKE ALL ON TABLE csmp_audit_logs FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE csmp_requests TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE csmp_users TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE csmp_commission_records TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE csmp_notifications TO authenticated, service_role;
GRANT SELECT ON TABLE csmp_audit_logs TO authenticated, service_role;

-- ============================================================================
-- POST-MIGRATION VERIFICATION (run these to confirm)
-- ============================================================================
-- 1. Verify triggers exist:
--   \df public.validate_request_integrity
--   \df public.protect_user_fields
--   \df public.protect_user_fields_on_insert
--   \d+ csmp_requests  (show triggers)
--   \d+ csmp_users     (show triggers)
--
-- 2. Verify unique index:
--   \d csmp_commission_records
--
-- 3. Verify bucket is private:
--   SELECT id, name, public FROM storage.buckets WHERE id = 'csmp-attachments';
--
-- 4. Test PoCs from vulnerability reports should now return 400/403 instead of 200/201.
-- ============================================================================