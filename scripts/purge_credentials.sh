#!/usr/bin/env bash
# ============================================================================
# GIT HISTORY PURGE — VULN-0013 (CRITICAL)
# Removes security_report.md (containing postgres superuser password) from ALL
# git history across all branches. Run AFTER rotating the database password.
# ============================================================================
set -euo pipefail

# Configuration
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
TARGET_FILE="security_report.md"
SECRET_PATTERN="SuKu_2919_S"

echo "=== Git History Purge for VULN-0013 ==="
echo "Repo: ${REPO_ROOT}"
echo "Target file: ${TARGET_FILE}"
echo "Secret pattern: ${SECRET_PATTERN}"
echo ""

# 1. Verify the file exists in history
echo ">> Checking if ${TARGET_FILE} exists in git history..."
if git log --all --full-history -- "${TARGET_FILE}" | grep -q "commit"; then
  echo "   FOUND in history (will be purged)"
else
  echo "   NOT found in history — nothing to purge"
  exit 0
fi

# 2. Check for secret in history
echo ">> Scanning for secret pattern in all commits..."
MATCHES=$(git log --all -p -S "${SECRET_PATTERN}" --oneline | head -5)
if [[ -n "${MATCHES}" ]]; then
  echo "   SECRET FOUND in these commits:"
  echo "${MATCHES}"
else
  echo "   Secret pattern not found in diffs (may be in a blob not shown by -p)"
fi

# 3. Check current working tree
if [[ -f "${REPO_ROOT}/${TARGET_FILE}" ]]; then
  echo ">> WARNING: ${TARGET_FILE} exists in working tree — remove it first:"
  echo "   rm ${TARGET_FILE}"
  echo "   git add ${TARGET_FILE}"
  exit 1
fi

# 4. Check .env.local for the secret
if [[ -f "${REPO_ROOT}/.env.local" ]] && grep -q "${SECRET_PATTERN}" "${REPO_ROOT}/.env.local"; then
  echo ">> WARNING: .env.local contains the secret — remove it from working tree:"
  echo "   # Edit .env.local to remove the password line"
  exit 1
fi

# 5. Install git-filter-repo if needed
if ! command -v git-filter-repo &> /dev/null; then
  echo ">> Installing git-filter-repo..."
  if command -v pipx &> /dev/null; then
    pipx install git-filter-repo
  elif command -v pip3 &> /dev/null; then
    pip3 install --user git-filter-repo
  else
    echo "   ERROR: git-filter-repo not found and no pip/pipx available."
    echo "   Install via: pipx install git-filter-repo"
    exit 1
  fi
fi

# 6. Purge the file from ALL history (all refs)
echo ">> Purging ${TARGET_FILE} from entire history (all branches/tags)..."
echo "   This will rewrite ALL commits. Ensure you have a backup!"
read -p "   Type 'YES' to proceed: " CONFIRM
if [[ "${CONFIRM}" != "YES" ]]; then
  echo "Aborted."
  exit 1
fi

cd "${REPO_ROOT}"
git filter-repo --path "${TARGET_FILE}" --invert-paths --force

# 7. Verify purge
echo ">> Verifying purge..."
if git log --all --full-history -- "${TARGET_FILE}" | grep -q "commit"; then
  echo "   ERROR: ${TARGET_FILE} still present in history!"
  exit 1
else
  echo "   OK: ${TARGET_FILE} removed from all history"
fi

# 8. Verify secret is gone
if git log --all -p -S "${SECRET_PATTERN}" --oneline | head -1 | grep -q "commit"; then
  echo "   WARNING: Secret pattern still appears in some diffs"
  git log --all -p -S "${SECRET_PATTERN}" --oneline | head -5
else
  echo "   OK: Secret pattern removed from all diffs"
fi

# 9. Force-push all branches and tags
echo ""
echo ">> Ready to force-push. This OVERWRITES remote history."
echo "   Affected remotes:"
git remote -v

read -p "   Type 'FORCE PUSH' to push to ALL remotes (prod, uat, etc.): " CONFIRM_PUSH
if [[ "${CONFIRM_PUSH}" == "FORCE PUSH" ]]; then
  git push --all --force
  git push --tags --force
  echo "   Force-push complete."
else
  echo "   Push skipped. Run manually when ready:"
  echo "   git push --all --force"
  echo "   git push --tags --force"
fi

# 10. Post-purge instructions
cat << 'EOF'

=== POST-PURGE CHECKLIST ===
[ ] ALL DEVELOPERS MUST RE-CLONE the repository (old clones have the purged commits)
[ ] Rotate the database password in Supabase Dashboard (Settings → Database → Reset password)
[ ] Remove .env.local from any machine that has it
[ ] Add secret scanning to CI (gitleaks/trufflehog) to prevent recurrence
[ ] Contact GitHub Support if cached views/dangling objects need clearing on remote
[ ] Audit database logs for unrecognized 'postgres' role logins (pre-rotation)

EOF

echo "=== Done ==="