# Supabase Cross-Subdomain Auth Configuration

## Manual Steps (Supabase Dashboard)

In **Supabase Dashboard → Authentication → URL Configuration**:

| Setting        | Value                                                |
|----------------|------------------------------------------------------|
| Site URL       | `https://app.egraminservices.com`                    |
| Redirect URLs  | Add: `https://auth.egraminservices.com/auth/callback` |
|                | Add: `https://app.egraminservices.com/auth/callback` |

## How Session Sharing Works

1. User authenticates on `auth.egraminservices.com`.
2. Supabase issues session tokens with cookie config:
   ```
   cookieOptions: { name: 'egspl-session', domain: '.egraminservices.com', ... }
   ```
   — see `packages/supabase/src/client.ts`.
3. The cookie is set on `.egraminservices.com`, readable by all three subdomains.
4. Auth app redirects to `app.egraminservices.com` after login.
5. Dashboard reads the session from the shared cookie on mount via `onAuthStateChange`.

## Verification Checklist

- [ ] Supabase Site URL points to `https://app.egraminservices.com`.
- [ ] Redirect URLs include both `/auth/callback` entries.
- [ ] `packages/supabase/src/client.ts` `cookieOptions.domain` is `.egraminservices.com`.
- [ ] Manual end-to-end test: login on auth subdomain → redirected to dashboard → authenticated.
