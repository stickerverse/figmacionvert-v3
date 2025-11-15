import type { WebToFigmaSchema, ElementNode, Fill, Stroke, Effect, RGBA, CornerRadius, GradientStop } from '../types/schema';

/**
 * Canvas-based renderer that simulates how Figma will render the captured schema
 * Used in popup to preview output before sending to Figma
 */
export class FigmaPreviewRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private scale: number = 0.5;
  private imageCache: Map<string, HTMLImageElement> = new Map();
  private schema: WebToFigmaSchema | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) {
      throw new Error('Failed to get 2D context');
    }
    this.ctx = ctx;
  }

  setScale(scale: number) {
    this.scale = scale;
  }

  async render(schema: WebToFigmaSchema): Promise<void> {
    this.schema = schema;

    const viewport = schema.metadata?.viewport ?? {
      width: Math.max(schema.tree?.layout?.width ?? 1024, 1),
      height: Math.max(schema.tree?.layout?.height ?? 768, 1)
    };

    this.canvas.width = viewport.width * this.scale;
    this.canvas.height = viewport.height * this.scale;

    // Pre-load all images (guard against missing assets)
    await this.preloadImages(schema.assets?.images ?? {});

    // Clear canvas with transparent background
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw white background (Figma default)
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Render the tree
    this.renderNode(schema.tree);
  }

  private async preloadImages(images: Record<string, any>): Promise<void> {
    const imageCount = Object.keys(images).length;
    console.log(`🖼️ Preview renderer: Loading ${imageCount} images...`);

    const promises = Object.entries(images).map(async ([hash, asset]) => {
      if (asset.base64) {
        try {
          // Validate base64 data
          const base64 = asset.base64;
          if (typeof base64 !== 'string' || base64.length === 0) {
            throw new Error('Invalid base64 data: empty or not a string');
          }

          // Check for valid base64 characters (basic validation)
          if (!/^[A-Za-z0-9+/=]+$/.test(base64)) {
            throw new Error('Invalid base64 format: contains invalid characters');
          }

          const mimeType = asset.mimeType || 'image/jpeg';
          const dataUri = `data:${mimeType};base64,${base64}`;

          // Log sample of data URI for debugging
          console.log(`🔍 Loading ${hash.substring(0, 8)}: ${mimeType} (${base64.length} bytes, sample: ${dataUri.substring(0, 80)}...)`);

          const img = new Image();
          img.src = dataUri;

          // Wait for decode with error handling
          await img.decode();

          this.imageCache.set(hash, img);
          console.log(`✅ Loaded image ${hash.substring(0, 8)}... (${asset.width}×${asset.height})`);
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          const errorName = err instanceof Error ? err.name : 'Unknown';
          console.error(`❌ Failed to load image ${hash}:`, {
            error: errorMsg,
            type: errorName,
            mimeType: asset.mimeType,
            base64Length: asset.base64?.length,
            dimensions: `${asset.width}×${asset.height}`,
            url: asset.url
          });

          // Try alternative loading method as fallback
          try {
            const img = new Image();
            img.src = asset.url || `data:${asset.mimeType};base64,${asset.base64}`;
            // Don't use decode(), just wait for load event
            await new Promise((resolve, reject) => {
              img.onload = resolve;
              img.onerror = reject;
              setTimeout(() => reject(new Error('Image load timeout')), 5000);
            });
            this.imageCache.set(hash, img);
            console.log(`✅ Loaded image ${hash.substring(0, 8)} using fallback method`);
          } catch (fallbackErr) {
            console.error(`❌ Fallback also failed for ${hash}:`, fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr));
          }
        }
      } else if (asset.url) {
        // Try loading from URL if no base64
        try {
          console.log(`🌐 Loading image from URL: ${asset.url.substring(0, 60)}...`);
          const img = new Image();
          img.crossOrigin = 'anonymous'; // Try to enable CORS
          img.src = asset.url;
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            setTimeout(() => reject(new Error('URL load timeout')), 10000);
          });
          this.imageCache.set(hash, img);
          console.log(`✅ Loaded image ${hash.substring(0, 8)} from URL`);
        } catch (err) {
          console.error(`❌ Failed to load image from URL ${hash}:`, err instanceof Error ? err.message : String(err));
        }
      } else {
        console.warn(`⚠️ Image ${hash} has no base64 data or URL`);
      }
    });
    await Promise.all(promises);

    console.log(`✅ Preview renderer: Loaded ${this.imageCache.size}/${imageCount} images`);
  }

  private renderNode(node: ElementNode): void {
    // Skip invisible nodes
    if (node.visibility === 'hidden' || node.opacity === 0) {
      return;
    }

    // Use absoluteLayout if available, fallback to layout
    const x = (node.absoluteLayout?.left ?? node.layout.x) * this.scale;
    const y = (node.absoluteLayout?.top ?? node.layout.y) * this.scale;
    const w = node.layout.width * this.scale;
    const h = node.layout.height * this.scale;

    // Skip if dimensions are invalid
    if (w <= 0 || h <= 0) {
      return;
    }

    this.ctx.save();

    // Apply opacity
    if (node.opacity !== undefined) {
      this.ctx.globalAlpha = node.opacity;
    }

    // Apply transform if present
    if (node.transform) {
      this.applyTransform(node.transform, x, y, w, h);
    }

    // Apply clip path (corner radius)
    if (node.cornerRadius) {
      this.ctx.beginPath();
      this.roundRect(x, y, w, h, node.cornerRadius);
      this.ctx.clip();
    }

    // Render IMAGE type nodes (special handling for <img> tags)
    if (node.type === 'IMAGE' && node.imageHash) {
      console.log(`🖼️ Rendering IMAGE node: ${node.name} with hash ${node.imageHash.substring(0, 8)}...`);
      const img = this.imageCache.get(node.imageHash);
      if (img) {
        console.log(`✅ Found image in cache, drawing at (${x.toFixed(1)}, ${y.toFixed(1)}) ${w.toFixed(1)}×${h.toFixed(1)}`);
        this.drawImage(img, x, y, w, h, 'FILL');
      } else {
        // Fallback: red rectangle to show missing image
        this.ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
        this.ctx.fillRect(x, y, w, h);
        console.error(`❌ Missing image in cache: ${node.imageHash} (cache size: ${this.imageCache.size})`);
      }
    }
    // Render fills (backgrounds)
    else if (node.fills && node.fills.length > 0) {
      this.renderFills(node.fills, x, y, w, h, node.imageHash);
    }

    // Render effects (shadows)
    if (node.effects && node.effects.length > 0) {
      this.renderEffects(node.effects, x, y, w, h);
    }

    // Render strokes (borders)
    if (node.strokes && node.strokes.length > 0 && node.strokeWeight) {
      this.renderStrokes(node.strokes, x, y, w, h, node.strokeWeight, node.strokeAlign);
    }

    // Render text
    if (node.type === 'TEXT' && node.characters && node.textStyle) {
      this.renderText(node, x, y, w, h);
    }

    this.ctx.restore();

    // Render children
    if (node.children && node.children.length > 0) {
      node.children.forEach(child => this.renderNode(child));
    }
  }

  private renderFills(fills: Fill[], x: number, y: number, w: number, h: number, imageHash?: string): void {
    fills.forEach(fill => {
      if (fill.visible === false) {
        return;
      }

      const opacity = fill.opacity ?? 1;
      this.ctx.save();
      this.ctx.globalAlpha *= opacity;

      if (fill.type === 'SOLID' && fill.color) {
        this.ctx.fillStyle = this.rgbaToString(fill.color);
        this.ctx.fillRect(x, y, w, h);
      } else if (fill.type === 'GRADIENT_LINEAR' && fill.gradientStops) {
        const gradient = this.createLinearGradient(fill.gradientStops, x, y, w, h);
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(x, y, w, h);
      } else if (fill.type === 'GRADIENT_RADIAL' && fill.gradientStops) {
        const gradient = this.createRadialGradient(fill.gradientStops, x, y, w, h);
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(x, y, w, h);
      } else if (fill.type === 'IMAGE' && (fill.imageHash || imageHash)) {
        const hash = fill.imageHash || imageHash;
        console.log(`🖼️ Rendering IMAGE fill with hash ${hash?.substring(0, 8)}...`);
        const img = this.imageCache.get(hash!);
        if (img) {
          console.log(`✅ Drawing background image`);
          this.drawImage(img, x, y, w, h, fill.scaleMode || 'FILL');
        } else {
          console.warn(`⚠️ Background image not found in cache: ${hash}`);
        }
      }

      this.ctx.restore();
    });
  }

  private renderStrokes(strokes: Stroke[], x: number, y: number, w: number, h: number, weight: number, align?: 'INSIDE' | 'OUTSIDE' | 'CENTER'): void {
    strokes.forEach(stroke => {
      const scaledWeight = weight * this.scale;
      const opacity = stroke.opacity ?? 1;

      this.ctx.save();
      this.ctx.globalAlpha *= opacity;
      this.ctx.lineWidth = scaledWeight;

      if (stroke.type === 'SOLID' && stroke.color) {
        this.ctx.strokeStyle = this.rgbaToString(stroke.color);
      }

      // Adjust stroke position based on align
      let adjustedX = x;
      let adjustedY = y;
      let adjustedW = w;
      let adjustedH = h;

      if (align === 'INSIDE') {
        adjustedX += scaledWeight / 2;
        adjustedY += scaledWeight / 2;
        adjustedW -= scaledWeight;
        adjustedH -= scaledWeight;
      } else if (align === 'OUTSIDE') {
        adjustedX -= scaledWeight / 2;
        adjustedY -= scaledWeight / 2;
        adjustedW += scaledWeight;
        adjustedH += scaledWeight;
      }

      this.ctx.strokeRect(adjustedX, adjustedY, adjustedW, adjustedH);
      this.ctx.restore();
    });
  }

  private renderEffects(effects: Effect[], x: number, y: number, w: number, h: number): void {
    effects.forEach(effect => {
      if (!effect.visible) {
        return;
      }

      if (effect.type === 'DROP_SHADOW' && effect.color) {
        const offsetX = (effect.offset?.x ?? 0) * this.scale;
        const offsetY = (effect.offset?.y ?? 0) * this.scale;
        const radius = effect.radius * this.scale;

        this.ctx.shadowColor = this.rgbaToString(effect.color);
        this.ctx.shadowBlur = radius;
        this.ctx.shadowOffsetX = offsetX;
        this.ctx.shadowOffsetY = offsetY;
      }
    });
  }

  private renderText(node: ElementNode, x: number, y: number, w: number, h: number): void {
    const style = node.textStyle!;
    const fontSize = style.fontSize * this.scale;
    const fontWeight = style.fontWeight || 400;
    const fontFamily = style.fontFamily || 'Inter, sans-serif';

    this.ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    this.ctx.textBaseline = 'top';

    // Text alignment
    if (style.textAlignHorizontal === 'CENTER') {
      this.ctx.textAlign = 'center';
      x += w / 2;
    } else if (style.textAlignHorizontal === 'RIGHT') {
      this.ctx.textAlign = 'right';
      x += w;
    } else {
      this.ctx.textAlign = 'left';
    }

    // Vertical alignment
    if (style.textAlignVertical === 'CENTER') {
      y += (h - fontSize) / 2;
    } else if (style.textAlignVertical === 'BOTTOM') {
      y += h - fontSize;
    }

    // Text fill color
    if (style.fills && style.fills.length > 0) {
      const fill = style.fills[0];
      if (fill.type === 'SOLID' && fill.color) {
        this.ctx.fillStyle = this.rgbaToString(fill.color);
      }
    } else {
      this.ctx.fillStyle = '#000000';
    }

    // Simple text rendering (doesn't handle multi-line properly)
    this.ctx.fillText(node.characters!, x, y, w);
  }

  private drawImage(img: HTMLImageElement, x: number, y: number, w: number, h: number, scaleMode: string): void {
    const imgRatio = img.width / img.height;
    const boxRatio = w / h;

    let drawX = x;
    let drawY = y;
    let drawW = w;
    let drawH = h;

    if (scaleMode === 'FIT') {
      // Contain - fit entire image within box
      if (imgRatio > boxRatio) {
        drawH = w / imgRatio;
        drawY = y + (h - drawH) / 2;
      } else {
        drawW = h * imgRatio;
        drawX = x + (w - drawW) / 2;
      }
    } else if (scaleMode === 'CROP') {
      // Cover - fill entire box, crop overflow
      if (imgRatio > boxRatio) {
        drawW = h * imgRatio;
        drawX = x + (w - drawW) / 2;
      } else {
        drawH = w / imgRatio;
        drawY = y + (h - drawH) / 2;
      }
    }
    // FILL mode uses the box dimensions directly

    this.ctx.drawImage(img, drawX, drawY, drawW, drawH);
  }

  private createLinearGradient(stops: GradientStop[], x: number, y: number, w: number, h: number): CanvasGradient {
    // Default to top-to-bottom gradient
    const gradient = this.ctx.createLinearGradient(x, y, x, y + h);

    stops.forEach(stop => {
      gradient.addColorStop(stop.position, this.rgbaToString(stop.color));
    });

    return gradient;
  }

  private createRadialGradient(stops: GradientStop[], x: number, y: number, w: number, h: number): CanvasGradient {
    const centerX = x + w / 2;
    const centerY = y + h / 2;
    const radius = Math.max(w, h) / 2;

    const gradient = this.ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);

    stops.forEach(stop => {
      gradient.addColorStop(stop.position, this.rgbaToString(stop.color));
    });

    return gradient;
  }

  private applyTransform(transform: any, x: number, y: number, w: number, h: number): void {
    // Simple rotation support for now
    if (transform.rotation) {
      const centerX = x + w / 2;
      const centerY = y + h / 2;
      this.ctx.translate(centerX, centerY);
      this.ctx.rotate(transform.rotation * Math.PI / 180);
      this.ctx.translate(-centerX, -centerY);
    }
  }

  private roundRect(x: number, y: number, w: number, h: number, radius: number | CornerRadius): void {
    let r: CornerRadius;

    if (typeof radius === 'number') {
      r = {
        topLeft: radius * this.scale,
        topRight: radius * this.scale,
        bottomRight: radius * this.scale,
        bottomLeft: radius * this.scale
      };
    } else {
      r = {
        topLeft: radius.topLeft * this.scale,
        topRight: radius.topRight * this.scale,
        bottomRight: radius.bottomRight * this.scale,
        bottomLeft: radius.bottomLeft * this.scale
      };
    }

    this.ctx.beginPath();
    this.ctx.moveTo(x + r.topLeft, y);
    this.ctx.lineTo(x + w - r.topRight, y);
    this.ctx.quadraticCurveTo(x + w, y, x + w, y + r.topRight);
    this.ctx.lineTo(x + w, y + h - r.bottomRight);
    this.ctx.quadraticCurveTo(x + w, y + h, x + w - r.bottomRight, y + h);
    this.ctx.lineTo(x + r.bottomLeft, y + h);
    this.ctx.quadraticCurveTo(x, y + h, x, y + h - r.bottomLeft);
    this.ctx.lineTo(x, y + r.topLeft);
    this.ctx.quadraticCurveTo(x, y, x + r.topLeft, y);
    this.ctx.closePath();
  }

  private rgbaToString(color: RGBA): string {
    return `rgba(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)}, ${color.a})`;
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  getSchema(): WebToFigmaSchema | null {
    return this.schema;
  }
}
