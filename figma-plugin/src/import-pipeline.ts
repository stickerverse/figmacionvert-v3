// figma-plugin/src/import-pipeline.ts
// Unified import pipeline that enforces Puppeteer-only schemas

import { JobClient, getJobClient } from "./job-client";
import { WebToFigmaSchema } from "../../shared/schema";

export interface ImportResult {
  success: boolean;
  jobId?: string;
  nodeCount?: number;
  error?: string;
}

export class ImportPipeline {
  private jobClient: JobClient;

  constructor(apiBaseUrl: string = "http://localhost:4411") {
    this.jobClient = getJobClient(apiBaseUrl);
  }

  /**
   * Run the import pipeline once - fetch next job and import
   */
  async runOnce(): Promise<ImportResult> {
    console.log("[ImportPipeline] Checking for ready jobs...");

    try {
      const job = await this.jobClient.getNextJob();

      if (!job) {
        console.log("[ImportPipeline] No ready jobs in queue");
        return { success: false, error: "No ready jobs available" };
      }

      console.log(`[ImportPipeline] Found job ${job.id} for ${job.url}`);

      const schema = job.payload;

      // Validate schema
      this.assertSchemaIsValid(schema);
      console.log("[ImportPipeline] Schema validation passed");

      // Return the validated schema for the caller to import
      return {
        success: true,
        jobId: job.id,
        nodeCount: this.countNodes(schema.root),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error("[ImportPipeline] Import failed:", message);
      return { success: false, error: message };
    }
  }

  /**
   * Validate that schema meets v2 + puppeteer requirements
   */
  private assertSchemaIsValid(schema: any): asserts schema is WebToFigmaSchema {
    if (!schema) {
      throw new Error("Schema is null or undefined");
    }

    if (schema.version !== "v2") {
      throw new Error(
        `Unsupported schema version: expected 'v2', got '${schema?.version}'`
      );
    }

    if (schema.meta?.captureEngine !== "puppeteer") {
      throw new Error(
        `Unsupported capture engine: expected 'puppeteer', got '${schema.meta?.captureEngine}'`
      );
    }

    if (!schema.root) {
      throw new Error("Schema missing root node");
    }

    console.log("[ImportPipeline] ✅ Schema validated:", {
      version: schema.version,
      engine: schema.meta.captureEngine,
      url: schema.url,
      nodeCount: this.countNodes(schema.root),
    });
  }

  /**
   * Count nodes in tree
   */
  private countNodes(node: any): number {
    if (!node) return 0;
    let count = 1;
    if (node.children && Array.isArray(node.children)) {
      for (const child of node.children) {
        count += this.countNodes(child);
      }
    }
    return count;
  }

  /**
   * Check if capture service is available
   */
  async isServiceAvailable(): Promise<boolean> {
    return this.jobClient.checkHealth();
  }
}

// Singleton
let pipelineInstance: ImportPipeline | null = null;

export function getImportPipeline(apiBaseUrl?: string): ImportPipeline {
  if (!pipelineInstance) {
    pipelineInstance = new ImportPipeline(apiBaseUrl);
  }
  return pipelineInstance;
}
