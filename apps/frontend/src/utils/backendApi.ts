export const API_BASE = 'https://echo.austinstubbs.dev/api/v1';

export async function storePointCloud(pointCloud: number[][]) {
  const res = await fetch(`${API_BASE}/store`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pointCloud }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error ?? 'Failed to store point cloud');
  }
  return data.id as string;
}

export async function comparePointClouds(
  pointCloudId1: string,
  pointCloudId2: string,
  threshold = 0.01,
) {
  const res = await fetch(`${API_BASE}/compare`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pointCloudId1, pointCloudId2, threshold }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error ?? 'Failed to compare point clouds');
  }
  return data as {
    renderingData: {
      points: { position: { x: number; y: number; z: number }; intensity: number }[];
      metadata: { count: number; averageDistance: number };
    };
  };
} 