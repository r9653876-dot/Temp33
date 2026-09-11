import { Hono } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { Bindings } from './index';
import { verifyPassword, hashPassword, generateSessionToken } from './crypto';

export const adminRouter = new Hono<{ Bindings: Bindings }>();

const uuidv4 = () => crypto.randomUUID();

adminRouter.post('/login', async (c) => {
  const { email, password } = await c.req.json();
  if (!email || !password) return c.json({ error: 'Missing credentials' }, 400);

  const admin = await c.env.DB.prepare('SELECT id, password_hash FROM admin_users WHERE email = ?').bind(email).first<{id: string, password_hash: string}>();
  if (!admin || !(await verifyPassword(password, admin.password_hash))) {
    return c.json({ error: 'Invalid email or password.' }, 401);
  }

  const sessionId = uuidv4();
  const sessionToken = generateSessionToken();
  const tokenHash = await hashPassword(sessionToken);
  const expiresAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000); // 2 days

  await c.env.DB.prepare('INSERT INTO admin_sessions (id, admin_id, session_token_hash, expires_at) VALUES (?, ?, ?, ?)')
    .bind(sessionId, admin.id, tokenHash, expiresAt.toISOString()).run();

  setCookie(c, 'admin_session_token', sessionToken, {
    httpOnly: true,
    secure: c.env.ENVIRONMENT === 'production',
    sameSite: 'Lax',
    path: '/api/admin',
    expires: expiresAt
  });

  return c.json({ message: 'Admin login successful' }, 200);
});

adminRouter.post('/logout', async (c) => {
  deleteCookie(c, 'admin_session_token', { path: '/api/admin' });
  return c.json({ message: 'Logged out' });
});

export const requireAdmin = async (c: any, next: any) => {
  const token = getCookie(c, 'admin_session_token');
  if (!token) return c.json({ error: 'Unauthorized admin access' }, 401);
  
  const tokenHash = await hashPassword(token); // PBKDF2 hash
  const session = await c.env.DB.prepare('SELECT admin_id FROM admin_sessions WHERE session_token_hash = ? AND expires_at > CURRENT_TIMESTAMP').bind(tokenHash).first();
  
  if (!session) {
    return c.json({ error: 'Invalid or expired admin session' }, 401);
  }
  
  c.set('adminId', session.admin_id);
  await next();
};

adminRouter.use('/*', async (c, next) => {
  if (c.req.path.includes('/login') || c.req.path.includes('/logout')) {
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
    SELECT u.id, u.email, u.status as user_status, p.full_name, p.status as profile_status, p.created_at 
    FROM users u 
    LEFT JOIN profiles p ON u.id = p.user_id 
    ORDER BY p.created_at DESC
  `).all();
  return c.json(users.results);
});

adminRouter.get('/users/:id', async (c) => {
  const id = c.req.param('id');
  const user = await c.env.DB.prepare(`
    SELECT u.email, p.* 
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
