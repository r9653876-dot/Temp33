import { Hono } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { Bindings } from './index';
import { verifyPassword, hashPassword, generateSessionToken, hashSessionToken } from './crypto';

export const adminRouter = new Hono<{ Bindings: Bindings }>();

const uuidv4 = () => crypto.randomUUID();

const checkRateLimit = async (db: D1Database, action: string, identifier: string, limit: number, windowMinutes: number) => {
  const now = new Date();
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

adminRouter.post('/login', async (c) => {
  const reqBody = await c.req.json();
  const { email, password } = reqBody;
  
  const diagnostic = {
    receivedEmailField: !!email,
    receivedPasswordField: !!password,
    passwordFieldLength: password ? password.length : 0,
    normalizedEmail: email ? email.trim().toLowerCase() : null,
    dbUserFound: false,
    passwordVerified: false,
    sessionCreated: false,
    dbTableName: 'admin_users'
  };

  if (!email || !password) {
    return c.json({ error: 'Missing credentials', diag: diagnostic }, 400);
  }

  const normalizedEmail = email.trim().toLowerCase();
  
  const ip = c.req.header('cf-connecting-ip') || 'unknown';
  const allowed = await checkRateLimit(c.env.DB, 'admin_login', normalizedEmail, 5, 15);
  if (!allowed) return c.json({ error: 'Too many login attempts', diag: diagnostic }, 429);

  let admin;
  try {
    admin = await c.env.DB.prepare('SELECT id, password_hash FROM admin_users WHERE email = ?').bind(normalizedEmail).first<{id: string, password_hash: string}>();
    diagnostic.dbUserFound = !!admin;
  } catch (e) {
    return c.json({ error: 'Database query failed', diag: diagnostic }, 500);
  }

  if (!admin) {
    // Return early to see if THIS is the failure point
    return c.json({ error: 'Invalid credentials - User not found in admin_users', diag: diagnostic }, 401);
  }

  try {
    diagnostic.passwordVerified = await verifyPassword(password, admin.password_hash);
  } catch (e) {
    return c.json({ error: 'Password verification crashed', diag: diagnostic }, 500);
  }

  if (!diagnostic.passwordVerified) {
    return c.json({ error: 'Invalid credentials - Password mismatch', diag: diagnostic }, 401);
  }

  try {
    const sessionId = uuidv4();
    const sessionToken = generateSessionToken();
    const tokenHash = await hashSessionToken(sessionToken);
    const expiresDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    const expiresAtSQLite = expiresDate.toISOString().replace('T', ' ').split('.')[0]; // YYYY-MM-DD HH:MM:SS

    await c.env.DB.prepare('INSERT INTO admin_sessions (id, admin_id, session_token_hash, expires_at) VALUES (?, ?, ?, ?)')
      .bind(sessionId, admin.id, tokenHash, expiresAtSQLite).run();
    diagnostic.sessionCreated = true;

    setCookie(c, 'admin_session_token', sessionToken, {
      httpOnly: true,
      secure: c.env.ENVIRONMENT === 'production',
      sameSite: 'Lax',
      path: '/api/admin',
      expires: expiresDate
    });

    return c.json({ message: 'Admin login successful', diag: diagnostic }, 200);
  } catch (e) {
    return c.json({ error: 'Session creation failed', diag: diagnostic }, 500);
  }
});

adminRouter.post('/logout', async (c) => {
  const token = getCookie(c, 'admin_session_token');
  if (token) {
    const tokenHash = await hashSessionToken(token);
    await c.env.DB.prepare('DELETE FROM admin_sessions WHERE session_token_hash = ?').bind(tokenHash).run();
  }
  deleteCookie(c, 'admin_session_token', { path: '/api/admin' });
  return c.json({ message: 'Logged out' });
});

export const requireAdmin = async (c: any, next: any) => {
  const token = getCookie(c, 'admin_session_token');
  if (!token) return c.json({ error: 'Unauthorized admin access' }, 401);
  
  const tokenHash = await hashSessionToken(token); // Deterministic SHA-256 hash
  const session = await c.env.DB.prepare('SELECT admin_id FROM admin_sessions WHERE session_token_hash = ? AND expires_at > CURRENT_TIMESTAMP').bind(tokenHash).first();
  
  if (!session) {
    return c.json({ error: 'Invalid or expired admin session' }, 401);
  }
  
  c.set('adminId', session.admin_id);
  return await next();
};

adminRouter.use('/*', async (c, next) => {
  if (c.req.path.includes('/login') || c.req.path.includes('/logout') || c.req.path.includes('/diag')) {
    return next();
  }
  return requireAdmin(c, next);
});

adminRouter.get('/me', async (c) => {
  return c.json({ id: c.get('adminId'), role: 'admin' });
});

adminRouter.get('/stats', async (c) => {
  try {
    const [totalUsers, pending, approved, rejected, suspended] = await c.env.DB.batch([
      c.env.DB.prepare('SELECT COUNT(*) as count FROM users'),
      c.env.DB.prepare('SELECT COUNT(*) as count FROM profiles WHERE status = ?').bind('pending'),
      c.env.DB.prepare('SELECT COUNT(*) as count FROM profiles WHERE status = ?').bind('approved'),
      c.env.DB.prepare('SELECT COUNT(*) as count FROM profiles WHERE status = ?').bind('rejected'),
      c.env.DB.prepare('SELECT COUNT(*) as count FROM profiles WHERE status = ?').bind('suspended'),
    ]);
    
    return c.json({
      totalUsers: (totalUsers.results[0] as any).count,
      pendingProfiles: (pending.results[0] as any).count,
      approvedProfiles: (approved.results[0] as any).count,
      rejectedProfiles: (rejected.results[0] as any).count,
      suspendedProfiles: (suspended.results[0] as any).count,
    });
  } catch(e) {
    return c.json({ error: 'Failed to fetch stats' }, 500);
  }
});

adminRouter.get('/users', async (c) => {
  const users = await c.env.DB.prepare(`
    SELECT u.id, u.email, u.status as user_status, u.email_verified, u.mobile_number, u.mobile_verified, p.full_name, p.status as profile_status, p.created_at 
    FROM users u 
    LEFT JOIN profiles p ON u.id = p.user_id 
    ORDER BY p.created_at DESC
  `).all();
  return c.json(users.results);
});

adminRouter.get('/users/:id', async (c) => {
  const id = c.req.param('id');
  const user = await c.env.DB.prepare(`
    SELECT u.email, u.email_verified, u.mobile_number, u.mobile_verified, p.* 
    FROM users u 
    LEFT JOIN profiles p ON u.id = p.user_id 
    WHERE u.id = ?
  `).bind(id).first();
  if (!user) return c.json({ error: 'User not found' }, 404);
  return c.json(user);
});

async function updateProfileStatus(c: any, userId: string, newStatus: string) {
  const reason = (await c.req.json().catch(()=>({}))).reason || null;
  const adminId = c.get('adminId');

  const profile = await c.env.DB.prepare('SELECT id, status FROM profiles WHERE user_id = ?').bind(userId).first();
  if (!profile) return c.json({ error: 'Profile not found' }, 404);

  const oldStatus = profile.status;
  const historyId = uuidv4();

  await c.env.DB.batch([
    c.env.DB.prepare('UPDATE profiles SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?').bind(newStatus, userId),
    c.env.DB.prepare('INSERT INTO profile_status_history (id, profile_id, admin_id, old_status, new_status, reason) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(historyId, profile.id, adminId, oldStatus, newStatus, reason)
  ]);

  return c.json({ message: `Profile status updated to ${newStatus}` });
}

adminRouter.post('/users/:id/approve', async (c) => updateProfileStatus(c, c.req.param('id'), 'approved'));
adminRouter.post('/users/:id/reject', async (c) => updateProfileStatus(c, c.req.param('id'), 'rejected'));
adminRouter.post('/users/:id/suspend', async (c) => updateProfileStatus(c, c.req.param('id'), 'suspended'));
adminRouter.post('/users/:id/reactivate', async (c) => updateProfileStatus(c, c.req.param('id'), 'approved'));

adminRouter.get('/diag', async (c) => {
  try {
    const testPassword = "diagnostictest";
    const hash = await hashPassword(testPassword);
    const isValid = await verifyPassword(testPassword, hash);
    const isInvalid = await verifyPassword("wrong", hash);
    
    return c.json({
      environment: c.env.ENVIRONMENT,
      hashGenerated: !!hash,
      verificationPass: isValid === true && isInvalid === false,
      message: isValid ? "PASS: Cloudflare Worker PBKDF2 matches perfectly." : "FAIL: Worker PBKDF2 mismatch."
    });
  } catch (e) {
    return c.json({ error: e.message }, 500);
  }
});
