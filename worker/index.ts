import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { authRouter } from './auth';
import { adminRouter } from './admin';
import { profileRouter } from './profile';

export type Bindings = {
  DB: D1Database;
  ENVIRONMENT: string;
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

// Fallback for SPA (Cloudflare Pages or Assets handles actual static files)
// If a request misses the static assets and the API, it shouldn't hit here in production 
// because wrangler assets handling is "single-page-application".
app.get('*', (c) => c.text('LumiLove API Backend running', 404));

export default app;
