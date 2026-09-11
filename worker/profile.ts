import { Hono } from 'hono';
import { Bindings } from './index';
import { requireUser } from './auth';

export const profileRouter = new Hono<{ Bindings: Bindings }>();

// All profile routes require an authenticated user
profileRouter.use('/*', requireUser);

profileRouter.get('/', async (c) => {
  const userId = c.get('userId');
  const profile = await c.env.DB.prepare('SELECT * FROM profiles WHERE user_id = ?').bind(userId).first();
  if (!profile) {
    return c.json({ error: 'Profile not found' }, 404);
  }
  return c.json(profile);
});

profileRouter.put('/', async (c) => {
  const userId = c.get('userId');
  const body = await c.req.json();
  
  // Destructure fields that are allowed to be updated by the user
  const { bio, interests, location, relationship_preference, profile_photo_url } = body;

  try {
    await c.env.DB.prepare(`
      UPDATE profiles 
      SET bio = ?, interests = ?, location = ?, relationship_preference = ?, profile_photo_url = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE user_id = ?
    `).bind(
      bio, 
      JSON.stringify(interests || []), 
      location, 
      relationship_preference, 
      profile_photo_url, 
      userId
    ).run();

    return c.json({ message: 'Profile updated successfully' });
  } catch (e) {
    return c.json({ error: 'Database error updating profile' }, 500);
  }
});
