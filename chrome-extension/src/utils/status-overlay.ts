export class StatusOverlay {
  private overlay: HTMLDivElement | null = null;
  private phaseElement: HTMLDivElement | null = null;
  private detailElement: HTMLDivElement | null = null;
  private progressBar: HTMLDivElement | null = null;
  private startTime: number = 0;

  show(message: string, phase?: string, percent?: number): void {
    if (this.overlay) this.hide();

    this.startTime = Date.now();
    this.overlay = document.createElement("div");
    this.overlay.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      padding: 20px 28px;
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.95) 0%, rgba(118, 75, 162, 0.95) 100%);
      backdrop-filter: blur(12px);
      color: white;
      border-radius: 12px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.4);
      z-index: 2147483647;
      font-family: system-ui, -apple-system, sans-serif;
      min-width: 320px;
      max-width: 500px;
    `;

    // Main message
    const messageEl = document.createElement("div");
    messageEl.style.cssText = `
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 8px;
    `;
    messageEl.textContent = message;
    this.overlay.appendChild(messageEl);

    // Phase indicator
    this.phaseElement = document.createElement("div");
    this.phaseElement.style.cssText = `
      font-size: 13px;
      font-weight: 500;
      color: rgba(255, 255, 255, 0.85);
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 6px;
    `;
    if (phase) {
      this.phaseElement.textContent = `📋 ${phase}`;
    }
    this.overlay.appendChild(this.phaseElement);

    // Progress bar
    this.progressBar = document.createElement("div");
    this.progressBar.style.cssText = `
      width: 100%;
      height: 4px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 2px;
      overflow: hidden;
      margin-bottom: 8px;
    `;
    const progressFill = document.createElement("div");
    progressFill.style.cssText = `
      height: 100%;
      background: linear-gradient(90deg, #00d4aa 0%, #00bcd4 100%);
      border-radius: 2px;
      transition: width 0.3s ease;
      width: ${percent || 0}%;
    `;
    this.progressBar.appendChild(progressFill);
    this.overlay.appendChild(this.progressBar);

    // Detail text
    this.detailElement = document.createElement("div");
    this.detailElement.style.cssText = `
      font-size: 11px;
      color: rgba(255, 255, 255, 0.7);
      font-weight: 400;
      line-height: 1.4;
    `;
    this.overlay.appendChild(this.detailElement);

    document.body.appendChild(this.overlay);
    console.log(
      `[StatusOverlay] ${message}${phase ? ` - ${phase}` : ""}${
        percent !== undefined ? ` (${percent}%)` : ""
      }`
    );
  }

  update(
    message: string,
    phase?: string,
    percent?: number,
    details?: string
  ): void {
    if (!this.overlay) {
      this.show(message, phase, percent);
      return;
    }

    // Update main message (first child)
    const messageEl = this.overlay.firstElementChild as HTMLElement;
    if (messageEl) {
      messageEl.textContent = message;
    }

    // Update phase
    if (this.phaseElement) {
      if (phase) {
        this.phaseElement.textContent = `📋 ${phase}`;
        this.phaseElement.style.display = "flex";
      } else {
        this.phaseElement.style.display = "none";
      }
    }

    // Update progress bar
    if (this.progressBar && percent !== undefined) {
      const progressFill = this.progressBar.firstElementChild as HTMLElement;
      if (progressFill) {
        progressFill.style.width = `${percent}%`;
      }
    }

    // Update details
    if (this.detailElement) {
      const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);
      let detailText = `⏱️ ${elapsed}s`;
      if (details) {
        detailText += ` • ${details}`;
      }
      this.detailElement.textContent = detailText;
    }

    console.log(
      `[StatusOverlay] ${message}${phase ? ` - ${phase}` : ""}${
        percent !== undefined ? ` (${percent}%)` : ""
      }${details ? ` - ${details}` : ""}`
    );
  }

  hide(): void {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
      this.phaseElement = null;
      this.detailElement = null;
      this.progressBar = null;
      this.startTime = 0;
    }
  }
}
