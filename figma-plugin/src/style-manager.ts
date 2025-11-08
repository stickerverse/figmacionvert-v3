export class StyleManager {
  private paintStyles: Map<string, PaintStyle> = new Map();
  private textStyles: Map<string, TextStyle> = new Map();
  private effectStyles: Map<string, EffectStyle> = new Map();

  private styles: any;

  constructor(styles: any = {}) {
    // Ensure downstream style access always hits an object
    this.styles = styles || {};
  }

  async createFigmaStyles(): Promise<void> {
    if (this.styles.colors) {
      for (const [key, colorData] of Object.entries(this.styles.colors) as any[]) {
        const style = figma.createPaintStyle();
        style.name = `Colors/${colorData.name}`;
        const { r, g, b } = colorData.color;
        style.paints = [{
          type: 'SOLID',
          color: { r, g, b },
          opacity: colorData.color.a ?? 1
        }];
        this.paintStyles.set(key, style);
      }
    }

    if (this.styles.textStyles) {
      for (const [key, textStyleData] of Object.entries(this.styles.textStyles) as any[]) {
        const style = figma.createTextStyle();
        style.name = `Text/${textStyleData.name}`;
        
        try {
          await figma.loadFontAsync({ 
            family: textStyleData.fontFamily, 
            style: this.mapFontWeight(textStyleData.fontWeight)
          });
          
          style.fontName = {
            family: textStyleData.fontFamily,
            style: this.mapFontWeight(textStyleData.fontWeight)
          };
          style.fontSize = textStyleData.fontSize;
          
          this.textStyles.set(key, style);
        } catch (e) {
          console.warn(`Failed to create text style: ${textStyleData.name}`);
        }
      }
    }

    if (this.styles.effects) {
      for (const [key, effectsData] of Object.entries(this.styles.effects) as any[]) {
        const style = figma.createEffectStyle();
        style.name = `Effects/Shadow ${Object.keys(this.effectStyles).length + 1}`;
        style.effects = this.convertEffects(effectsData);
        this.effectStyles.set(key, style);
      }
    }
  }

  private convertEffects(effects: any[]): Effect[] {
    return effects.map(effect => {
      if (effect.type === 'DROP_SHADOW') {
        return {
          type: 'DROP_SHADOW',
          color: effect.color,
          offset: effect.offset,
          radius: effect.radius,
          spread: effect.spread || 0,
          visible: effect.visible,
          blendMode: effect.blendMode || 'NORMAL'
        } as DropShadowEffect;
      }
      return effect;
    });
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

  getStyleCount(): number {
    return this.paintStyles.size + this.textStyles.size + this.effectStyles.size;
  }

  getPaintStyle(key: string): PaintStyle | undefined {
    return this.paintStyles.get(key);
  }

  getTextStyle(key: string): TextStyle | undefined {
    return this.textStyles.get(key);
  }

  getEffectStyle(key: string): EffectStyle | undefined {
    return this.effectStyles.get(key);
  }
}
