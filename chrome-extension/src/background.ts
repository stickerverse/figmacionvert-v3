console.log('Web to Figma extension loaded');

const HANDOFF_ENDPOINT = 'http://127.0.0.1:4411/jobs';
const HANDOFF_HEALTH_ENDPOINT = 'http://127.0.0.1:4411/health?source=extension';

type HandoffTrigger = 'auto' | 'manual';
type HandoffStatus = 'idle' | 'queued' | 'sending' | 'success' | 'error';

interface HandoffState {
  status: HandoffStatus;
  trigger?: HandoffTrigger | null;
  lastAttemptAt?: number | null;
  lastSuccessAt?: number | null;
  error?: string | null;
  pendingCount?: number;
  nextRetryAt?: number | null;
}

interface PendingJob {
  id: string;
  payload: any;
  trigger: HandoffTrigger;
  enqueuedAt: number;
  retries: number;
  nextRetryAt?: number | null;
}

type WindowBounds = {
  width?: number;
  height?: number;
  left?: number;
  top?: number;
};

interface CaptureTabViewportState {
  windowId: number;
  originalBounds?: WindowBounds;
  appliedViewport?: { width: number; height: number };
}

const WINDOW_FRAME_FUDGE = { width: 16, height: 100 };

let lastCapturedPayload: any = null;
let handoffState: HandoffState = { status: 'idle', trigger: null, pendingCount: 0 };
let hasInFlightJob = false;
const pendingJobs: PendingJob[] = [];
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let popupWindowId: number | null = null;
const captureTabState: Record<number, CaptureTabViewportState> = {};
let captureDeliveryMode: 'send' | 'download' = 'send';

// Chunked data handling
let chunkedDataBuffer: string[] = [];
let expectedChunks = 0;
let receivedChunks = 0;

chrome.action.onClicked.addListener(() => {
  if (popupWindowId !== null) {
    chrome.windows.update(popupWindowId, { focused: true }, () => {
      if (chrome.runtime.lastError) {
        console.warn('Failed to focus existing popup window:', chrome.runtime.lastError.message);
        popupWindowId = null;
        createPersistentWindow();
      }
    });
    return;
  }
  createPersistentWindow();
});

