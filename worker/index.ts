import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { authRouter } from './auth';
import { adminRouter } from './admin';
import { profileRouter } from './profile';
import { discoverRouter } from './discover';
import { photosRouter } from './photos';
import { likesRouter } from './likes';
import { matchesRouter } from './matches';

export type Bindings = {
  DB: D1Database;
  ENVIRONMENT: string;
  ASSETS: any;
  PROFILE_IMAGES?: R2Bucket;
  EMAIL_PROVIDER_API_KEY?: string;
  EMAIL_FROM_ADDRESS?: string;
  EMAIL_FROM_NAME?: string;
  SMS_PROVIDER_API_KEY?: string;
  SMS_PROVIDER_ACCOUNT_ID?: string;
  SMS_FROM_NUMBER?: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// Middleware
app.use('*', async (c, next) => {
  await next();
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  c.header('Permissions-Policy', 'geolocation=(), camera=(), microphone=()');
  // Simple CSP, can be tightened later
  c.header('Content-Security-Policy', "default-src 'self' 'unsafe-inline' 'unsafe-eval' https: data: blob:; frame-ancestors 'none';");
});

app.use('/api/*', cors({
  origin: ['http://localhost:5173', 'https://lumilove.example.com'],
  credentials: true,
}));

// Error handling
app.onError((err, c) => {
  console.error(err);
  return c.json({ error: 'Internal Server Error', message: err.message }, 500);
});

// Mount routers
app.route('/api/auth', authRouter);
app.route('/api/admin', adminRouter);
app.route('/api/profile', profileRouter);
app.route('/api/profile/photos', photosRouter);
app.route('/api/discover', discoverRouter);
app.route('/api/likes', likesRouter);
app.route('/api/matches', matchesRouter);

// Fallback for SPA
app.get('*', async (c) => {
  if (c.req.path.startsWith('/api/')) {
    return c.json({ error: 'Not Found' }, 404);
  }
  // Let Cloudflare ASSETS handle the SPA fallback natively via wrangler.jsonc
  return c.env.ASSETS.fetch(c.req.raw);
});

export default app;
