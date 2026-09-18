import { Hono } from 'hono';
import { Bindings } from './index';
import { requireUser } from './auth';

export const discoverRouter = new Hono<{ Bindings: Bindings }>();

// All discover routes require an authenticated user
discoverRouter.use('/*', requireUser);

discoverRouter.get('/', async (c) => {
  const userId = c.get('userId');

  // Verify the requesting user is approved
  const requestor = await c.env.DB.prepare('SELECT status FROM profiles WHERE user_id = ?').bind(userId).first();
  if (!requestor || requestor.status !== 'approved') {
    return c.json({ error: 'Only approved users can access discover' }, 403);
  }

  const url = new URL(c.req.url);
  const minAge = url.searchParams.get('minAge');
  const maxAge = url.searchParams.get('maxAge');
  const location = url.searchParams.get('location');
  const profession = url.searchParams.get('profession');
  const interests = url.searchParams.get('interests');

  let query = `
    SELECT id, user_id, full_name, date_of_birth, location, profession, bio, interests, relationship_preference, profile_photo_url 
    FROM profiles 
    WHERE status = 'approved' AND user_id != ? 
    AND user_id NOT IN (SELECT liked_user_id FROM likes WHERE liker_user_id = ?)
  `;
  
  const params: any[] = [userId, userId];

  if (location) {
    query += ` AND location LIKE ?`;
    params.push(`%${location}%`);
  }

  if (profession) {
    query += ` AND profession LIKE ?`;
    params.push(`%${profession}%`);
  }
  
  if (interests) {
    query += ` AND interests LIKE ?`;
    params.push(`%${interests}%`);
  }
  
  if (minAge) {
    // SQLite dates are strings like 'YYYY-MM-DD'. We can calculate birth year threshold.
    // E.g. minAge = 18 means born before (current_year - 18)
    const d = new Date();
    d.setFullYear(d.getFullYear() - parseInt(minAge));
    query += ` AND date_of_birth <= ?`;
    params.push(d.toISOString().split('T')[0]);
  }
  
  if (maxAge) {
    const d = new Date();
    d.setFullYear(d.getFullYear() - parseInt(maxAge) - 1); // up to this age
    query += ` AND date_of_birth > ?`;
    params.push(d.toISOString().split('T')[0]);
  }

  query += ` ORDER BY created_at DESC LIMIT 50`;

  try {
    const stmt = c.env.DB.prepare(query);
    const profiles = await stmt.bind(...params).all();
    return c.json(profiles.results);
  } catch (e) {
    console.error(e);
    return c.json({ error: 'Database error fetching discover profiles' }, 500);
  }
});
