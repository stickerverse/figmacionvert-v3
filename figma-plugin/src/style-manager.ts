import { DesignTokensManager } from './design-tokens-manager';

export class StyleManager {
  private paintStyles: Map<string, PaintStyle> = new Map();
  private textStyles: Map<string, TextStyle> = new Map();
  private effectStyles: Map<string, EffectStyle> = new Map();

  private styles: any;

  constructor(styles: any = {}, private designTokensManager?: DesignTokensManager) {
    // Ensure downstream style access always hits an object
    this.styles = styles || {};
  }

  /**
   * Find a matching design token for a color value
   */
  private findColorToken(color: { r: number; g: number; b: number; a?: number }): string | undefined {
    if (!this.designTokensManager) return undefined;

    // Look through the design tokens registry to find a matching color
    const tolerance = 0.01; // Allow small differences in color values
    
    for (const [tokenId, token] of Object.entries((this.designTokensManager as any).tokensRegistry.variables)) {
      if (token.type === 'COLOR' && token.resolvedValue) {
        const tokenColor = token.resolvedValue;
        if (
          Math.abs(tokenColor.r - color.r) < tolerance &&
          Math.abs(tokenColor.g - color.g) < tolerance &&
          Math.abs(tokenColor.b - color.b) < tolerance
        ) {
          return tokenId;
        }
      }
    }

    return undefined;
  }

  async createFigmaStyles(): Promise<void> {
    if (this.styles.colors) {
      for (const [key, colorData] of Object.entries(this.styles.colors) as any[]) {
        const style = figma.createPaintStyle();
        style.name = `Colors/${colorData.name}`;
        const { r, g, b } = colorData.color;
        
        const paint: SolidPaint = {
          type: 'SOLID',
          color: { r, g, b },
          opacity: colorData.color.a ?? 1
        };

        // Try to bind to a variable if design tokens manager is available
        if (this.designTokensManager) {
          const tokenId = this.findColorToken({ r, g, b, a: colorData.color.a });
          if (tokenId) {
            const variable = this.designTokensManager.getVariableByTokenId(tokenId);
            if (variable && variable.resolvedType === 'COLOR') {
              paint.boundVariables = { color: { type: 'VARIABLE_ALIAS', id: variable.id } };
            }
          }
        }

        style.paints = [paint];
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
