import { Hono } from 'hono';
import { Bindings } from './index';
import { requireUser } from './auth';

export const photosRouter = new Hono<{ Bindings: Bindings }>();

// Generate unique IDs
const uuidv4 = () => {
  return crypto.randomUUID();
};

photosRouter.get('/:id', async (c) => {
  const photoId = c.req.param('id');
  const userId = c.get('userId') || null;

  // Verify the photo exists in the DB
  const photo = await c.env.DB.prepare('SELECT user_id, r2_object_key FROM profile_photos WHERE id = ?').bind(photoId).first();
  
  if (!photo) {
    return c.json({ error: 'Photo not found' }, 404);
  }

  // Authorization check: User can view their own photo, or anyone can view it if the owner is approved
  if (photo.user_id !== userId) {
    const owner = await c.env.DB.prepare('SELECT status FROM profiles WHERE user_id = ?').bind(photo.user_id).first();
    if (!owner || owner.status !== 'approved') {
      return c.json({ error: 'Forbidden' }, 403);
    }
  }

  if (!c.env.PROFILE_IMAGES) {
    return c.json({ error: 'Storage not configured' }, 501);
  }

  // Fetch from R2
  const object = await c.env.PROFILE_IMAGES.get(photo.r2_object_key);
  
  if (object === null) {
    return c.json({ error: 'Image not found in storage' }, 404);
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  
  // R2 object.body is a ReadableStream
  return new Response(object.body, {
    headers,
  });
});

// All following routes require authentication
photosRouter.use('/*', requireUser);

photosRouter.post('/', async (c) => {
  const userId = c.get('userId');
  
  // Verify account status
  const user = await c.env.DB.prepare('SELECT status FROM users WHERE id = ?').bind(userId).first();
  if (!user || user.status === 'suspended' || user.status === 'deleted') {
    return c.json({ error: 'Account restricted' }, 403);
  }

  const formData = await c.req.formData();
  const file = formData.get('photo') as File;
  
  if (!file) {
    return c.json({ error: 'No photo provided' }, 400);
  }

  // Validate file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    return c.json({ error: 'File size exceeds 5MB limit' }, 400);
  }

  // Validate file type
  const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    return c.json({ error: 'Unsupported file type. Use JPEG, PNG, or WebP' }, 400);
  }

  // Determine extension
  const ext = file.type === 'image/jpeg' ? 'jpg' : file.type.split('/')[1];
  const photoId = uuidv4();
  const objectKey = `profile-images/${userId}/${photoId}.${ext}`;

  if (!c.env.PROFILE_IMAGES) {
    return c.json({ error: 'Storage not configured' }, 501);
  }

  try {
    // Upload to R2
    await c.env.PROFILE_IMAGES.put(objectKey, await file.arrayBuffer(), {
      httpMetadata: { contentType: file.type }
    });

    // Determine if this is the first photo (make it primary if so)
    const existingPhotosCount = await c.env.DB.prepare('SELECT COUNT(*) as count FROM profile_photos WHERE user_id = ?').bind(userId).first();
    const isPrimary = existingPhotosCount && existingPhotosCount.count === 0 ? 1 : 0;

    // Insert into D1
    await c.env.DB.prepare(
      'INSERT INTO profile_photos (id, user_id, r2_object_key, is_primary) VALUES (?, ?, ?, ?)'
    ).bind(photoId, userId, objectKey, isPrimary).run();

    if (isPrimary) {
      await c.env.DB.prepare('UPDATE profiles SET profile_photo_url = ? WHERE user_id = ?').bind(`/api/profile/photos/${photoId}`, userId).run();
    }

    return c.json({ message: 'Photo uploaded successfully', photo: { id: photoId, is_primary: isPrimary } }, 201);
  } catch (e) {
    console.error('Upload error:', e);
    return c.json({ error: 'Failed to upload photo' }, 500);
  }
});

photosRouter.delete('/:id', async (c) => {
  const userId = c.get('userId');
  const photoId = c.req.param('id');

  const photo = await c.env.DB.prepare('SELECT user_id, r2_object_key FROM profile_photos WHERE id = ?').bind(photoId).first();
  
  if (!photo) {
    return c.json({ error: 'Photo not found' }, 404);
  }

  // Verify ownership
  if (photo.user_id !== userId) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  try {
    if (c.env.PROFILE_IMAGES) {
      // Delete from R2
      await c.env.PROFILE_IMAGES.delete(photo.r2_object_key);
    }
    
    // Delete from D1
    await c.env.DB.prepare('DELETE FROM profile_photos WHERE id = ? AND user_id = ?').bind(photoId, userId).run();
    
    // If it was the primary photo, update profiles table to clear it
    await c.env.DB.prepare('UPDATE profiles SET profile_photo_url = NULL WHERE user_id = ? AND profile_photo_url = ?').bind(userId, `/api/profile/photos/${photoId}`).run();

    return c.json({ message: 'Photo deleted successfully' });
  } catch (e) {
    console.error('Delete error:', e);
    return c.json({ error: 'Failed to delete photo' }, 500);
  }
});

photosRouter.put('/:id/primary', async (c) => {
  const userId = c.get('userId');
  const photoId = c.req.param('id');

  // Verify ownership and existence
  const photo = await c.env.DB.prepare('SELECT id FROM profile_photos WHERE id = ? AND user_id = ?').bind(photoId, userId).first();
  
  if (!photo) {
    return c.json({ error: 'Photo not found or forbidden' }, 404);
  }

  try {
    // Unset all existing primary photos
    await c.env.DB.prepare('UPDATE profile_photos SET is_primary = 0 WHERE user_id = ?').bind(userId).run();
    
    // Set this photo as primary
    await c.env.DB.prepare('UPDATE profile_photos SET is_primary = 1 WHERE id = ?').bind(photoId).run();

    // Update profiles table
    await c.env.DB.prepare('UPDATE profiles SET profile_photo_url = ? WHERE user_id = ?').bind(`/api/profile/photos/${photoId}`, userId).run();

    return c.json({ message: 'Primary photo updated successfully' });
  } catch (e) {
    console.error('Update primary error:', e);
    return c.json({ error: 'Failed to update primary photo' }, 500);
  }
});
