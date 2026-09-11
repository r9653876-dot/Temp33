import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { authRouter } from './auth';
import { adminRouter } from './admin';
import { profileRouter } from './profile';

export type Bindings = {
  DB: D1Database;
  ENVIRONMENT: string;
  ASSETS: any;
};

const app = new Hono<{ Bindings: Bindings }>();

// Middleware
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

// Fallback for SPA
app.get('*', async (c) => {
  if (c.req.path.startsWith('/api/')) {
    return c.json({ error: 'Not Found' }, 404);
  }
  // Serve the index.html for all non-API routes so React Router can handle them
  const url = new URL(c.req.url);
  url.pathname = '/index.html';
  return c.env.ASSETS.fetch(new Request(url.toString(), c.req.raw));
});

export default app;
