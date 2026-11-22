import app from './_server.mjs';

/**
 * Vercel Serverless Function entry point
 * Uses pre-bundled self-contained Express application (api/_server.mjs)
 */
export default function handler(req, res) {
  const resolvedApp = app && app.default ? app.default : app;
  return resolvedApp(req, res);
}
