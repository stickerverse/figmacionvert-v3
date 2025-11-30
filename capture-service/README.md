# Figma Capture Service

Cloud-based web page capture service for automated HTML to Figma conversion. Provides the same workflow as html.to.design but running on your own infrastructure.

## Architecture

```
User submits URL → API Server → BullMQ Job Queue → Playwright Workers → S3 Storage → Figma Plugin
```

### Components

1. **API Server** (`src/server.ts`)
   - REST API for job submission and status polling
   - Authentication via API keys
   - Rate limiting and security headers

2. **Job Queue** (`src/queue.ts`)
   - BullMQ with Redis backend
   - Job state tracking (queued → rendering → extracting → packaging → completed)
   - Automatic retries and failure handling

3. **Playwright Workers** (`src/worker.ts`)
   - Headless Chrome browser pool
   - DOM extraction using the same script as the Chrome extension
   - Screenshot capture and asset processing

4. **Storage** (`src/storage.ts`)
   - S3-compatible object storage for schema JSON and screenshots
   - Signed URL generation with expiration
   - Fallback to data URI embedding for development

## Quick Start

### Prerequisites

- Node.js 18+
- Redis server
- AWS S3 bucket (or S3-compatible storage)
- Chrome extension built (`cd chrome-extension && npm run build`)

### Installation

```bash
cd capture-service
npm install
```

### Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Key settings:

```env
# Server
PORT=3000
API_BASE_URL=https://capture.yourdomain.com

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# S3
AWS_REGION=us-east-1
S3_BUCKET=figma-capture-assets

# Authentication
API_KEY_REQUIRED=true
ALLOWED_API_KEYS=your-secret-key-1,your-secret-key-2
```

### Development

```bash
# Terminal 1: Start Redis
docker run -p 6379:6379 redis:7-alpine

# Terminal 2: Start API server
npm run dev

# Terminal 3: Start worker pool
npm run worker
```

### Production

```bash
# Build
npm run build

# Start API server
npm start

# Start workers (separate process/container)
node dist/worker.js
```

### Start the API server only (quick local run)

If you just need the REST API running against a local Redis (no workers):

```bash
cd capture-service
cp .env.example .env   # update values as needed
npm install
# ensure Redis is running: docker run -p 6379:6379 redis:7-alpine
npm run dev            # starts the API on PORT in .env
```

You can then hit `http://localhost:3000/api/health` (or the `PORT` you set) to verify the server is up. Add workers (`npm run worker`) when you need jobs to actually process.

## API Endpoints

### POST /api/capture

Submit a new capture job.

**Request:**
```json
{
  "url": "https://example.com",
  "options": {
    "viewports": [
      { "width": 1920, "height": 1080 }
    ],
    "waitForSelector": ".main-content",
    "screenshot": true,
    "applyAutoLayout": true
  }
}
```

**Response (202 Accepted):**
```json
{
  "jobId": "abc123",
  "status": "queued",
  "statusUrl": "https://capture.yourdomain.com/api/jobs/abc123",
  "createdAt": "2025-01-08T12:00:00Z"
}
```

### GET /api/jobs/:id

Get job status and result.

**Response (completed job):**
```json
{
  "jobId": "abc123",
  "state": "completed",
  "progress": 100,
  "createdAt": "2025-01-08T12:00:00Z",
  "completedAt": "2025-01-08T12:01:30Z",
  "schemaUrl": "https://s3.../schema.json?signature=...",
  "screenshotUrl": "https://s3.../screenshot.png?signature=...",
  "metadata": {
    "url": "https://example.com",
    "elementCount": 342,
    "assetCount": 18,
    "dataSizeKB": 1250
  }
}
```

### GET /api/jobs/next

Poll for next completed job (for Figma plugin).

Long polling endpoint that waits up to 30s for a job to complete.

**Query params:**
- `timeout` (optional): Polling timeout in ms (max 60000)

**Response (job available):**
```json
{
  "jobId": "abc123",
  "state": "completed",
  "schemaUrl": "https://s3.../schema.json",
  ...
}
```