chrome.windows.onRemoved.addListener((windowId) => {
  if (windowId === popupWindowId) {
    popupWindowId = null;
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  if (captureTabState[tabId]) {
    delete captureTabState[tabId];
  }
});

function createPersistentWindow() {
  chrome.windows.create(
    {
      url: chrome.runtime.getURL('popup/popup.html'),
      type: 'popup',
      width: 430,
      height: 720,
      focused: true
    },
    (window) => {
      if (chrome.runtime.lastError) {
        console.error('Failed to open extension window:', chrome.runtime.lastError.message);
        return;
      }
      popupWindowId = window?.id ?? null;
    }
  );
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SET_CAPTURE_MODE') {
    captureDeliveryMode = message.mode === 'download' ? 'download' : 'send';
    sendResponse?.({ ok: true, mode: captureDeliveryMode });
    return false;
  }

  if (message.type === 'REMOTE_CAPTURE_REQUEST') {
    (async () => {
      try {
        const targetUrl = message.targetUrl;
        if (!targetUrl) {
          throw new Error('Missing target URL');
        }
        const response = await fetch(`${HANDOFF_ENDPOINT.replace('/jobs', '')}/capture`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: targetUrl })
        });
        if (!response.ok) {
          throw new Error(`Server responded with ${response.status}`);
        }
        const body = await response.json();
        if (!body?.ok || !body.data) {
          throw new Error(body?.error || 'Capture service failed');
        }
        lastCapturedPayload = body.data;
        chrome.runtime.sendMessage({
          type: 'CAPTURE_COMPLETE',
          data: body.data,
          validationReport: body.validationReport,
          previewWithOverlay: body.previewWithOverlay,
          dataSize: JSON.stringify(body.data).length,
          dataSizeKB: (JSON.stringify(body.data).length / 1024).toFixed(1)
        }, () => void chrome.runtime.lastError);
        sendResponse({ ok: true, data: body.data });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Remote capture failed';
        console.error('Remote capture failed:', message);
        sendResponse({ ok: false, error: message });
      }
    })();
    return true;
  }
  if (message.type === 'CAPTURE_COMPLETE') {
    const { data } = message as { data?: any };
    if (!data) {
      sendResponse?.({ ok: false, error: 'No capture payload received' });
      return false;
    }

    const shouldDownloadOnly = captureDeliveryMode === 'download';
    lastCapturedPayload = data;
    if (shouldDownloadOnly) {
      captureDeliveryMode = 'send';
      chrome.runtime.sendMessage(
        {
          type: 'CAPTURE_DOWNLOAD_READY',
          data,
          dataSize: JSON.stringify(data).length,
          dataSizeKB: (JSON.stringify(data).length / 1024).toFixed(1)
        },
        () => void chrome.runtime.lastError
      );
      sendResponse?.({ ok: true, mode: 'download' });
      return false;
    }
    enqueueHandoffJob(data, 'auto');
    captureDeliveryMode = 'send';
    sendResponse?.({ ok: true, queued: pendingJobs.length });
    return false;
  }

  if (message.type === 'SET_VIEWPORT') {
    (async () => {
      try {
        if (!sender.tab?.id || typeof message.width !== 'number' || typeof message.height !== 'number') {
          sendResponse?.({ ok: false, error: 'Missing tab or viewport dimensions' });
          return;
        }

        const tabId = sender.tab.id;
        const tabInfo = await chrome.tabs.get(tabId);
        if (!tabInfo.windowId) {
          sendResponse?.({ ok: false, error: 'Tab has no associated window' });
          return;
        }

        const windowInfo = await chrome.windows.get(tabInfo.windowId);
        captureTabState[tabId] = captureTabState[tabId] || { windowId: tabInfo.windowId };

        if (!captureTabState[tabId].originalBounds) {
          captureTabState[tabId].originalBounds = {
            width: windowInfo.width,
            height: windowInfo.height,
            left: windowInfo.left,
            top: windowInfo.top
          };
        }

        const desiredWidth = Math.max(320, Math.round(message.width + WINDOW_FRAME_FUDGE.width));
        const desiredHeight = Math.max(200, Math.round(message.height + WINDOW_FRAME_FUDGE.height));

        await chrome.windows.update(tabInfo.windowId, {
          width: desiredWidth,
          height: desiredHeight
        });

        captureTabState[tabId].appliedViewport = { width: message.width, height: message.height };
        sendResponse?.({ ok: true });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to resize viewport';
        console.error('Viewport resize failed:', errorMessage);
        sendResponse?.({ ok: false, error: errorMessage });
      }
    })();
    return true;
  }

  if (message.type === 'RESET_VIEWPORT') {
    (async () => {
      try {
        if (!sender.tab?.id) {
          sendResponse?.({ ok: false, error: 'Missing tab context to reset viewport' });
          return;
        }
        const tabId = sender.tab.id;
        const state = captureTabState[tabId];
        if (!state || !state.originalBounds) {
          sendResponse?.({ ok: true });
          return;
        }

        const updateInfo: chrome.windows.UpdateInfo = {};
        if (typeof state.originalBounds.width === 'number') {
          updateInfo.width = Math.round(state.originalBounds.width);
        }
        if (typeof state.originalBounds.height === 'number') {
          updateInfo.height = Math.round(state.originalBounds.height);
        }
        if (typeof state.originalBounds.left === 'number') {
          updateInfo.left = Math.round(state.originalBounds.left);
        }
        if (typeof state.originalBounds.top === 'number') {
          updateInfo.top = Math.round(state.originalBounds.top);
        }

        await chrome.windows.update(state.windowId, updateInfo);
        delete captureTabState[tabId];
        sendResponse?.({ ok: true });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to reset viewport';
        console.error('Viewport reset failed:', errorMessage);
        sendResponse?.({ ok: false, error: errorMessage });
      }
    })();
    return true;
  }

  // Manual send to handoff (triggered by popup "Send to Figma" button)
  if (message.type === 'SEND_TO_HANDOFF') {
    const { data } = message as { data?: any };
    const payload = data || lastCapturedPayload;
    if (!payload) {
      sendResponse({ ok: false, error: 'No capture data available' });
      return false;
    }

    (async () => {
      try {
        lastCapturedPayload = payload;
        enqueueHandoffJob(payload, 'manual');
        sendResponse({ ok: true, queued: pendingJobs.length });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Failed to send to handoff:', errorMessage);
        sendResponse({ ok: false, error: errorMessage });
      }
    })();

    return true;
  }

  // CORS-free image fetching via background script
  if (message.type === 'FETCH_IMAGE') {
    const { url } = message as { url?: string };
    if (!url) {
      sendResponse({ ok: false, error: 'Missing URL' });
      return false;
    }

    (async () => {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const blob = await response.blob();
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          sendResponse({ ok: true, base64, mimeType: blob.type });
        };
        reader.onerror = () => {
          sendResponse({ ok: false, error: 'FileReader failed' });
        };
        reader.readAsDataURL(blob);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Fetch failed';
        sendResponse({ ok: false, error: errorMessage });
      }
    })();
    return true;
  }

  if (message.type === 'CAPTURE_SCREENSHOT') {
    if (sender.tab?.id) {
      chrome.tabs.captureVisibleTab(
        sender.tab.windowId,
        { format: 'jpeg', quality: 75 },
        (dataUrl) => {
          sendResponse({ screenshot: dataUrl || '' });
        }
      );
      return true;
    }
  }

  if (message.type === 'HANDOFF_HEALTH_CHECK') {
    (async () => {
      try {
        const response = await fetch(HANDOFF_HEALTH_ENDPOINT, {
          headers: { 'cache-control': 'no-cache' }
        });
        if (!response.ok) {
          throw new Error(`Server responded with ${response.status}`);
        }
        const body = await response.json();
        sendResponse({ ok: true, health: body });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Health check failed';
        sendResponse({ ok: false, error: errorMessage });
      }
    })();
    return true;
  }

  if (message.type === 'GET_HANDOFF_STATE') {
    sendResponse({
      ok: true,
      state: handoffState,
      hasCapture: Boolean(lastCapturedPayload)
    });
    return false;
  }

  // Handle chunked capture data
  if (message.type === 'CAPTURE_CHUNKED_START') {
    const { totalChunks, totalSize, totalSizeKB } = message;
    console.log(`📦 Starting chunked capture: ${totalChunks} chunks, ${totalSizeKB}KB total`);
    
    // Reset buffer for new chunked transfer
    chunkedDataBuffer = new Array(totalChunks);
    expectedChunks = totalChunks;
    receivedChunks = 0;
    
    sendResponse({ ok: true });
    return false;
  }

  if (message.type === 'CAPTURE_CHUNKED_DATA') {
    const { chunkIndex, chunkData, totalChunks } = message;
    
    if (chunkIndex >= 0 && chunkIndex < expectedChunks) {
      chunkedDataBuffer[chunkIndex] = chunkData;
      receivedChunks++;
      
      console.log(`📦 Received chunk ${chunkIndex + 1}/${totalChunks} (${receivedChunks}/${expectedChunks} total)`);
      sendResponse({ ok: true, received: receivedChunks, expected: expectedChunks });
    } else {
      sendResponse({ ok: false, error: `Invalid chunk index: ${chunkIndex}` });
    }
    return false;
  }

  if (message.type === 'CAPTURE_CHUNKED_COMPLETE') {
    const { totalChunks } = message;
    
    if (receivedChunks !== expectedChunks) {
      const error = `Incomplete chunked transfer: received ${receivedChunks}/${expectedChunks} chunks`;
      console.error('❌', error);
      sendResponse({ ok: false, error });
      return false;
    }

    try {
      // Reassemble the complete JSON string
      const completeJsonString = chunkedDataBuffer.join('');
      const reassembledData = JSON.parse(completeJsonString);
      
      console.log(`✅ Successfully reassembled ${totalChunks} chunks into complete capture data`);
      
      // Store and queue for handoff
      const shouldDownloadOnly = captureDeliveryMode === 'download';
      lastCapturedPayload = reassembledData;
      if (shouldDownloadOnly) {
        captureDeliveryMode = 'send';
        chrome.runtime.sendMessage(
          {
            type: 'CAPTURE_DOWNLOAD_READY',
            data: reassembledData,
            dataSize: completeJsonString.length,
            dataSizeKB: (completeJsonString.length / 1024).toFixed(1),
            chunked: true
          },
          () => void chrome.runtime.lastError
        );
      } else {
        enqueueHandoffJob(reassembledData, 'auto');
      }

      // Notify any open extension UI (popup) that capture completed
      chrome.runtime.sendMessage({
        type: 'CAPTURE_COMPLETE',
        data: reassembledData,
        dataSize: completeJsonString.length,
        dataSizeKB: (completeJsonString.length / 1024).toFixed(1),
        chunked: true
      }, () => {
        // ignore errors if popup isn't open
        void chrome.runtime.lastError;
      });
      
      // Clean up
      chunkedDataBuffer = [];
      expectedChunks = 0;
      receivedChunks = 0;
      
      sendResponse({
        ok: true,
        queued: pendingJobs.length,
        mode: shouldDownloadOnly ? 'download' : 'send'
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to reassemble chunked data';
      console.error('❌ Chunked reassembly failed:', errorMessage);
      sendResponse({ ok: false, error: errorMessage });
    }
    return false;
  }

  return false;
});

