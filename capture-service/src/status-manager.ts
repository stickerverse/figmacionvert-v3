import logger from './logger';

interface ExtensionHeartbeat {
  extensionId: string;
  version: string;
  timestamp: number;
}

interface PluginStatus {
  server: 'ok' | 'error';
  extension: 'online' | 'offline';
  figmaPluginVersion: string | null;
  lastExtensionHeartbeatMsAgo: number | null;
}

class StatusManager {
  private lastHeartbeat: ExtensionHeartbeat | null = null;
  private readonly HEARTBEAT_TIMEOUT_MS = 30000; // 30 seconds

  public registerHeartbeat(metadata: { extensionId: string; version: string }) {
    this.lastHeartbeat = {
      ...metadata,
      timestamp: Date.now(),
    };
    logger.debug({ metadata }, 'Extension heartbeat registered');
  }

  public getStatus(): PluginStatus {
    const now = Date.now();
    let extensionStatus: 'online' | 'offline' = 'offline';
    let lastExtensionHeartbeatMsAgo: number | null = null;

    if (this.lastHeartbeat) {
      lastExtensionHeartbeatMsAgo = now - this.lastHeartbeat.timestamp;
      if (lastExtensionHeartbeatMsAgo < this.HEARTBEAT_TIMEOUT_MS) {
        extensionStatus = 'online';
      }
    }

    return {
      server: 'ok',
      extension: extensionStatus,
      figmaPluginVersion: null, // Can be updated if we add plugin registration
      lastExtensionHeartbeatMsAgo,
    };
  }
}

export const statusManager = new StatusManager();
