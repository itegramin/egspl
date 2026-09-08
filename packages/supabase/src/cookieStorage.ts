const COOKIE_PREFIX = 'sb-';
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60;

function isProductionHost(): boolean {
    return typeof window !== 'undefined' && window.location.hostname.endsWith('.egraminservices.com');
}

function cookieAttributes(maxAge: number): string {
    const attributes = [`Path=/`, `Max-Age=${maxAge}`, 'SameSite=Lax'];
    if (isProductionHost()) {
        attributes.push('Domain=.egraminservices.com', 'Secure');
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