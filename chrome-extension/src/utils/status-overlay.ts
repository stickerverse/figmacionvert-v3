export class StatusOverlay {
  private overlay: HTMLDivElement | null = null;

  show(message: string): void {
    // Overlay disabled by user request
    // if (this.overlay) this.hide();

    // this.overlay = document.createElement('div');
    // this.overlay.style.cssText = `
    //   position: fixed;
    //   top: 20px;
    //   left: 50%;
    //   transform: translateX(-50%);
    //   padding: 16px 24px;
    //   background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    //   color: white;
    //   font-size: 16px;
    //   font-weight: 600;
    //   border-radius: 8px;
    //   box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    //   z-index: 2147483647;
    //   font-family: system-ui, -apple-system, sans-serif;
    // `;
    // this.overlay.textContent = message;
    // document.body.appendChild(this.overlay);
    console.log(`[StatusOverlay] ${message}`);
  }

  update(message: string): void {
    // if (this.overlay) {
    //   this.overlay.textContent = message;
    // }
    console.log(`[StatusOverlay] ${message}`);
  }

  hide(): void {
    // if (this.overlay) {
    //   this.overlay.remove();
    //   this.overlay = null;
    // }
  }
}
