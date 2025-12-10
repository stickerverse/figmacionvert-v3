// figma-plugin/src/job-client.ts
// Client for interacting with the capture service API

import { JobWithSchema, WebToFigmaSchema } from "../../shared/schema";

export interface JobResponse {
  ok: boolean;
  job?: {
    id: string;
    payload: WebToFigmaSchema;
    url: string;
    viewport: { width: number; height: number };
  };
}

export class JobClient {
  constructor(private apiBaseUrl: string) {}

  /**
   * Poll for the next ready job from capture service
   */
  async getNextJob(): Promise<JobResponse["job"] | null> {
    try {
      const res = await fetch(`${this.apiBaseUrl}/api/jobs/next`);

      if (res.status === 204) {
        // No jobs available
        return null;
      }

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Failed to fetch next job: ${res.status} ${text}`);
      }

      const data = (await res.json()) as JobResponse;

      if (!data.ok || !data.job) {
        return null;
      }

      return data.job;
    } catch (error) {
      console.error("[JobClient] Error fetching next job:", error);
      throw error;
    }
  }

  /**
   * Get a specific job by ID
   */
  async getJob(jobId: string): Promise<JobResponse["job"] | null> {
    try {
      const res = await fetch(`${this.apiBaseUrl}/api/jobs/${jobId}`);

      if (!res.ok) {
        if (res.status === 404) return null;
        throw new Error(`Failed to fetch job: ${res.status}`);
      }

      const data = await res.json();
      return data.job || null;
    } catch (error) {
      console.error(`[JobClient] Error fetching job ${jobId}:`, error);
      throw error;
    }
  }

  /**
   * Check service health
   */
  async checkHealth(): Promise<boolean> {
    try {
      const res = await fetch(`${this.apiBaseUrl}/api/health`);
      return res.ok;
    } catch {
      return false;
    }
  }
}

// Singleton instance
let clientInstance: JobClient | null = null;

export function getJobClient(
  apiBaseUrl: string = "http://localhost:4411"
): JobClient {
  if (!clientInstance) {
    clientInstance = new JobClient(apiBaseUrl);
  }
  return clientInstance;
}
