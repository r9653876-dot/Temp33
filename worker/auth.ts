import { Hono } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { Bindings } from './index';
import { hashPassword, verifyPassword, generateSessionToken, hashSessionToken } from './crypto';
import { sendVerificationEmail } from './email';
import { sendVerificationSMS } from './sms';

export const authRouter = new Hono<{ Bindings: Bindings }>();

// Generate unique IDs (UUID v4 approximation)
const uuidv4 = () => {
  return crypto.randomUUID();
};

const generateOTP = () => {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  const otp = (array[0] % 1000000).toString().padStart(6, '0');
  return otp;
};

const hashOTP = async (otp: string) => {
  const msgUint8 = new TextEncoder().encode(otp);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

const checkRateLimit = async (db: D1Database, action: string, identifier: string, limit: number, windowMinutes: number) => {
  const now = new Date();
  
  // Clean up old limits
  await db.prepare('DELETE FROM rate_limits WHERE reset_at < CURRENT_TIMESTAMP').run();
  
  let record = await db.prepare('SELECT * FROM rate_limits WHERE action = ? AND identifier = ?').bind(action, identifier).first();
  
  if (record) {
    if (record.count >= limit) return false;
    await db.prepare('UPDATE rate_limits SET count = count + 1 WHERE id = ?').bind(record.id).run();
  } else {
    const resetAt = new Date(now.getTime() + windowMinutes * 60000).toISOString().replace('T', ' ').split('.')[0];
    await db.prepare('INSERT INTO rate_limits (id, action, identifier, count, reset_at) VALUES (?, ?, ?, ?, ?)')
      .bind(uuidv4(), action, identifier, 1, resetAt).run();
  }
  
  return true;
};

const isStrongPassword = (password: string) => {
  const hasMinLength = password.length >= 12;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  return hasMinLength && hasUpper && hasLower && hasNumber && hasSpecial;
};

const isValidEmail = (email: string) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

authRouter.post('/register', async (c) => {
  const body = await c.req.json();
  const { email, password, full_name, date_of_birth, location, profession, bio, interests, relationship_preference, profile_photo_url, is_woman } = body;

  const normalizedEmail = email.trim().toLowerCase();
  
  if (!normalizedEmail || !password || !full_name) {
    return c.json({ error: 'Missing required fields' }, 400);
  }

  if (!isValidEmail(normalizedEmail)) {
    return c.json({ error: 'Invalid email format' }, 400);
  }

  if (!isStrongPassword(password)) {
    return c.json({ error: 'Password must be at least 12 characters and include uppercase, lowercase, number and special character.' }, 400);
  }

  if (is_woman !== true) {
    return c.json({ error: 'LumiLove is a women-only space. You must confirm you identify as a woman.' }, 403);
  }

  const ip = c.req.header('cf-connecting-ip') || 'unknown';
  const allowed = await checkRateLimit(c.env.DB, 'register', ip, 5, 60); // 5 registers per hour per IP
  if (!allowed) return c.json({ error: 'Too many registration attempts' }, 429);

  // Check if user exists
  const existingUser = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(normalizedEmail).first();
  if (existingUser) {
    return c.json({ error: 'Email already registered' }, 400);
  }

  const userId = uuidv4();
  const profileId = uuidv4();
  const hashedPassword = await hashPassword(password);

  // Generate Email OTP
  const otp = generateOTP();
  const otpHash = await hashOTP(otp);
  const otpId = uuidv4();
  const expiresDate = new Date(Date.now() + 10 * 60000); // 10 minutes
  const expiresAtSQLite = expiresDate.toISOString().replace('T', ' ').split('.')[0];

  // Generate Session
  const sessionId = uuidv4();
  const sessionToken = generateSessionToken();
  const tokenHash = await hashSessionToken(sessionToken);
  const sessionExpiresDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const sessionExpiresAtSQLite = sessionExpiresDate.toISOString().replace('T', ' ').split('.')[0];

  // Insert user, profile, otp, and session in a batch transaction
  try {
    await c.env.DB.batch([
      c.env.DB.prepare('INSERT INTO users (id, email, password_hash, role, status, email_verified, mobile_verified) VALUES (?, ?, ?, ?, ?, 0, 0)')
        .bind(userId, normalizedEmail, hashedPassword, 'user', 'active'),
      c.env.DB.prepare('INSERT INTO profiles (id, user_id, full_name, date_of_birth, location, profession, bio, interests, relationship_preference, profile_photo_url, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(profileId, userId, full_name, date_of_birth, location, profession, bio, JSON.stringify(interests || []), relationship_preference, profile_photo_url, 'pending'),
      c.env.DB.prepare('INSERT INTO otps (id, user_id, purpose, otp_hash, expires_at) VALUES (?, ?, ?, ?, ?)')
        .bind(otpId, userId, 'EMAIL_VERIFICATION', otpHash, expiresAtSQLite),
      c.env.DB.prepare('INSERT INTO sessions (id, user_id, session_token_hash, expires_at) VALUES (?, ?, ?, ?)')
        .bind(sessionId, userId, tokenHash, sessionExpiresAtSQLite)
    ]);

    // Send email (does not block or leak OTP)
    const sendResult = await sendVerificationEmail(c.env, normalizedEmail, otp);

    setCookie(c, 'session_token', sessionToken, {
      httpOnly: true,
      secure: c.env.ENVIRONMENT === 'production',
      sameSite: 'Lax',
      path: '/',
      expires: sessionExpiresDate
    });

    if (!sendResult.success) {
      return c.json({ message: "Registration successful, but we couldn't send the verification email. Please log in and try resending the code.", user_id: userId }, 201);
    }

    return c.json({ message: 'Registration successful. Please verify your email.', user_id: userId }, 201);
  } catch (error) {
    return c.json({ error: 'Database error during registration' }, 500);
  }
});

authRouter.post('/login', async (c) => {
  const { email, password } = await c.req.json();
  const normalizedEmail = (email || '').trim().toLowerCase();
  if (!normalizedEmail || !password) return c.json({ error: 'Missing credentials' }, 400);

  const ip = c.req.header('cf-connecting-ip') || 'unknown';
  const allowed = await checkRateLimit(c.env.DB, 'login', normalizedEmail, 10, 15); // 10 attempts per 15 min per email
  if (!allowed) return c.json({ error: 'Too many login attempts. Please try again later.' }, 429);

  const user = await c.env.DB.prepare(`
    SELECT u.id, u.password_hash, u.status as user_status, p.status as profile_status 
    FROM users u 
    LEFT JOIN profiles p ON u.id = p.user_id 
    WHERE u.email = ?
  `).bind(normalizedEmail).first<{id: string, password_hash: string, user_status: string, profile_status: string}>();
  
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return c.json({ error: 'Invalid credentials' }, 401);
  }

  if (user.user_status === 'suspended' || user.user_status === 'deleted') {
    return c.json({ error: `Account is ${user.user_status}` }, 403);
  }

  // Create session
  const sessionId = uuidv4();
  const sessionToken = generateSessionToken();
  const tokenHash = await hashSessionToken(sessionToken);
  const expiresDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const expiresAtSQLite = expiresDate.toISOString().replace('T', ' ').split('.')[0];

  await c.env.DB.prepare('INSERT INTO sessions (id, user_id, session_token_hash, expires_at) VALUES (?, ?, ?, ?)')
    .bind(sessionId, user.id, tokenHash, expiresAtSQLite).run();

  setCookie(c, 'session_token', sessionToken, {
    httpOnly: true,
    secure: c.env.ENVIRONMENT === 'production',
    sameSite: 'Lax',
    path: '/',
    expires: expiresDate
  });

  return c.json({ message: 'Login successful' }, 200);
});

authRouter.post('/logout', async (c) => {
  const token = getCookie(c, 'session_token');
  if (token) {
    const tokenHash = await hashSessionToken(token);
    await c.env.DB.prepare('DELETE FROM sessions WHERE session_token_hash = ?').bind(tokenHash).run();
  }
  deleteCookie(c, 'session_token', { path: '/' });
  return c.json({ message: 'Logged out' });
});

// Helper middleware to validate session
export const requireUser = async (c: any, next: any) => {
  const token = getCookie(c, 'session_token');
  if (!token) return c.json({ error: 'Unauthorized' }, 401);
  
  const tokenHash = await hashSessionToken(token); // Deterministic SHA-256 hash
  const session = await c.env.DB.prepare('SELECT user_id FROM sessions WHERE session_token_hash = ? AND expires_at > CURRENT_TIMESTAMP').bind(tokenHash).first();
  
  if (!session) {
    return c.json({ error: 'Invalid or expired session' }, 401);
  }
  
  c.set('userId', session.user_id);
  return await next();
};

const verifyOTPLogic = async (db: D1Database, userId: string, purpose: string, otp: string) => {
  const hash = await hashOTP(otp);
  // Find active OTP
  const record = await db.prepare('SELECT id, otp_hash, attempts, max_attempts FROM otps WHERE user_id = ? AND purpose = ? AND consumed_at IS NULL AND expires_at > CURRENT_TIMESTAMP ORDER BY created_at DESC LIMIT 1')
    .bind(userId, purpose).first();

  if (!record) {
    return { success: false, error: 'Invalid or expired verification code.' };
  }

  if (record.attempts >= record.max_attempts) {
    return { success: false, error: 'Maximum attempts reached. Please request a new code.' };
  }

  await db.prepare('UPDATE otps SET attempts = attempts + 1 WHERE id = ?').bind(record.id).run();

  if (record.otp_hash !== hash) {
    return { success: false, error: 'Invalid or expired verification code.' };
  }

  await db.prepare('UPDATE otps SET consumed_at = CURRENT_TIMESTAMP WHERE id = ?').bind(record.id).run();
  return { success: true };
};

authRouter.post('/email/resend', requireUser, async (c) => {
  const userId = c.get('userId');
  const user = await c.env.DB.prepare('SELECT email, email_verified, status FROM users WHERE id = ?').bind(userId).first();
  if (!user || user.status === 'suspended' || user.status === 'deleted') return c.json({ error: 'Invalid user status' }, 403);
  if (user.email_verified) return c.json({ error: 'Email already verified' }, 400);

  const allowed = await checkRateLimit(c.env.DB, 'email_resend', userId, 3, 15);
  if (!allowed) return c.json({ error: 'Too many resend attempts. Please wait.' }, 429);

  // Invalidate previous active OTPs
  await c.env.DB.prepare('UPDATE otps SET consumed_at = CURRENT_TIMESTAMP WHERE user_id = ? AND purpose = ? AND consumed_at IS NULL').bind(userId, 'EMAIL_VERIFICATION').run();

  const otp = generateOTP();
  const otpHash = await hashOTP(otp);
  const otpId = uuidv4();
  const expiresDate = new Date(Date.now() + 10 * 60000);
  const expiresAtSQLite = expiresDate.toISOString().replace('T', ' ').split('.')[0];

  await c.env.DB.prepare('INSERT INTO otps (id, user_id, purpose, otp_hash, expires_at) VALUES (?, ?, ?, ?, ?)')
    .bind(otpId, userId, 'EMAIL_VERIFICATION', otpHash, expiresAtSQLite).run();

  const sendResult = await sendVerificationEmail(c.env, user.email as string, otp);
  if (!sendResult.success) {
    return c.json({ error: "We couldn't send the verification code. Please try again." }, 500);
  }

  return c.json({ message: 'Verification code resent.' });
});

authRouter.post('/email/verify', requireUser, async (c) => {
  const { otp } = await c.req.json();
  if (!otp || typeof otp !== 'string') return c.json({ error: 'OTP is required' }, 400);

  const userId = c.get('userId');
  const user = await c.env.DB.prepare('SELECT status FROM users WHERE id = ?').bind(userId).first();
  if (!user || user.status === 'suspended' || user.status === 'deleted') return c.json({ error: 'Invalid user status' }, 403);

  const result = await verifyOTPLogic(c.env.DB, userId, 'EMAIL_VERIFICATION', otp);
  if (!result.success) return c.json({ error: result.error }, 400);

  await c.env.DB.prepare('UPDATE users SET email_verified = 1 WHERE id = ?').bind(userId).run();
  return c.json({ message: 'Email verified successfully.' });
});

authRouter.post('/mobile/set', requireUser, async (c) => {
  const { mobile } = await c.req.json();
  if (!mobile || typeof mobile !== 'string' || mobile.trim() === '') return c.json({ error: 'Mobile number is required' }, 400);

  const normalizedMobile = mobile.replace(/[^\d+]/g, '');
  if (normalizedMobile.length < 5) return c.json({ error: 'Invalid mobile number format' }, 400);

  const userId = c.get('userId');
  const user = await c.env.DB.prepare('SELECT status, email_verified FROM users WHERE id = ?').bind(userId).first();
  if (!user || user.status === 'suspended' || user.status === 'deleted') return c.json({ error: 'Invalid user status' }, 403);
  if (!user.email_verified) return c.json({ error: 'Email must be verified first' }, 400);

  const allowed = await checkRateLimit(c.env.DB, 'mobile_set', userId, 5, 15);
  if (!allowed) return c.json({ error: 'Too many attempts. Please wait.' }, 429);

  // Invalidate previous mobile OTPs
  await c.env.DB.prepare('UPDATE otps SET consumed_at = CURRENT_TIMESTAMP WHERE user_id = ? AND purpose = ? AND consumed_at IS NULL').bind(userId, 'MOBILE_VERIFICATION').run();

  await c.env.DB.prepare('UPDATE users SET mobile_number = ?, mobile_verified = 0 WHERE id = ?').bind(normalizedMobile, userId).run();

  const otp = generateOTP();
  const otpHash = await hashOTP(otp);
  const otpId = uuidv4();
  const expiresDate = new Date(Date.now() + 10 * 60000);
  const expiresAtSQLite = expiresDate.toISOString().replace('T', ' ').split('.')[0];

  await c.env.DB.prepare('INSERT INTO otps (id, user_id, purpose, otp_hash, expires_at) VALUES (?, ?, ?, ?, ?)')
    .bind(otpId, userId, 'MOBILE_VERIFICATION', otpHash, expiresAtSQLite).run();

  const sendResult = await sendVerificationSMS(c.env, normalizedMobile, otp);
  if (!sendResult.success) {
    return c.json({ error: "We couldn't send the verification code. Please try again." }, 500);
  }

  return c.json({ message: 'Verification code sent to mobile.' });
});

authRouter.post('/mobile/resend', requireUser, async (c) => {
  const userId = c.get('userId');
  const user = await c.env.DB.prepare('SELECT mobile_number, mobile_verified, status FROM users WHERE id = ?').bind(userId).first();
  if (!user || user.status === 'suspended' || user.status === 'deleted') return c.json({ error: 'Invalid user status' }, 403);
  if (user.mobile_verified) return c.json({ error: 'Mobile already verified' }, 400);
  if (!user.mobile_number) return c.json({ error: 'No mobile number set' }, 400);

  const allowed = await checkRateLimit(c.env.DB, 'mobile_resend', userId, 3, 15);
  if (!allowed) return c.json({ error: 'Too many resend attempts. Please wait.' }, 429);

  await c.env.DB.prepare('UPDATE otps SET consumed_at = CURRENT_TIMESTAMP WHERE user_id = ? AND purpose = ? AND consumed_at IS NULL').bind(userId, 'MOBILE_VERIFICATION').run();

  const otp = generateOTP();
  const otpHash = await hashOTP(otp);
  const otpId = uuidv4();
  const expiresDate = new Date(Date.now() + 10 * 60000);
  const expiresAtSQLite = expiresDate.toISOString().replace('T', ' ').split('.')[0];

  await c.env.DB.prepare('INSERT INTO otps (id, user_id, purpose, otp_hash, expires_at) VALUES (?, ?, ?, ?, ?)')
    .bind(otpId, userId, 'MOBILE_VERIFICATION', otpHash, expiresAtSQLite).run();

  const sendResult = await sendVerificationSMS(c.env, user.mobile_number as string, otp);
  if (!sendResult.success) {
    return c.json({ error: "We couldn't send the verification code. Please try again." }, 500);
  }

  return c.json({ message: 'Verification code resent.' });
});

authRouter.post('/mobile/verify', requireUser, async (c) => {
  const { otp } = await c.req.json();
  if (!otp || typeof otp !== 'string') return c.json({ error: 'OTP is required' }, 400);

  const userId = c.get('userId');
  const user = await c.env.DB.prepare('SELECT status FROM users WHERE id = ?').bind(userId).first();
  if (!user || user.status === 'suspended' || user.status === 'deleted') return c.json({ error: 'Invalid user status' }, 403);

  const result = await verifyOTPLogic(c.env.DB, userId, 'MOBILE_VERIFICATION', otp);
  if (!result.success) return c.json({ error: result.error }, 400);

  await c.env.DB.prepare('UPDATE users SET mobile_verified = 1 WHERE id = ?').bind(userId).run();
  return c.json({ message: 'Mobile verified successfully.' });
});

authRouter.get('/me', requireUser, async (c) => {
  const userId = c.get('userId');
  const user = await c.env.DB.prepare(`
    SELECT u.id, u.email, u.role, u.status as user_status, u.email_verified, u.mobile_number, u.mobile_verified, p.status as profile_status 
    FROM users u
    LEFT JOIN profiles p ON u.id = p.user_id
    WHERE u.id = ?
  `).bind(userId).first();
  if (!user) return c.json({ error: 'User not found' }, 404);
  return c.json(user);
});