async function postToHandoffServer(payload: unknown): Promise<void> {
  const jsonPayload = JSON.stringify(payload);
  const payloadSizeBytes = new TextEncoder().encode(jsonPayload).length;
  const payloadSizeMB = payloadSizeBytes / (1024 * 1024);
  
  console.log(`📦 Sending payload: ${payloadSizeMB.toFixed(2)}MB`);
  
  // Warn if payload is getting large
  if (payloadSizeMB > 50) {
    console.warn(`⚠️ Large payload detected: ${payloadSizeMB.toFixed(2)}MB - this may fail if over 200MB`);
  }

  const response = await fetch(HANDOFF_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: jsonPayload
  });

  if (!response.ok) {
    if (response.status === 413) {
      throw new Error(`Payload too large (${payloadSizeMB.toFixed(2)}MB). Try capturing a smaller page or fewer viewport sizes.`);
    }
    throw new Error(`Server responded with ${response.status}`);
  }
}

function broadcastHandoffState() {
  try {
    chrome.runtime.sendMessage(
      {
        type: 'HANDOFF_STATUS_UPDATE',
        state: handoffState,
        hasCapture: Boolean(lastCapturedPayload)
      },
      () => {
        // Ignore missing listeners
        void chrome.runtime.lastError;
      }
    );
  } catch (error) {
    console.warn('Failed to broadcast handoff state', error);
  }
}

