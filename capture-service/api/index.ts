import { VercelRequest, VercelResponse } from '@vercel/node';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

dotenv.config();

// Simple console logger for Vercel serverless
const logger = {
  info: (obj: any, msg?: string) => console.log(msg || JSON.stringify(obj)),
  error: (obj: any, msg?: string) => console.error(msg || JSON.stringify(obj)),
};

// Simple in-memory job queue (will reset on cold starts - acceptable for MVP)
const jobQueue: any[] = [];

const app = express();

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
    },
  },
}));
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  message: {
    error: {
      message: 'Too many requests, please try again later',
      code: 'RATE_LIMIT_EXCEEDED',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    res.status(200).json({
      status: 'ok',
      version: '1.0.0',
      uptime: process.uptime(),
      services: {
        storage: true, // For now, assume storage is working
        workers: { active: 0, waiting: 0 }, // Mock data
      },
    });
  } catch (error) {
    logger.error({ error }, 'Health check failed');
    res.status(503).json({
      status: 'down',
      version: '1.0.0',
      uptime: process.uptime(),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Direct capture endpoint - receives schema from Chrome extension and queues it
app.post('/api/capture/direct', async (req, res) => {
  try {
    const { schema, screenshot } = req.body;

    if (!schema) {
      return res.status(400).json({
        error: {
          message: 'Schema is required',
          code: 'VALIDATION_ERROR',
        },
      });
    }

    const jobId = `job_${Date.now()}`;

    // Encode schema as data URI for inline storage
    const schemaJson = JSON.stringify(schema);
    const schemaUrl = `data:application/json;base64,${Buffer.from(schemaJson).toString('base64')}`;

    const result = {
      jobId,
      state: 'completed',
      progress: 100,
      completedAt: new Date().toISOString(),
      schemaUrl,
      screenshotUrl: screenshot,
      metadata: {
        url: schema.metadata?.url || 'direct-upload',
        elementCount: schema.tree ? 1 : 0,
        assetCount: Object.keys(schema.assets || {}).length,
      },
    };

    // Add to queue for Figma plugin polling
    jobQueue.push(result);

    logger.info({ jobId, queueLength: jobQueue.length }, 'Direct capture job queued');
    res.status(200).json(result);
  } catch (error) {
    logger.error({ error }, 'Failed to process direct capture');
    res.status(500).json({
      error: {
        message: 'Failed to process direct capture',
        code: 'INTERNAL_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
});

// Jobs polling endpoint - Figma plugin polls this to get next completed job
app.get('/api/jobs/next', async (_req, res) => {
  try {
    const job = jobQueue.shift();

    if (!job) {
      // No jobs available - return 204 No Content
      return res.status(204).send();
    }

    logger.info({ jobId: job.jobId, remainingJobs: jobQueue.length }, 'Delivering job to Figma plugin');
    res.status(200).json(job);
  } catch (error) {
    logger.error({ error }, 'Failed to poll jobs');
    res.status(500).json({
      error: {
        message: 'Failed to poll jobs',
        code: 'INTERNAL_ERROR',
      },
    });
  }
});

// Export the Express app as a Vercel function
export default (req: VercelRequest, res: VercelResponse) => {
  return app(req, res);
};