/**
 * Controller for point cloud comparison operations
 */

import { calculateOverlap, generateOverlapRenderingData } from '../comparison';
import { Env } from '../types';

/**
 * Compare two point clouds and calculate their overlap
 */
export async function comparePointClouds(pointCloudId1: string, pointCloudId2: string, threshold: number, env: Env) {
  // Fetch both point clouds from the database
  const pointCloud1Result = await env.DB.prepare(
    'SELECT * FROM point_clouds WHERE id = ?'
  ).bind(pointCloudId1).first();
  
  const pointCloud2Result = await env.DB.prepare(
    'SELECT * FROM point_clouds WHERE id = ?'
  ).bind(pointCloudId2).first();
  
  if (!pointCloud1Result || !pointCloud2Result) {
    return null;
  }
  
  const pointCloud1 = JSON.parse(pointCloud1Result.point_cloud as string);
  const pointCloud2 = JSON.parse(pointCloud2Result.point_cloud as string);
  
  // Calculate overlap between the two point clouds
  const overlappingPoints = calculateOverlap(pointCloud1, pointCloud2, threshold);
  
  // Generate rendering data for the overlap
  const renderingData = generateOverlapRenderingData(overlappingPoints);
  
  return {
    pointCloudId1,
    pointCloudId2,
    threshold,
    overlapCount: overlappingPoints.length,
    renderingData
  };
} 