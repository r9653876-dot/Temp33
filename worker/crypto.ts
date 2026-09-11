// worker/crypto.ts

export async function hashPassword(password: string): Promise<string> {
  // Generate random salt
  const salt = crypto.getRandomValues(new Uint8Array(16));
  
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    256
  );

  // Return base64 encoded salt + ":" + base64 encoded hash
  const saltB64 = btoa(String.fromCharCode(...new Uint8Array(salt)));
  const hashB64 = btoa(String.fromCharCode(...new Uint8Array(derivedBits)));
  
  return `${saltB64}:${hashB64}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [saltB64, hashB64] = storedHash.split(":");
  if (!saltB64 || !hashB64) return false;

  const saltStr = atob(saltB64);
  const salt = new Uint8Array(saltStr.length);
  for (let i = 0; i < saltStr.length; i++) {
    salt[i] = saltStr.charCodeAt(i);
  }

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    256
  );

  const calculatedHashB64 = btoa(String.fromCharCode(...new Uint8Array(derivedBits)));
  return calculatedHashB64 === hashB64;
}

export function generateSessionToken(): string {
  const buffer = new Uint8Array(32);
  crypto.getRandomValues(buffer);
  return Array.from(buffer).map(b => b.toString(16).padStart(2, '0')).join('');
}