function enqueueHandoffJob(payload: any, trigger: HandoffTrigger) {
  const job: PendingJob = {
    id: crypto?.randomUUID?.() ?? `job-${Date.now()}-${Math.random()}`,
    payload,
    trigger,
    enqueuedAt: Date.now(),
    retries: 0,
    nextRetryAt: null
  };

  pendingJobs.push(job);
  updateStateForQueue(trigger);
  scheduleQueueProcessing(0);
}

function updateStateForQueue(trigger?: HandoffTrigger | null) {
  const nextRetry = getNextRetryTimestamp();
  const status =
    hasInFlightJob ? 'sending' : pendingJobs.length > 0 ? 'queued' : 'idle';
  handoffState = {
    status,
    trigger: trigger ?? handoffState.trigger ?? null,
    lastAttemptAt: handoffState.lastAttemptAt || null,
    lastSuccessAt: handoffState.lastSuccessAt || null,
    error: status === 'queued' ? null : handoffState.error || null,
    pendingCount: pendingJobs.length,
    nextRetryAt: nextRetry
  };
  broadcastHandoffState();
}

function scheduleQueueProcessing(delayMs: number) {
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
  retryTimer = setTimeout(() => {
    retryTimer = null;
    void processPendingJobs();
  }, Math.max(0, delayMs));
}

