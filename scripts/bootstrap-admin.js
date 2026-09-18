import { webcrypto } from 'crypto';
import readline from 'readline';

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

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// A hack to hide password input in console
let isPasswordPrompt = false;
process.stdin.on('data', (char) => {
  if (isPasswordPrompt) {
    char = char + '';
    switch (char) {
      case '\n':
      case '\r':
      case '\u0004':
        break;
      default:
        process.stdout.write('\x1B[2K\x1B[200DPassword: ' + '*'.repeat(rl.line.length));
        break;
    }
  }
});

console.log("=== LumiLove Secure Admin Bootstrap ===");
rl.question('Admin Email: ', (email) => {
  if (!email || !email.includes('@')) {
    console.error("Invalid email.");
    process.exit(1);
  }

  isPasswordPrompt = true;
  rl.question('Password: ', async (password) => {
    isPasswordPrompt = false;
    console.log("\n"); // Move to new line after password

    if (password.length < 8) {
      console.error("Password must be at least 8 characters long.");
      process.exit(1);
    }

    try {
      const hashedPassword = await hashPassword(password);
      const adminId = crypto.randomUUID();

      console.log("✅ Hash generated successfully.");
      console.log("\nRun the following command to insert the first admin into your REMOTE database:");
      console.log("--------------------------------------------------");
      console.log(`npx wrangler d1 execute lumilove-db --remote --command="INSERT INTO admin_users (id, email, password_hash) VALUES ('${adminId}', '${email}', '${hashedPassword}');"`);
      console.log("--------------------------------------------------");
      console.log("\n(To run this locally, swap --remote with --local)");
    } catch (e) {
      console.error("Error generating hash:", e);
    } finally {
      process.exit(0);
    }
  });
});
