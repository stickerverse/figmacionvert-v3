export class SelectionOverlay {
  private overlay: HTMLElement;
  private label: HTMLElement;
  private hoveredElement: HTMLElement | null = null;
  private isActive: boolean = false;
  private onSelect: (element: HTMLElement) => void;
  private onCancel: () => void;

  constructor(onSelect: (element: HTMLElement) => void, onCancel: () => void) {
    this.onSelect = onSelect;
    this.onCancel = onCancel;

    // Create overlay element
    this.overlay = document.createElement("div");
    this.overlay.style.position = "fixed";
    this.overlay.style.pointerEvents = "none";
    this.overlay.style.background = "rgba(24, 160, 251, 0.1)"; // Figma blue tint
    this.overlay.style.border = "2px solid #18A0FB";
    this.overlay.style.zIndex = "999999";
    this.overlay.style.transition = "all 0.1s ease";
    this.overlay.style.boxSizing = "border-box";
    this.overlay.style.borderRadius = "2px";
    this.overlay.style.display = "none";

    // Create label
    this.label = document.createElement("div");
    this.label.style.position = "absolute";
    this.label.style.top = "-24px";
    this.label.style.left = "0";
    this.label.style.background = "#18A0FB";
    this.label.style.color = "white";
    this.label.style.padding = "2px 6px";
    this.label.style.fontSize = "12px";
    this.label.style.fontFamily = "Inter, sans-serif";
    this.label.style.borderRadius = "2px 2px 0 0";
    this.label.style.whiteSpace = "nowrap";
    this.overlay.appendChild(this.label);

    // Bind methods
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleClick = this.handleClick.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
  }

  public start() {
    if (this.isActive) return;
    this.isActive = true;

    document.body.appendChild(this.overlay);
    document.addEventListener("mousemove", this.handleMouseMove, true);
    document.addEventListener("click", this.handleClick, true);
    document.addEventListener("keydown", this.handleKeyDown, true);

    // Add a global style to change cursor
    const style = document.createElement("style");
    style.id = "web-to-figma-cursor-style";
    style.innerHTML = `* { cursor: crosshair !important; }`;
    document.head.appendChild(style);
  }

  public stop() {
    if (!this.isActive) return;
    this.isActive = false;

    if (this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }

    const style = document.getElementById("web-to-figma-cursor-style");
    if (style) style.remove();

    document.removeEventListener("mousemove", this.handleMouseMove, true);
    document.removeEventListener("click", this.handleClick, true);
    document.removeEventListener("keydown", this.handleKeyDown, true);
  }

  private handleMouseMove(event: MouseEvent) {
    const target = document.elementFromPoint(
      event.clientX,
      event.clientY
    ) as HTMLElement;

    if (!target || target === this.overlay || this.overlay.contains(target))
      return;

    this.hoveredElement = target;
    this.updateOverlay(target);
  }

  private updateOverlay(element: HTMLElement) {
    const rect = element.getBoundingClientRect();

    this.overlay.style.display = "block";
    this.overlay.style.top = `${rect.top}px`;
    this.overlay.style.left = `${rect.left}px`;
    this.overlay.style.width = `${rect.width}px`;
    this.overlay.style.height = `${rect.height}px`;

    // Update label
    const tagName = element.tagName.toLowerCase();
    const id = element.id ? `#${element.id}` : "";
    const className =
      element.className && typeof element.className === "string"
        ? `.${element.className.split(" ")[0]}`
        : "";

    this.label.textContent = `${tagName}${id}${className} (${Math.round(
      rect.width
    )}x${Math.round(rect.height)})`;
  }

  private handleClick(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();

    if (this.hoveredElement) {
      this.onSelect(this.hoveredElement);
      this.stop();
    }
  }

  private handleKeyDown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      this.onCancel();
      this.stop();
    } else if (event.key === "Enter" && this.hoveredElement) {
      this.onSelect(this.hoveredElement);
      this.stop();
    } else if (this.hoveredElement) {
      // Navigation logic (optional, for later)
      // Up: parent, Down: first child, etc.
      if (event.key === "ArrowUp" && this.hoveredElement.parentElement) {
        this.hoveredElement = this.hoveredElement.parentElement;
        this.updateOverlay(this.hoveredElement);
        event.preventDefault();
      }
    }
  }
}
