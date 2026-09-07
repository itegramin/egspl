# Azure Front Door Configuration

## Resources to Create

1. **Azure Front Door (Premium or Standard)** with three origins, one per SWA:
   - `egspl-landing`  — origin host `<landing-swa>.azurestaticapps.net`
   - `egspl-auth`     — origin host `<auth-swa>.azurestaticapps.net`
   - `egspl-dashboard`— origin host `<dashboard-swa>.azurestaticapps.net`

2. **Three routing rules (by hostname):**
   | Hostname                       | Origin               |
   |--------------------------------|----------------------|
   | `egraminservices.com`          | egspl-landing origin |
   | `auth.egraminservices.com`     | egspl-auth origin    |
   | `app.egraminservices.com`      | egspl-dashboard origin |

3. **TLS:** Add custom domain validation and managed certificates for each hostname.

## DNS (already configured)

Azure DNS Zone for `egraminservices.com` already has:
- `auth` → CNAME to the (previous) SWA
- `app`  → CNAME to the (previous) SWA

After Front Door is created, update both CNAME records to point to the
Front Door frontend host `<name>.azurefd.net`.

## Deployment Secrets Required

Create six SWA deployment tokens in GitHub → Settings → Secrets:
`AZURE_SWA_TOKEN_LANDING_UAT`, `AZURE_SWA_TOKEN_LANDING_PROD`,
`AZURE_SWA_TOKEN_AUTH_UAT`, `AZURE_SWA_TOKEN_AUTH_PROD`,
`AZURE_SWA_TOKEN_DASHBOARD_UAT`, `AZURE_SWA_TOKEN_DASHBOARD_PROD`.

The new workflow at `.github/workflows/deploy.yml` consumes these tokens.

## Verification Checklist

- [ ] Each subdomain serves the correct app in a browser.
- [ ] Cross-subdomain login works (login on `auth.*` → authenticated on `app.*`).
- [ ] Old `.github/workflows/azure-static-web-apps.yml` retired once Front Door is live.
