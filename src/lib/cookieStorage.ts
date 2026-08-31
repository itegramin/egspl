/**
 * Custom cookie-based storage adapter for Supabase auth.
 *
 * Stores the access_token / refresh_token in Secure, SameSite=Lax cookies
 * so that the session survives page reloads (requirement #3) while keeping
 * the tokens out of XSS-readable localStorage.
 *
 * For a purely client-side SPA hosted on Azure Static Web Apps, httpOnly
 * cookies cannot be set (that requires a server). SameSite=Lax + Secure
 * provides meaningful CSRF protection; true httpOnly would require a
 * server-side token-exchange layer (out of scope here).
 *
 * Cookie attributes:
 *   - Secure:      only sent over HTTPS (includes localhost for dev)
 *   - SameSite:    Lax (prevents CSRF on cross-origin POST)
 *   - Path:        / (site-wide)
 *   - Max-Age:     900 (15 minutes) — mirrors the inactivity timeout
 */

const COOKIE_PREFIX = 'sb-';
const COOKIE_MAX_AGE = 15 * 60; // 15 minutes in seconds
const IS_SECURE =
  window.location.protocol === 'https:' || window.location.hostname === 'localhost';

function getCookieName(baseName: string): string {
  return `${COOKIE_PREFIX}${baseName}`;
}

function setCookie(name: string, value: string, maxAge: number): void {
  const encoded = encodeURIComponent(value);
  const cookie = [
    `${name}=${encoded}`,
    'Path=/',
    'SameSite=Lax',
    IS_SECURE ? 'Secure' : '',
    `Max-Age=${maxAge}`,
  ]
    .filter(Boolean)
    .join('; ');
  document.cookie = cookie;
}

function getCookie(name: string): string | null {
  const match = document.cookie
    .split('; ')
    .find((c) => c.startsWith(`${name}=`));
  if (!match) return null;
  return decodeURIComponent(match.split('=').slice(1).join('='));
}

function removeCookie(name: string): void {
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax${IS_SECURE ? '; Secure' : ''}`;
}

/**
 * @supabase/supabase-js Storage interface adapter using cookies.
 * Implements getItem / setItem / removeItem — all async-compatible.
 */
export const cookieStorageAdapter: Storage = {
  get length() {
    let count = 0;
    for (const key of document.cookie.split('; ')) {
      if (key.startsWith(COOKIE_PREFIX)) count++;
    }
    return count;
  },

  getItem(key: string): string | null {
    return getCookie(getCookieName(key));
  },

  setItem(key: string, value: string): void {
    setCookie(getCookieName(key), value, COOKIE_MAX_AGE);
  },

  removeItem(key: string): void {
    removeCookie(getCookieName(key));
  },

  key(index: number): string | null {
    const keys = document.cookie
      .split('; ')
      .map((c) => c.split('=')[0])
      .filter((k) => k.startsWith(COOKIE_PREFIX));
    return keys[index] || null;
  },

  clear(): void {
    for (const key of document.cookie.split('; ')) {
      if (key.startsWith(COOKIE_PREFIX)) {
        removeCookie(key.split('=')[0]);
      }
    }
  },
};
