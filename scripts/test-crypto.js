import { webcrypto } from 'crypto';

const crypto = webcrypto;

async function hashPassword(password) {
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

  const saltB64 = btoa(String.fromCharCode(...new Uint8Array(salt)));
  const hashB64 = btoa(String.fromCharCode(...new Uint8Array(derivedBits)));
  
  return `${saltB64}:${hashB64}`;
}

async function verifyPassword(password, storedHash) {
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

async function test() {
  const pass = "password123";
  const hash = await hashPassword(pass);
  console.log("Hash:", hash);
  const verify1 = await verifyPassword(pass, hash);
  console.log("Verify correct:", verify1);
  const verify2 = await verifyPassword("wrong", hash);
  console.log("Verify incorrect:", verify2);
}

test();
