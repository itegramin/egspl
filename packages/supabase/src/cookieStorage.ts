const COOKIE_PREFIX = 'sb-';
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60;
const COOKIE_DOMAIN = import.meta.env.VITE_AUTH_COOKIE_DOMAIN || '.egraminservices.com';

function isSharedCookieHost(): boolean {
    if (typeof window === 'undefined') return false;
    const domain = COOKIE_DOMAIN.replace(/^\./, '');
    return Boolean(domain) && (window.location.hostname === domain || window.location.hostname.endsWith(`.${domain}`));
}

function cookieAttributes(maxAge: number): string {
    const attributes = [`Path=/`, `Max-Age=${maxAge}`, 'SameSite=Lax'];
    if (isSharedCookieHost()) {
        attributes.push(`Domain=${COOKIE_DOMAIN}`, 'Secure');
    }
    return attributes.join('; ');
}

function getCookie(name: string): string | null {
    const encodedName = `${name}=`;
    const entry = document.cookie.split('; ').find((cookie) => cookie.startsWith(encodedName));
    return entry ? decodeURIComponent(entry.slice(encodedName.length)) : null;
}

function setCookie(name: string, value: string, maxAge: number): void {
    document.cookie = `${name}=${encodeURIComponent(value)}; ${cookieAttributes(maxAge)}`;
}

function removeCookie(name: string): void {
    document.cookie = `${name}=; ${cookieAttributes(0)}`;
}

export const cookieStorageAdapter: Storage = {
    get length() {
        return document.cookie.split('; ').filter((cookie) => cookie.startsWith(COOKIE_PREFIX)).length;
    },

    getItem(key: string): string | null {
        return getCookie(`${COOKIE_PREFIX}${key}`);
    },

    setItem(key: string, value: string): void {
        setCookie(`${COOKIE_PREFIX}${key}`, value, COOKIE_MAX_AGE);
    },

    removeItem(key: string): void {
        removeCookie(`${COOKIE_PREFIX}${key}`);
    },

    key(index: number): string | null {
        const keys = document.cookie
            .split('; ')
            .filter((cookie) => cookie.startsWith(COOKIE_PREFIX))
            .map((cookie) => cookie.slice(0, cookie.indexOf('=')));
        return keys[index] || null;
    },

    clear(): void {
        document.cookie
            .split('; ')
            .filter((cookie) => cookie.startsWith(COOKIE_PREFIX))
            .forEach((cookie) => removeCookie(cookie.slice(0, cookie.indexOf('='))));
    },
};