/**
 * Security utilities for masking and encrypting sensitive banking details
 */

// Helper to mask account numbers (e.g. 123456789012 -> ••••••••9012)
export function maskAccountNumber(account?: string, visibleDigits = 4): string {
  if (!account) return '';
  const clean = account.trim();
  if (clean.length <= visibleDigits) {
    return '•'.repeat(clean.length);
  }
  const maskedSection = '•'.repeat(clean.length - visibleDigits);
  const visibleSection = clean.slice(-visibleDigits);
  return `${maskedSection}${visibleSection}`;
}

// Format masked account in readable 4-character chunks (e.g., •••• •••• •••• 1234)
export function formatMaskedAccount(account?: string, visibleDigits = 4): string {
  if (!account) return '';
  const masked = maskAccountNumber(account, visibleDigits);
  return masked.replace(/(.{4})/g, '$1 ').trim();
}

const DEFAULT_SECRET_SALT = 'csmp_secure_vault_salt_v1';

/**
 * Derives an AES-GCM CryptoKey using PBKDF2 from a passphrase.
 * Uses 250,000 iterations (OWASP 2023 recommendation for PBKDF2-HMAC-SHA256)
 * to make brute-force attacks against the derived key significantly more costly.
 */
async function getCryptoKey(passphrase: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: enc.encode(DEFAULT_SECRET_SALT),
      iterations: 250_000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt sensitive string data using AES-GCM (Browser Web Crypto API)
 */
export async function encryptSensitiveData(plaintext: string, secretKey = 'csmp_client_secure_key'): Promise<string> {
  if (!plaintext || typeof window === 'undefined' || !window.crypto?.subtle) {
    return plaintext;
  }
  try {
    const key = await getCryptoKey(secretKey);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(plaintext);

    const ciphertext = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv,
      },
      key,
      encoded
    );

    const ivBase64 = btoa(String.fromCharCode(...iv));
    const ctBase64 = btoa(String.fromCharCode(...new Uint8Array(ciphertext)));

    return `enc:v1:${ivBase64}:${ctBase64}`;
  } catch (err) {
    console.error('Encryption failed:', err);
    return plaintext;
  }
}

/**
 * Decrypt sensitive string data previously encrypted with AES-GCM
 */
export async function decryptSensitiveData(ciphertext: string, secretKey = 'csmp_client_secure_key'): Promise<string> {
  if (!ciphertext || !ciphertext.startsWith('enc:v1:') || typeof window === 'undefined' || !window.crypto?.subtle) {
    return ciphertext;
  }
  try {
    const parts = ciphertext.split(':');
    if (parts.length !== 4) return ciphertext;

    const ivStr = atob(parts[2]);
    const ctStr = atob(parts[3]);

    const iv = new Uint8Array(ivStr.length);
    for (let i = 0; i < ivStr.length; i++) iv[i] = ivStr.charCodeAt(i);

    const ct = new Uint8Array(ctStr.length);
    for (let i = 0; i < ctStr.length; i++) ct[i] = ctStr.charCodeAt(i);

    const key = await getCryptoKey(secretKey);
    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv,
      },
      key,
      ct
    );

    return new TextDecoder().decode(decrypted);
  } catch (err) {
    console.error('Decryption failed:', err);
    return ciphertext;
  }
}
