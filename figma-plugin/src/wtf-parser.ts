/**
 * Simplified WTF File Parser
 * Basic parser that avoids JSZip to prevent Figma sandbox security issues
 */

export interface WTFManifest {
  version: string;
  generator: string;
  url: string;
  capturedAt: string;
  viewport: {
    width: number;
    height: number;
  };
  screenshot?: {
    file: string;
    width: number;
    height: number;
  };
  schema: {
    file: string;
    elementCount: number;
    nodeCount: number;
  };
  images?: {
    count: number;
    totalSizeBytes: number;
    format: string;
  };
  fonts?: Array<{
    family: string;
    variants: string[];
    files: string[];
  }>;
  features?: {
    autoLayout?: boolean;
    components?: boolean;
    variants?: boolean;
    screenshots?: boolean;
  };
}

export interface WTFParsedData {
  manifest?: WTFManifest;
  schema: any;
  screenshot?: string;
  screenshotDataUrl?: string;
}

export class WTFParser {
  /**
   * Parse a .wtf file and extract its contents
   * Simplified version that handles basic formats without ZIP support
   */
  async parse(fileData: ArrayBuffer): Promise<any> {
    try {
      // First, try to parse as JSON (for testing or uncompressed files)
      const text = new TextDecoder('utf-8').decode(fileData);
      
      // Check if it's valid JSON
      try {
        const jsonData = JSON.parse(text);
        return jsonData;
      } catch (jsonError) {
        // Not JSON, check if it's a ZIP file
        const view = new Uint8Array(fileData);
        const isZip = view.length > 4 && 
                     view[0] === 0x50 && view[1] === 0x4B && 
                     (view[2] === 0x03 || view[2] === 0x05 || view[2] === 0x07);
        
        if (isZip) {
          // .wtf files are ZIP archives - we can't parse them safely in the Figma plugin context
          // Suggest using browser-side processing instead
          throw new Error(
            '.wtf archive files cannot be processed directly in the Figma plugin due to security restrictions. ' +
            'Please extract the schema.json file from the .wtf archive and upload that instead, ' +
            'or use the Chrome extension\'s direct import feature.'
          );
        } else {
          // Unknown format
          throw new Error(
            'Unrecognized file format. Please upload a JSON schema file or use the Chrome extension for .wtf files.'
          );
        }
      }
    } catch (error) {
      console.error('WTF parsing error:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to parse file: Unknown error');
    }
  }

  /**
   * Validate a .wtf file structure (simplified)
   */
  async validate(fileData: ArrayBuffer): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    try {
      await this.parse(fileData);
      return { valid: true, errors: [] };
    } catch (error) {
      if (error instanceof Error) {
        errors.push(error.message);
      } else {
        errors.push('Unknown validation error');
      }
      return { valid: false, errors };
    }
  }
}

/**
 * Check if a file is a .wtf file based on its name
 */
export function isWTFFile(filename: string): boolean {
  return filename.toLowerCase().endsWith('.wtf');
}

/**
 * Check if a file is a JSON file based on its name
 */
export function isJSONFile(filename: string): boolean {
  return filename.toLowerCase().endsWith('.json');
}