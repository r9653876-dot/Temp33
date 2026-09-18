import { execSync } from 'child_process';
import { webcrypto } from 'crypto';

const crypto = webcrypto;

function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
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

  const calculatedHashB64 = arrayBufferToBase64(derivedBits);
  return calculatedHashB64 === hashB64;
}

async function runTest() {
  try {
    console.log("Fetching remote admin_users...");
    const out = execSync('npx wrangler d1 execute lumilove-db --remote --command="SELECT email, password_hash FROM admin_users" --json');
    const records = JSON.parse(out.toString());
    
    if (records.length === 0 || !records[0].results || records[0].results.length === 0) {
      console.log("FAIL: No admin users found in remote database!");
      return;
    }

    const admin = records[0].results[0];
    console.log(`Found admin with email: ${admin.email}`);
    
    // We cannot know the real password the user typed, but we can verify if the format is correct
    const hash = admin.password_hash;
    const parts = hash.split(':');
    
    console.log(`Stored hash format check: ${parts.length === 2 ? 'PASS' : 'FAIL'} (Found ${parts.length} parts)`);
    if (parts.length === 2) {
      console.log(`Salt length (b64): ${parts[0].length}`);
      console.log(`Hash length (b64): ${parts[1].length}`);
    }

  } catch (e) {
    console.error("Diagnostic error:", e.message);
  }
}

runTest();
