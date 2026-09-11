import { Hono } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { Bindings } from './index';
import { hashPassword, verifyPassword, generateSessionToken } from './crypto';

export const authRouter = new Hono<{ Bindings: Bindings }>();

// Generate unique IDs (UUID v4 approximation)
const uuidv4 = () => {
  return crypto.randomUUID();
};

authRouter.post('/register', async (c) => {
  const body = await c.req.json();
  const { email, password, full_name, date_of_birth, location, bio, interests, relationship_preference, profile_photo_url } = body;

  if (!email || !password || !full_name) {
    return c.json({ error: 'Missing required fields' }, 400);
  }

  // Check if user exists
  const existingUser = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
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
        .bind(userId, email, hashedPassword, 'user', 'active'),
      c.env.DB.prepare('INSERT INTO profiles (id, user_id, full_name, date_of_birth, location, bio, interests, relationship_preference, profile_photo_url, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(profileId, userId, full_name, date_of_birth, location, bio, JSON.stringify(interests || []), relationship_preference, profile_photo_url, 'pending')
    ]);

    // Create session
    const sessionId = uuidv4();
    const sessionToken = generateSessionToken();
    const tokenHash = await hashPassword(sessionToken); // we can use the same PBKDF2 logic or SHA256 for token
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await c.env.DB.prepare('INSERT INTO sessions (id, user_id, session_token_hash, expires_at) VALUES (?, ?, ?, ?)')
      .bind(sessionId, userId, tokenHash, expiresAt.toISOString()).run();

    setCookie(c, 'session_token', sessionToken, {
      httpOnly: true,
      secure: c.env.ENVIRONMENT === 'production',
      sameSite: 'Lax',
      path: '/',
      expires: expiresAt
    });

    return c.json({ message: 'Registration successful. Your profile has been submitted for review.', user_id: userId }, 201);
  } catch (error) {
    return c.json({ error: 'Database error during registration' }, 500);
  }
});

authRouter.post('/login', async (c) => {
  const { email, password } = await c.req.json();
  if (!email || !password) return c.json({ error: 'Missing credentials' }, 400);

  const user = await c.env.DB.prepare('SELECT id, password_hash, status FROM users WHERE email = ?').bind(email).first<{id: string, password_hash: string, status: string}>();
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return c.json({ error: 'Invalid credentials' }, 401);
  }

  if (user.status === 'suspended' || user.status === 'deleted') {
    return c.json({ error: `Account is ${user.status}` }, 403);
  }

  // Create session
  const sessionId = uuidv4();
  const sessionToken = generateSessionToken();
  const tokenHash = await hashPassword(sessionToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await c.env.DB.prepare('INSERT INTO sessions (id, user_id, session_token_hash, expires_at) VALUES (?, ?, ?, ?)')
    .bind(sessionId, user.id, tokenHash, expiresAt.toISOString()).run();

  setCookie(c, 'session_token', sessionToken, {
    httpOnly: true,
    secure: c.env.ENVIRONMENT === 'production',
    sameSite: 'Lax',
    path: '/',
    expires: expiresAt
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
  
  const tokenHash = await hashPassword(token); // PBKDF2 hash
  const session = await c.env.DB.prepare('SELECT user_id FROM sessions WHERE session_token_hash = ? AND expires_at > CURRENT_TIMESTAMP').bind(tokenHash).first();
  
  if (!session) {
    return c.json({ error: 'Invalid or expired session' }, 401);
  }
  
  c.set('userId', session.user_id);
  await next();
};

authRouter.get('/me', requireUser, async (c) => {
  const userId = c.get('userId');
  const user = await c.env.DB.prepare('SELECT id, email, role, status FROM users WHERE id = ?').bind(userId).first();
  if (!user) return c.json({ error: 'User not found' }, 404);
  return c.json(user);
});
