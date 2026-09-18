import { Hono } from 'hono';
import { Bindings } from './index';
import { requireUser } from './auth';

export const likesRouter = new Hono<{ Bindings: Bindings }>();

likesRouter.use('/*', requireUser);

likesRouter.post('/', async (c) => {
  const userId = c.get('userId');
  const { likedUserId } = await c.req.json();

  if (!likedUserId) {
    return c.json({ error: 'likedUserId is required' }, 400);
  }

  if (userId === likedUserId) {
    return c.json({ error: 'Cannot like yourself' }, 400);
  }

  // Ensure current user is APPROVED
  const userProfile = await c.env.DB.prepare('SELECT status FROM profiles WHERE user_id = ?').bind(userId).first();
  if (!userProfile || userProfile.status !== 'approved') {
    return c.json({ error: 'Only approved users can like' }, 403);
  }

  // Ensure target user is APPROVED
  const targetProfile = await c.env.DB.prepare('SELECT status FROM profiles WHERE user_id = ?').bind(likedUserId).first();
  if (!targetProfile || targetProfile.status !== 'approved') {
    return c.json({ error: 'Can only like approved users' }, 400);
  }

  try {
    // Insert like
    await c.env.DB.prepare(`
      INSERT INTO likes (id, liker_user_id, liked_user_id) 
      VALUES (?, ?, ?)
    `).bind(crypto.randomUUID(), userId, likedUserId).run();
  } catch (e: any) {
    // Handle unique constraint failure gracefully
    if (e.message.includes('UNIQUE constraint failed')) {
      return c.json({ error: 'Already liked this user' }, 400);
    }
    return c.json({ error: 'Database error' }, 500);
  }

  // Check for mutual like
  const mutualLike = await c.env.DB.prepare(`
    SELECT * FROM likes WHERE liker_user_id = ? AND liked_user_id = ?
  `).bind(likedUserId, userId).first();

  if (mutualLike) {
    // Create a match
    // Ensure consistent ordering of IDs to avoid duplicates (e.g. A,B and B,A)
    const userA = userId < likedUserId ? userId : likedUserId;
    const userB = userId < likedUserId ? likedUserId : userId;

    try {
      await c.env.DB.prepare(`
        INSERT INTO matches (id, user_a_id, user_b_id)
        VALUES (?, ?, ?)
      `).bind(crypto.randomUUID(), userA, userB).run();
      
      return c.json({ success: true, match: true });
    } catch (e: any) {
      if (e.message.includes('UNIQUE constraint failed')) {
        // Match already existed (shouldn't happen, but just in case)
        return c.json({ success: true, match: true });
      }
      return c.json({ error: 'Database error creating match' }, 500);
    }
  }

  return c.json({ success: true, match: false });
});

likesRouter.delete('/:userId', async (c) => {
  const userId = c.get('userId');
  const targetUserId = c.req.param('userId');

  await c.env.DB.prepare(`
    DELETE FROM likes WHERE liker_user_id = ? AND liked_user_id = ?
  `).bind(userId, targetUserId).run();

  return c.json({ success: true });
});
