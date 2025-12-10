// capture-service/src/job-store.ts
import {
  JobRecord,
  JobStatus,
  CaptureSource,
  Viewport,
  JobWithSchema,
  WebToFigmaSchema,
} from "../../shared/schema";
import { randomUUID } from "crypto";

const jobs = new Map<string, JobWithSchema>();

export function createJob(
  url: string,
  viewport: Viewport,
  source: CaptureSource
): JobRecord {
  const now = new Date().toISOString();
  const job: JobWithSchema = {
    id: randomUUID(),
    url,
    source,
    viewport,
    createdAt: now,
    updatedAt: now,
    status: { state: "queued" },
  };
  jobs.set(job.id, job);
  console.log(`[job-store] Created job ${job.id} for ${url}`);
  return job;
}

export function updateJobStatus(
  id: string,
  status: JobStatus
): JobRecord | undefined {
  const job = jobs.get(id);
  if (!job) return undefined;
  job.status = status;
  job.updatedAt = new Date().toISOString();
  console.log(`[job-store] Job ${id} status → ${status.state}`);
  return job;
}

export function attachSchemaToJob(
  id: string,
  schema: WebToFigmaSchema
): JobWithSchema | undefined {
  const job = jobs.get(id);
  if (!job) return undefined;
  job.schema = schema;
  job.status = { state: "ready" };
  job.updatedAt = new Date().toISOString();
  console.log(`[job-store] Job ${id} schema attached, status → ready`);
  return job;
}

export function getJob(id: string): JobWithSchema | undefined {
  return jobs.get(id);
}

export function getNextReadyJob(): JobWithSchema | undefined {
  for (const job of jobs.values()) {
    if (job.status.state === "ready" && job.schema) {
      return job;
    }
  }
  return undefined;
}

export function getNextQueuedJob(): JobWithSchema | undefined {
  for (const job of jobs.values()) {
    if (job.status.state === "queued") {
      return job;
    }
  }
  return undefined;
}

export function getQueueLength(): number {
  let count = 0;
  for (const job of jobs.values()) {
    if (job.status.state === "queued" || job.status.state === "processing") {
      count++;
    }
  }
  return count;
}

export function markJobDelivered(id: string): void {
  const job = jobs.get(id);
  if (job) {
    job.status = { state: "ready", reason: "delivered" };
  }
}
