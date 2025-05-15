/**
 * Cloudflare Worker for handling fractal point cloud data storage
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { storePointCloud, retrievePointCloud } from './controllers/pointCloudController';
import { comparePointClouds } from './controllers/comparisonController';
import { Env } from './types';
import { Bindings } from 'hono/types';

// Create a new Hono app
const app = new Hono<{ Bindings: Bindings }>();

// Apply CORS middleware
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type'],
  exposeHeaders: ['Content-Length'],
  maxAge: 600,
}));

// Store point cloud data endpoint
app.post('/api/v1/store', async (c) => {
  try {
    const data = await c.req.json() as { pointCloud: number[][] };
    
    if (!data.pointCloud) {
      return c.json({ error: 'Point cloud data is required' }, 400);
    }
    
    const result = await storePointCloud(data.pointCloud, c.env as Env);
    return c.json(result);
  } catch (error) {
    return c.json({ error: (error as Error).message }, 500);
  }
});

// Retrieve point cloud data endpoint
app.get('/api/v1/retrieve/:id', async (c) => {
  try {
    const id = c.req.param('id');
    
    if (!id) {
      return c.json({ error: 'ID is required' }, 400);
    }
    
    const result = await retrievePointCloud(id, c.env as Env);
    
    if (!result) {
      return c.json({ error: 'Point cloud not found' }, 404);
    }
    
    return c.json(result);
  } catch (error) {
    return c.json({ error: (error as Error).message }, 500);
  }
});

// Compare point clouds endpoint
app.post('/api/v1/compare', async (c) => {
  try {
    const data = await c.req.json() as { pointCloudId1: string, pointCloudId2: string, threshold?: number };
    
    if (!data.pointCloudId1 || !data.pointCloudId2) {
      return c.json({ error: 'Two point cloud IDs are required' }, 400);
    }
    
    const threshold = data.threshold || 0.01; // Default threshold
    const result = await comparePointClouds(data.pointCloudId1, data.pointCloudId2, threshold, c.env as Env	);
    
    if (!result) {
      return c.json({ error: 'One or both point clouds not found' }, 404);
    }
    
    return c.json(result);
  } catch (error) {
    return c.json({ error: (error as Error).message }, 500);
  }
});

// Default response for unmatched routes
app.all('*', (c) => {
  return c.json({ error: 'Not found' }, 404);
});

// Export the Hono app
export default app; 