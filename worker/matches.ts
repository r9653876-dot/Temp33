import { Hono } from 'hono';
import { Bindings } from './index';
import { requireUser } from './auth';

export const matchesRouter = new Hono<{ Bindings: Bindings }>();

matchesRouter.use('/*', requireUser);

matchesRouter.get('/', async (c) => {
  const userId = c.get('userId');

  // Find all matches for this user
  const matches = await c.env.DB.prepare(`
    SELECT m.id as match_id, m.created_at as match_date, p.*
    FROM matches m
    JOIN profiles p ON (
      (m.user_a_id = p.user_id AND m.user_b_id = ?) OR 
      (m.user_b_id = p.user_id AND m.user_a_id = ?)
    )
    WHERE p.status = 'approved'
    ORDER BY m.created_at DESC
  `).bind(userId, userId).all();

  // Attach primary photo to each profile (this could be a join, but we can do it efficiently enough here or using a subquery/another query)
  if (matches.results && matches.results.length > 0) {
    const userIds = matches.results.map((m: any) => `'${m.user_id}'`).join(',');
    const photos = await c.env.DB.prepare(`
      SELECT user_id, id, is_primary FROM profile_photos 
      WHERE user_id IN (${userIds}) AND is_primary = 1
    `).all();

    const photoMap: Record<string, any> = {};
    for (const photo of photos.results) {
      photoMap[photo.user_id as string] = photo;
    }

    for (const match of matches.results) {
      match.primary_photo = photoMap[match.user_id as string] || null;
    }
  }

  return c.json(matches.results || []);
});
