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

  const saltB64 = arrayBufferToBase64(salt);
  const hashB64 = arrayBufferToBase64(derivedBits);
  
  return `${saltB64}:${hashB64}`;
}

function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Mimic verifyPassword from worker/crypto.ts
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

  const calculatedHashB64 = arrayBufferToBase64(derivedBits);
  return calculatedHashB64 === hashB64;
}

async function runDiagnostics() {
  console.log("Running PBKDF2 Web Crypto Diagnostics...");
  const testPassword = "diagnostictest";
  
  try {
    const hash = await hashPassword(testPassword);
    const isValid = await verifyPassword(testPassword, hash);
    const isInvalid = await verifyPassword("wrongpassword", hash);
    
    console.log("Generated hash successfully.");
    console.log(`Verify with correct password: ${isValid ? 'PASS' : 'FAIL'}`);
    console.log(`Verify with incorrect password: ${!isInvalid ? 'PASS' : 'FAIL'}`);

    if (!isValid) {
      console.error("DIAGNOSTIC FAILURE: Verify returned false for the exact same password!");
    } else {
      console.log("DIAGNOSTIC SUCCESS: The algorithms perfectly match byte-for-byte in Node.js webcrypto.");
    }

  } catch (e) {
    console.error("Error during diagnostics:", e);
  }
}

runDiagnostics();
