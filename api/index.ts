import type { Request, Response } from 'express';
import app from '../server.js';

/**
 * Vercel Serverless Function entry point
 * Directs all /api/* requests to the Express application
 */
export default function handler(req: Request, res: Response) {
  return app(req, res);
}