**Response (no jobs): 204 No Content**

### GET /health

Service health check.

**Response:**
```json
{
  "status": "ok",
  "version": "1.0.0",
  "uptime": 3600,
  "services": {
    "redis": true,
    "storage": true,
    "workers": {
      "active": 2,
      "waiting": 5,
      "failed": 0
    }
  }
}
```

## Deployment

### Docker Compose

```yaml
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - REDIS_HOST=redis
      - AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
      - AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
      - S3_BUCKET=${S3_BUCKET}
      - ALLOWED_API_KEYS=${ALLOWED_API_KEYS}
    depends_on:
      - redis

  worker:
    build: .
    command: node dist/worker.js
    environment:
      - REDIS_HOST=redis
      - AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
      - AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
      - S3_BUCKET=${S3_BUCKET}
      - WORKER_CONCURRENCY=3
    depends_on:
      - redis
    deploy:
      replicas: 2
```

### Kubernetes

See `k8s/` directory for deployment manifests (API deployment, worker deployment, Redis StatefulSet, HPA).

### AWS Lambda (Serverless)

Workers can run on Lambda with:
- Playwright Lambda layer
- Redis Elasticache
- S3 for storage
- API Gateway + Lambda for API

See `serverless.yml` for configuration.

## Figma Plugin Integration

Update your Figma plugin environment:

```typescript
// figma-plugin/src/code.ts
const CAPTURE_SERVICE_URL = 'https://capture.yourdomain.com';
const CAPTURE_SERVICE_API_KEY = 'your-api-key';
```

Or set via build-time environment variables:
```bash
CAPTURE_SERVICE_URL=https://capture.yourdomain.com npm run build
```

The plugin will automatically poll `/api/jobs/next` and import completed jobs.

## Security

- API key authentication required in production
- Rate limiting: 100 requests per 15 minutes
- Helmet.js security headers
- CORS restricted to Figma domains
- Browser isolation per job
- Signed URLs with 24h expiration
- No outbound network from containers (optional)

## Monitoring

### Metrics

- Queue depth: `GET /api/metrics`
- Worker health: `GET /health`
- Job states: tracked in Redis

### Logging

Structured JSON logs via Pino:
```bash
# Production
LOG_LEVEL=info LOG_PRETTY=false npm start

# Development
LOG_LEVEL=debug LOG_PRETTY=true npm run dev
```

### Alerting

Monitor:
- API server uptime
- Redis connectivity
- S3 bucket access
- Worker crashes (automatic restart)
- Queue backlog (failed jobs > threshold)

## Performance

### Scaling

- **Horizontal**: Add more worker processes/containers
- **Vertical**: Increase `WORKER_CONCURRENCY` per worker
- **Redis**: Use Redis Cluster for high throughput
- **Storage**: CloudFront CDN for schema/screenshot delivery

### Optimization

- Reuse browser contexts (1 browser per worker, new context per job)
- Parallel asset uploads to S3
- Compress large schemas with gzip
- Cache identical URLs (future enhancement)

## Troubleshooting

### Worker crashes

Check browser args:
```env
BROWSER_ARGS=--no-sandbox,--disable-setuid-sandbox,--disable-dev-shm-usage
```

### Extraction script not found

Build Chrome extension first:
```bash
cd chrome-extension && npm run build
```

### S3 upload failures

Falls back to data URI embedding. Check:
- AWS credentials
- S3 bucket permissions
- Bucket CORS configuration

### Job timeout

Increase capture timeout:
```env
CAPTURE_TIMEOUT_MS=120000
```

## Development

### Testing

```bash
# Unit tests
npm test

# Integration test
curl -X POST http://localhost:3000/api/capture \
  -H "Content-Type: application/json" \
  -H "x-api-key: test-key" \
  -d '{"url": "https://example.com"}'

# Check job status
curl http://localhost:3000/api/jobs/{jobId} \
  -H "x-api-key: test-key"
```

### Local Development Without S3

Set `S3_BUCKET=` (empty) to use data URI embedding fallback.

## License

MIT