async function processPendingJobs(): Promise<void> {
  if (hasInFlightJob) return;

  const readyJob = findReadyJob();
  if (!readyJob) {
    if (pendingJobs.length === 0) {
      handoffState = {
        status: 'idle',
        trigger: null,
        lastAttemptAt: handoffState.lastAttemptAt || null,
        lastSuccessAt: handoffState.lastSuccessAt || null,
        error: null,
        pendingCount: 0,
        nextRetryAt: null
      };
      broadcastHandoffState();
      return;
    }

    updateStateForQueue(handoffState.trigger ?? null);
    const nextDelay = getNextRunnableDelay();
    if (nextDelay !== null) {
      scheduleQueueProcessing(nextDelay);
    }
    return;
  }

  hasInFlightJob = true;
  handoffState = {
    status: 'sending',
    trigger: readyJob.trigger,
    lastAttemptAt: Date.now(),
    lastSuccessAt: handoffState.lastSuccessAt || null,
    error: null,
    pendingCount: pendingJobs.length,
    nextRetryAt: null
  };
  broadcastHandoffState();

  try {
    console.log(`📤 ${readyJob.trigger === 'auto' ? 'Auto' : 'Manual'} handoff starting...`);
    await postToHandoffServer(readyJob.payload);
    console.log('✅ Handoff delivered to server');
    const index = pendingJobs.indexOf(readyJob);
    if (index !== -1) {
      pendingJobs.splice(index, 1);
    }
    handoffState = {
      status: pendingJobs.length > 0 ? 'queued' : 'success',
      trigger: readyJob.trigger,
      lastAttemptAt: handoffState.lastAttemptAt,
      lastSuccessAt: Date.now(),
      error: null,
      pendingCount: pendingJobs.length,
      nextRetryAt: getNextRetryTimestamp()
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Handoff failed:', message);
    readyJob.retries += 1;
    const delay = Math.min(30000, 2000 * readyJob.retries);
    readyJob.nextRetryAt = Date.now() + delay;
    handoffState = {
      status: 'error',
      trigger: readyJob.trigger,
      lastAttemptAt: handoffState.lastAttemptAt,
      lastSuccessAt: handoffState.lastSuccessAt || null,
      error: message,
      pendingCount: pendingJobs.length,
      nextRetryAt: readyJob.nextRetryAt
    };
  } finally {
    hasInFlightJob = false;
    broadcastHandoffState();
    if (pendingJobs.length > 0) {
      const nextDelay = getNextRunnableDelay();
      if (nextDelay !== null && nextDelay > 0) {
        scheduleQueueProcessing(nextDelay);
      } else {
        scheduleQueueProcessing(0);
      }
    }
  }
}

function findReadyJob(): PendingJob | null {
  const now = Date.now();
  return pendingJobs.find((job) => !job.nextRetryAt || job.nextRetryAt <= now) || null;
}

function getNextRetryTimestamp(): number | null {
  const upcoming = pendingJobs
    .map((job) => job.nextRetryAt)
    .filter((value): value is number => typeof value === 'number');
  if (upcoming.length === 0) return null;
  return Math.min(...upcoming);
}

function getNextRunnableDelay(): number | null {
  const nextRetry = getNextRetryTimestamp();
  if (nextRetry === null) return 0;
  const delay = nextRetry - Date.now();
  return delay > 0 ? delay : 0;
}
