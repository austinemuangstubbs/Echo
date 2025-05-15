# Fractal Point Cloud Worker

Cloudflare Worker for handling fractal point cloud data storage and processing.

## Features

- Stores fractal point cloud data in Cloudflare D1 database
- Generates unique IDs for each point cloud dataset
- Retrieves point cloud data by ID
- Provides point cloud comparison and overlap rendering
- CORS-enabled for frontend access

## Setup Instructions

1. Create the D1 database:
```bash
npx wrangler d1 create fractal_points_db
```

2. Take the database ID from the command output and update it in `wrangler.toml`

3. Apply the database schema:
```bash
npx wrangler d1 execute fractal_points_db --file=./schema.sql
```

4. Deploy the worker:
```bash
npx wrangler deploy
```

## API Endpoints

### Store Point Cloud Data
- **URL**: `/store`
- **Method**: `POST`
- **Body**: 
```json
{
  "pointCloud": [...] // Point cloud data array
}
```
- **Response**: 
```json
{
  "id": "unique-uuid" // UUID for retrieving the data later
}
```

### Retrieve Point Cloud Data
- **URL**: `/retrieve/:id`
- **Method**: `GET`
- **Response**: 
```json
{
  "id": "unique-uuid",
  "pointCloud": [...], // Point cloud data array
  "createdAt": "timestamp"
}
```

### Compare Point Clouds
- **URL**: `/compare`
- **Method**: `POST`
- **Body**:
```json
{
  "pointCloudId1": "uuid-of-first-point-cloud",
  "pointCloudId2": "uuid-of-second-point-cloud",
  "threshold": 0.01 // Optional: distance threshold for overlap detection
}
```
- **Response**:
```json
{
  "pointCloudId1": "uuid-of-first-point-cloud",
  "pointCloudId2": "uuid-of-second-point-cloud",
  "threshold": 0.01,
  "overlapCount": 42, // Number of overlapping points found
  "renderingData": {
    "points": [...], // Data for rendering the overlap
    "metadata": {
      "count": 42,
      "averageDistance": 0.005
    }
  }
}
```

## Local Development

Run the worker locally:
```bash
npx wrangler dev
```

## Future Features

- Overlap rendering logic
- Point cloud comparison functionality
