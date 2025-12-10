import { Queue, QueueEvents } from "bullmq";
import Redis from "ioredis";
import logger from "./logger";
import { JobData, JobState, CaptureWorkerResult, JobResult } from "./types";

const redisConfig = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379", 10),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
  ...(process.env.REDIS_TLS === "true" && {
    tls: {},
  }),
};

const connection = new Redis(redisConfig);

/**
 * Job queue for capture requests
 */
export const captureQueue = new Queue<JobData, CaptureWorkerResult>("capture", {
  connection,
  defaultJobOptions: {
    attempts: parseInt(process.env.JOB_MAX_ATTEMPTS || "3", 10),
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    removeOnComplete: {
      age: parseInt(process.env.JOB_RETENTION_DAYS || "7", 10) * 86400, // seconds
      count: 1000,
    },
    removeOnFail: {
      age: parseInt(process.env.JOB_RETENTION_DAYS || "7", 10) * 86400,
    },
  },
});

/**
 * Queue events for monitoring
 */
export const queueEvents = new QueueEvents("capture", { connection });

queueEvents.on("waiting", ({ jobId }) => {
  logger.debug({ jobId }, "Job waiting in queue");
});

queueEvents.on("active", ({ jobId }) => {
  logger.info({ jobId }, "Job started processing");
});

queueEvents.on("completed", ({ jobId, returnvalue }) => {
  const result =
    typeof returnvalue === "string"
      ? null
      : (returnvalue as CaptureWorkerResult);
  logger.info(
    { jobId, metadata: result?.metadata },
    "Job completed successfully"
  );
});

queueEvents.on("failed", ({ jobId, failedReason }) => {
  logger.error({ jobId, error: failedReason }, "Job failed");
});

queueEvents.on("progress", ({ jobId, data }) => {
  logger.debug({ jobId, progress: data }, "Job progress updated");
});

/**
 * Add a new capture job to the queue
 */
export async function addCaptureJob(data: JobData): Promise<string> {
  const job = await captureQueue.add("capture", data, {
    jobId: data.jobId,
  });

  logger.info({ jobId: job.id, url: data.url }, "Capture job added to queue");
  return job.id!;
}

/**
 * Get job status and result
 */
export async function getJobResult(jobId: string): Promise<JobResult | null> {
  const job = await captureQueue.getJob(jobId);

  if (!job) {
    return null;
  }

  const state = await job.getState();
  const progress = (job.progress as number) || 0;

  // Map BullMQ states to our JobState enum
  let jobState: JobState;
  switch (state) {
    case "waiting":
    case "delayed":
      jobState = JobState.QUEUED;
      break;
    case "active":
      // Use progress to determine sub-state
      if (progress < 25) jobState = JobState.RENDERING;
      else if (progress < 50) jobState = JobState.EXTRACTING;
      else if (progress < 75) jobState = JobState.PACKAGING;
      else jobState = JobState.UPLOADING;
      break;
    case "completed":
      jobState = JobState.COMPLETED;
      break;
    case "failed":
      jobState = JobState.FAILED;
      break;
    default:
      jobState = JobState.QUEUED;
  }

  const result: JobResult = {
    jobId,
    state: jobState,
    progress,
    createdAt: new Date(job.timestamp).toISOString(),
  };

  if (state === "completed" && job.returnvalue) {
    const workerResult = job.returnvalue as CaptureWorkerResult & {
      schemaUrl?: string;
      screenshotUrl?: string;
      expiresAt?: string;
    };
    result.completedAt = new Date(job.finishedOn!).toISOString();
    result.schemaUrl = workerResult.schemaUrl;
    result.screenshotUrl = workerResult.screenshotUrl;
    result.metadata = {
      url: job.data.url,
      viewports: job.data.options?.viewports || [],
      elementCount: workerResult.metadata.elementCount,
      assetCount: workerResult.metadata.assetCount,
      dataSizeKB: workerResult.metadata.dataSizeKB,
    };
  }

  if (state === "failed" && job.failedReason) {
    result.error = {
      message: job.failedReason,
      code: "CAPTURE_FAILED",
      details: job.stacktrace,
    };
  }

  return result;
}

/**
 * Get the next completed job (for Figma plugin polling)
 */
export async function getNextCompletedJob(): Promise<JobResult | null> {
  const completed = await captureQueue.getCompleted(0, 0);

  if (completed.length === 0) {
    return null;
  }

  const job = completed[0];
  const result = await getJobResult(job.id!);

  // Remove job from queue after retrieval
  if (result) {
    await job.remove();
  }

  return result;
}

/**
 * Get job history (completed jobs)
 */
export async function getJobHistory(
  limit: number = 20,
  offset: number = 0
): Promise<JobResult[]> {
  const completed = await captureQueue.getCompleted(
    offset,
    offset + limit - 1,
    true
  ); // true = desc order (newest first)

  const results = await Promise.all(
    completed.map(async (job) => {
      return getJobResult(job.id!);
    })
  );

  return results.filter((r): r is JobResult => r !== null);
}

/**
 * Get queue metrics for health checks
 */
export async function getQueueMetrics() {
  const [waiting, active, failed] = await Promise.all([
    captureQueue.getWaitingCount(),
    captureQueue.getActiveCount(),
    captureQueue.getFailedCount(),
  ]);

  return { waiting, active, failed };
}

/**
 * Clean up old jobs
 */
export async function cleanOldJobs() {
  const retentionSeconds =
    parseInt(process.env.JOB_RETENTION_DAYS || "7", 10) * 86400;
  await captureQueue.clean(retentionSeconds * 1000, 100, "completed");
  await captureQueue.clean(retentionSeconds * 1000, 100, "failed");
  logger.info("Old jobs cleaned from queue");
}

// Clean old jobs every hour
setInterval(cleanOldJobs, 3600000);

logger.info(
  { redisHost: redisConfig.host, redisPort: redisConfig.port },
  "Queue initialized"
);
