/**
 * Controller for point cloud operations
 */

import { Env } from '../types';

/**
 * Store a point cloud in the database
 */
export async function storePointCloud(pointCloud: number[][], env: Env) {
  // Generate a unique ID for this point cloud data
  const id = crypto.randomUUID();
  
  // Store in D1 database
  await env.DB.prepare(
    'INSERT INTO point_clouds (id, point_cloud, created_at) VALUES (?, ?, ?)'
  ).bind(id, JSON.stringify(pointCloud), new Date().toISOString()).run();
  
  return { id };
}

/**
 * Retrieve a point cloud from the database
 */
export async function retrievePointCloud(id: string, env: Env) {
  // Fetch from D1 database
  const result = await env.DB.prepare(
    'SELECT * FROM point_clouds WHERE id = ?'
  ).bind(id).first();
  
  if (!result) {
    return null;
  }
  
  return {
    id: result.id as string,
    pointCloud: JSON.parse(result.point_cloud as string),
    createdAt: result.created_at as string
  };
}

/**
 * Get a point cloud by ID
 */
export async function getPointCloudById(id: string, env: Env) {
  return await env.DB.prepare(
    'SELECT * FROM point_clouds WHERE id = ?'
  ).bind(id).first();
} 