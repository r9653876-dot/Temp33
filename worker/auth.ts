import { Hono } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { Bindings } from './index';
import { hashPassword, verifyPassword, generateSessionToken, hashSessionToken } from './crypto';

export const authRouter = new Hono<{ Bindings: Bindings }>();

// Generate unique IDs (UUID v4 approximation)
const uuidv4 = () => {
  return crypto.randomUUID();
};

authRouter.post('/register', async (c) => {
  const body = await c.req.json();
  const { email, password, full_name, date_of_birth, location, profession, bio, interests, relationship_preference, profile_photo_url, is_woman } = body;

  const normalizedEmail = email.trim().toLowerCase();
  
  if (!normalizedEmail || !password || !full_name) {
    return c.json({ error: 'Missing required fields' }, 400);
  }

  if (is_woman !== true) {
    return c.json({ error: 'LumiLove is a women-only space. You must confirm you identify as a woman.' }, 403);
  }

  // Check if user exists
  const existingUser = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(normalizedEmail).first();
  if (existingUser) {
    return c.json({ error: 'Email already registered' }, 400);
  }

  const userId = uuidv4();
  const profileId = uuidv4();
  const hashedPassword = await hashPassword(password);

  // Insert user and profile in a batch transaction
  try {
    await c.env.DB.batch([
      c.env.DB.prepare('INSERT INTO users (id, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?)')
        .bind(userId, normalizedEmail, hashedPassword, 'user', 'active'),
      c.env.DB.prepare('INSERT INTO profiles (id, user_id, full_name, date_of_birth, location, profession, bio, interests, relationship_preference, profile_photo_url, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(profileId, userId, full_name, date_of_birth, location, profession, bio, JSON.stringify(interests || []), relationship_preference, profile_photo_url, 'pending')
    ]);

    return c.json({ message: 'Registration successful. Your profile has been submitted for review.', user_id: userId }, 201);
  } catch (error) {
    return c.json({ error: 'Database error during registration' }, 500);
  }
});

authRouter.post('/login', async (c) => {
  const { email, password } = await c.req.json();
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !password) return c.json({ error: 'Missing credentials' }, 400);

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
  // In a real app we'd delete the specific session from DB, here we just clear cookie
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

authRouter.get('/me', requireUser, async (c) => {
  const userId = c.get('userId');
  const user = await c.env.DB.prepare(`
    SELECT u.id, u.email, u.role, u.status as user_status, p.status as profile_status 
    FROM users u
    LEFT JOIN profiles p ON u.id = p.user_id
    WHERE u.id = ?
  `).bind(userId).first();
  if (!user) return c.json({ error: 'User not found' }, 404);
  return c.json(user);
});
