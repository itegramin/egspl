import { test, expect } from '@playwright/test';

/**
 * RLS Policy Regression Guard
 *
 * These tests verify that Row-Level Security policies on every sensitive table
 * are in place and configured correctly. If any anon read or write succeeds,
 * a policy has been dropped or widened — the test fails and blocks the CI deploy.
 *
 * How it works:
 * - Tests call the Supabase REST API via fetch() inside page.evaluate(), using
 *   ONLY the anon key and NO Authorization header (pure anon access).
 * - A correctly-configured RLS policy returns HTTP 401/403, or HTTP 200 with an
 *   empty array (RLS silently filters all rows). Both are acceptable outcomes.
 * - What is NOT acceptable: a non-empty data array (anon read leak) or a 2xx
 *   response on a write (anon write allowed).
 * - When VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY env vars are absent
 *   (offline CI / demo mode), every test skips gracefully.
 */

const SENSITIVE_TABLES = [
  'csmp_users',
  'csmp_commission_records',
  'csmp_commission_configs',
  'csmp_settings',
  'csmp_role_permissions',
  'csmp_audit_logs',
] as const;

type Page = import('@playwright/test').Page;

async function getSupabaseCredentials(page: Page) {
  // Prefer process-level env vars (set in CI via secrets / playwright.env)
  const envUrl =
    process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const envKey =
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    '';
  if (envUrl && envKey) return { url: envUrl, key: envKey };

  // Fallback: try to read from the running dev server page globals
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  const creds = await page.evaluate(() => {
    const url =
      (window as any).__SUPABASE_URL__ ||
      (document.querySelector('meta[name="supabase-url"]') as HTMLMetaElement | null)
        ?.content || '';
    const key =
      (window as any).__SUPABASE_ANON_KEY__ ||
      (document.querySelector('meta[name="supabase-anon-key"]') as HTMLMetaElement | null)
        ?.content || '';
    return { url, key };
  });

  return creds.url && creds.key ? creds : null;
}

test.describe('RLS Policy Regression Guard', () => {
  test.setTimeout(2 * 60 * 1000);

  // ── Anon READ: must return 0 rows or 401/403 — never real data ──────────────

  for (const table of SENSITIVE_TABLES) {
    test(`anon cannot read ${table}`, async ({ page }) => {
      const creds = await getSupabaseCredentials(page);
      if (!creds) {
        test.skip(true, 'Supabase not configured — skipping live RLS check');
        return;
      }

      const { url, key } = creds;
      const restUrl = `${url}/rest/v1/${table}?select=id&limit=1`;

      const result = await page.evaluate(
        async ({ restUrl, key }: { restUrl: string; key: string }) => {
          const resp = await fetch(restUrl, {
            headers: {
              apikey: key,
              // NO Authorization header — pure anon access
              Accept: 'application/json',
            },
          }).catch((e: Error) => ({ status: 0, _err: e.message } as any));

          if (resp.status === 0) return { status: 0, rows: [] };

          const body = await (resp as Response).json().catch(() => null);
          return {
            status: (resp as Response).status,
            rows: Array.isArray(body) ? body : [],
          };
        },
        { restUrl, key }
      );

      if (result.status === 200) {
        expect(
          result.rows.length,
          `Anon read of '${table}' returned ${result.rows.length} row(s). ` +
            `RLS policy is missing or too permissive — a REVOKE or policy drop has regressed.`
        ).toBe(0);
      } else {
        expect(
          [401, 403],
          `Anon read of '${table}' returned unexpected HTTP ${result.status}`
        ).toContain(result.status);
      }
    });
  }

  // ── Anon WRITE: must be rejected (401/403/4xx) ──────────────────────────────

  const WRITE_PROBES: { table: string; payload: Record<string, unknown> }[] = [
    {
      table: 'csmp_settings',
      payload: { key: 'rls_anon_probe', value: { probe: true } },
    },
    {
      table: 'csmp_commission_records',
      payload: {
        id: 'rls_probe_anon_cr',
        circle: 'TEST',
        circle_name: 'Test Circle',
        bcbf_code: 'TST',
        csp_code: 'RLS_PROBE',
        csp_name: 'RLS Probe',
        transaction_type: 'TEST',
        num_txns_or_avg_bal: 0,
        raw_commission: 0,
        period: 'January 2026',
      },
    },
    {
      table: 'csmp_commission_configs',
      payload: {
        id: 'rls_probe_anon_cfg',
        config_type: 'split',
        config_data: { probe: true },
      },
    },
    {
      table: 'csmp_role_permissions',
      payload: { role: 'admin', allowed_pages: ['dashboard'], can_manage_roles: true },
    },
  ];

  for (const { table, payload } of WRITE_PROBES) {
    test(`anon cannot write to ${table}`, async ({ page }) => {
      const creds = await getSupabaseCredentials(page);
      if (!creds) {
        test.skip(true, 'Supabase not configured — skipping live RLS check');
        return;
      }

      const { url, key } = creds;

      const result = await page.evaluate(
        async ({
          url,
          table,
          key,
          payload,
        }: {
          url: string;
          table: string;
          key: string;
          payload: Record<string, unknown>;
        }) => {
          const resp = await fetch(`${url}/rest/v1/${table}`, {
            method: 'POST',
            headers: {
              apikey: key,
              // NO Authorization header — pure anon write attempt
              Accept: 'application/json',
              'Content-Type': 'application/json',
              Prefer: 'return=minimal',
            },
            body: JSON.stringify(payload),
          }).catch((e: Error) => ({ status: 0, _err: e.message } as any));

          return { status: (resp as Response).status ?? 0 };
        },
        { url, table, key, payload }
      );

      expect(
        result.status,
        `Anon write to '${table}' returned HTTP ${result.status} — expected 4xx. ` +
          `RLS write policy has been dropped or widened.`
      ).toBeGreaterThanOrEqual(400);
    });
  }

  // ── CRITICAL: csmp_users self-insert with role=admin (privilege escalation) ──

  test('anon cannot self-insert csmp_users with role=admin (privilege escalation)', async ({
    page,
  }) => {
    const creds = await getSupabaseCredentials(page);
    if (!creds) {
      test.skip(true, 'Supabase not configured — skipping live RLS check');
      return;
    }

    const { url, key } = creds;

    const result = await page.evaluate(
      async ({ url, key }: { url: string; key: string }) => {
        const resp = await fetch(`${url}/rest/v1/csmp_users`, {
          method: 'POST',
          headers: {
            apikey: key,
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
          },
          body: JSON.stringify({
            id: 'rls_probe_escalation',
            auth_user_id: '00000000-0000-0000-0000-000000000001',
            name: 'RLS Probe Admin',
            email: 'rls-probe-admin@example.invalid',
            role: 'admin',
            status: 'active',
          }),
        }).catch((e: Error) => ({ status: 0, _err: e.message } as any));

        return { status: (resp as Response).status ?? 0 };
      },
      { url, key }
    );

    expect(
      result.status,
      `CRITICAL: Anon could INSERT a csmp_users row with role=admin! HTTP ${result.status}. ` +
        `The csmp_users_insert_policy WITH CHECK or protect_user_fields_on_insert trigger is missing.`
    ).toBeGreaterThanOrEqual(400);
  });
});
