# Media URL Fix Documentation

## Issue Description
Media files uploaded through the application were being saved with relative URLs (e.g., `/uploads/media/filename.jpg`) which could cause issues when the application is deployed to production environments or when accessed from different contexts.

## Solution Implemented
Updated all post controllers to generate absolute URLs for media files instead of relative paths.

## Files Modified

### 1. `controllers/postControllerV2.js`
- **Line 75**: Changed from relative path `/uploads/media/${file.filename}` to absolute URL using `BASE_URL` environment variable
- **Added**: Dynamic base URL construction using `process.env.BASE_URL || http://localhost:${process.env.PORT || 3001}`

### 2. `controllers/postControllerZilliz.js`
- **Line 296**: Updated media URL generation to use absolute URLs instead of relative paths
- **Added**: Same base URL construction pattern as postControllerV2.js

### 3. `controllers/postController.js`
- **Line 80**: Updated avatar/media URL generation to use absolute URLs
- **Added**: Consistent base URL construction across all controllers

### 4. `.env`
- **Added**: `BASE_URL=http://localhost:3002` configuration option
- **Note**: Update this value for production deployment (e.g., `https://yourdomain.com`)

## Configuration

### Environment Variables
- `BASE_URL`: The base URL for your application (e.g., `http://localhost:3002` for development, `https://yourdomain.com` for production)
- `PORT`: Server port (defaults to 3001 if not specified)

### Usage Example
```javascript
// Media URLs will now be generated as:
// Development: http://localhost:3002/uploads/media/filename.jpg
// Production: https://yourdomain.com/uploads/media/filename.jpg
```

## Testing

To verify the fix:
1. Upload a new media file through any post creation endpoint
2. Check that the returned media URL is an absolute URL
3. Ensure the URL is accessible from the client-side

## Deployment Notes
Remember to update the `BASE_URL` environment variable when deploying to production:
```bash
# Production example
export BASE_URL=https://founder-connect.com
```