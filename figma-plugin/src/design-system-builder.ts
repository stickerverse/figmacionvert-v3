export class DesignSystemBuilder {
  private styles: any;

  constructor(styles: any = {}) {
    this.styles = styles || {};
  }

  async createDesignSystemPage(): Promise<PageNode> {
    const page = figma.createPage();
    page.name = '🎨 Design System';

    await figma.loadFontAsync({ family: 'Inter', style: 'Bold' });
    await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });

    const colorFrame = await this.createColorPalette();
    colorFrame.x = 0;
    colorFrame.y = 0;
    page.appendChild(colorFrame);

    const typographyFrame = await this.createTypographyShowcase();
    typographyFrame.x = 0;
    typographyFrame.y = colorFrame.height + 80;
    page.appendChild(typographyFrame);

    return page;
  }

  private async createColorPalette(): Promise<FrameNode> {
    const frame = figma.createFrame();
    frame.name = '🎨 Color Palette';
    frame.layoutMode = 'VERTICAL';
    frame.primaryAxisSizingMode = 'AUTO';
    frame.counterAxisSizingMode = 'AUTO';
    frame.itemSpacing = 24;
    frame.paddingTop = frame.paddingBottom = 40;
    frame.paddingLeft = frame.paddingRight = 40;
    frame.fills = [{ type: 'SOLID', color: { r: 0.98, g: 0.98, b: 0.98 } }];

    const title = figma.createText();
    title.fontName = { family: 'Inter', style: 'Bold' };
    title.fontSize = 24;
    title.characters = 'Color Palette';
    title.fills = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }];
    frame.appendChild(title);

    const colorsContainer = figma.createFrame();
    colorsContainer.layoutMode = 'HORIZONTAL';
    colorsContainer.primaryAxisSizingMode = 'AUTO';
    colorsContainer.counterAxisSizingMode = 'AUTO';
    colorsContainer.itemSpacing = 16;
    colorsContainer.fills = [];

    if (this.styles.colors) {
      const sortedColors = Object.values(this.styles.colors)
        .sort((a: any, b: any) => b.usageCount - a.usageCount)
        .slice(0, 12);

      for (const colorData of sortedColors as any[]) {
        const swatch = await this.createColorSwatch(colorData);
        colorsContainer.appendChild(swatch);
      }
    }

    frame.appendChild(colorsContainer);

    return frame;
  }

  private async createColorSwatch(colorData: any): Promise<FrameNode> {
    const swatch = figma.createFrame();
    swatch.layoutMode = 'VERTICAL';
    swatch.primaryAxisSizingMode = 'AUTO';
    swatch.counterAxisSizingMode = 'AUTO';
    swatch.itemSpacing = 8;
    swatch.fills = [];

    const colorRect = figma.createRectangle();
    colorRect.resize(80, 80);
    const { r, g, b } = colorData.color;
    colorRect.fills = [{ type: 'SOLID', color: { r, g, b }, opacity: colorData.color.a ?? 1 }];
    colorRect.cornerRadius = 8;
    swatch.appendChild(colorRect);

    const label = figma.createText();
    label.fontName = { family: 'Inter', style: 'Regular' };
    label.fontSize = 10;
    label.characters = `#${this.rgbaToHex(colorData.color)}\n${colorData.usageCount}x`;
    label.fills = [{ type: 'SOLID', color: { r: 0.4, g: 0.4, b: 0.4 } }];
    swatch.appendChild(label);

    return swatch;
  }

  private async createTypographyShowcase(): Promise<FrameNode> {
    const frame = figma.createFrame();
    frame.name = '📝 Typography';
    frame.layoutMode = 'VERTICAL';
    frame.primaryAxisSizingMode = 'AUTO';
    frame.counterAxisSizingMode = 'AUTO';
    frame.itemSpacing = 24;
    frame.paddingTop = frame.paddingBottom = 40;
    frame.paddingLeft = frame.paddingRight = 40;
    frame.fills = [{ type: 'SOLID', color: { r: 0.98, g: 0.98, b: 0.98 } }];

    const title = figma.createText();
    title.fontName = { family: 'Inter', style: 'Bold' };
    title.fontSize = 24;
    title.characters = 'Typography';
    title.fills = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }];
    frame.appendChild(title);

    if (this.styles.textStyles) {
      const sortedTextStyles = Object.values(this.styles.textStyles)
        .sort((a: any, b: any) => b.fontSize - a.fontSize)
        .slice(0, 8);

      for (const textStyleData of sortedTextStyles as any[]) {
        const sample = await this.createTextSample(textStyleData);
        frame.appendChild(sample);
      }
    }

    return frame;
  }

  private async createTextSample(textStyleData: any): Promise<TextNode> {
    try {
      await figma.loadFontAsync({ 
        family: textStyleData.fontFamily, 
        style: this.mapFontWeight(textStyleData.fontWeight)
      });
    } catch (e) {
      await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
    }

    const text = figma.createText();
    text.fontName = { 
      family: textStyleData.fontFamily, 
      style: this.mapFontWeight(textStyleData.fontWeight)
    };
    text.fontSize = textStyleData.fontSize;
    text.characters = `${textStyleData.fontFamily} ${textStyleData.fontWeight} ${textStyleData.fontSize}px (${textStyleData.usageCount}x)`;
    text.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2 } }];

    return text;
  }

  private rgbaToHex(color: any): string {
    const r = Math.round(color.r * 255).toString(16).padStart(2, '0');
    const g = Math.round(color.g * 255).toString(16).padStart(2, '0');
    const b = Math.round(color.b * 255).toString(16).padStart(2, '0');
    return `${r}${g}${b}`.toUpperCase();
  }

  private mapFontWeight(weight: number): string {
    const weightMap: { [key: number]: string } = {
      100: 'Thin',
      200: 'Extra Light',
      300: 'Light',
      400: 'Regular',
      500: 'Medium',
      600: 'Semi Bold',
      700: 'Bold',
      800: 'Extra Bold',
      900: 'Black'
    };
    return weightMap[weight] || 'Regular';
  }
}
