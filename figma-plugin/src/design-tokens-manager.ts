import {
  DesignToken,
  DesignTokensRegistry,
  TokenCollection,
  TokenAlias,
  TokenType,
  TokenScope,
  TokenValue
} from '../../chrome-extension/src/types/schema';

/**
 * Manages the conversion of extracted design tokens to Figma Variables API
 * Maintains design system relationships and handles variable collections
 */
export class DesignTokensManager {
  private variableCollections = new Map<string, VariableCollection>();
  private createdVariables = new Map<string, Variable>();
  private aliasQueue: TokenAlias[] = [];

  constructor(private tokensRegistry: DesignTokensRegistry) {}

  /**
   * Create Figma variables from the extracted design tokens registry
   */
  async createFigmaVariables(): Promise<void> {
    console.log('🎨 Creating Figma variables from design tokens...');

    // First pass: Create variable collections
    await this.createVariableCollections();

    // Second pass: Create variables
    await this.createVariables();

    // Third pass: Resolve aliases between variables
    await this.resolveAliases();

    console.log('✅ Figma variables creation complete:', {
      collections: this.variableCollections.size,
      variables: this.createdVariables.size,
      aliases: this.aliasQueue.length
    });
  }

  /**
   * Get created variable by token ID for use in node building
   */
  getVariableByTokenId(tokenId: string): Variable | undefined {
    return this.createdVariables.get(tokenId);
  }

  /**
   * Get variable collection by name
   */
  getCollectionByName(name: string): VariableCollection | undefined {
    for (const collection of this.variableCollections.values()) {
      if (collection.name === name) {
        return collection;
      }
    }
    return undefined;
  }

  /**
   * Check if a token should be converted to a Figma variable
   */
  shouldCreateVariable(token: DesignToken): boolean {
    // Skip variables that are purely aliases to other variables for now
    // These will be handled in the alias resolution pass
    return token.value.type !== 'VARIABLE_ALIAS' || token.references?.length === 0;
  }

  /**
   * Create Figma variable collections from token collections
   */
  private async createVariableCollections(): Promise<void> {
    for (const [collectionId, tokenCollection] of Object.entries(this.tokensRegistry.collections)) {
      try {
        const figmaCollection = figma.variables.createVariableCollection(tokenCollection.name);
        
        // Set collection description if available
        if (tokenCollection.description) {
          // Note: Figma Variables API doesn't currently support collection descriptions
          // This is preparation for when it does
        }

        // Create a default mode for the collection
        const defaultMode = figmaCollection.modes[0];
        if (defaultMode) {
          figmaCollection.renameMode(defaultMode.modeId, 'Default');
        }

        this.variableCollections.set(collectionId, figmaCollection);
        
        console.log(`📁 Created collection: ${tokenCollection.name} (${tokenCollection.variables.length} variables)`);
      } catch (error) {
        console.warn(`Failed to create collection ${tokenCollection.name}:`, error);
      }
    }
  }

  /**
   * Create Figma variables from design tokens
   */
  private async createVariables(): Promise<void> {
    for (const [tokenId, token] of Object.entries(this.tokensRegistry.variables)) {
      if (!this.shouldCreateVariable(token)) {
        this.aliasQueue.push(...this.findAliasesForToken(tokenId));
        continue;
      }

      try {
        const collection = this.getTokenCollection(token);
        if (!collection) {
          console.warn(`No collection found for token ${token.name}`);
          continue;
        }

        // Create the variable
        const variable = figma.variables.createVariable(
          token.name,
          collection,
          this.mapTokenTypeToFigmaType(token.type)
        );

        // Set variable scopes
        const figmaScopes = this.mapTokenScopesToFigmaScopes(token.scopes);
        if (figmaScopes.length > 0) {
          variable.scopes = figmaScopes;
        }

        // Set variable value for the default mode
        const defaultMode = collection.modes[0];
        if (defaultMode) {
          const figmaValue = this.convertTokenValueToFigmaValue(token.value, token.type);
          if (figmaValue !== undefined) {
            variable.setValueForMode(defaultMode.modeId, figmaValue);
          }
        }

        // Set variable description from token metadata
        if (token.description) {
          variable.description = token.description;
        }

        this.createdVariables.set(tokenId, variable);
        
        console.log(`🔧 Created variable: ${token.name} (${token.type})`);
      } catch (error) {
        console.warn(`Failed to create variable ${token.name}:`, error);
      }
    }
  }

  /**
   * Resolve alias relationships between variables
   */
  private async resolveAliases(): Promise<void> {
    for (const alias of this.aliasQueue) {
      try {
        const sourceVariable = this.createdVariables.get(alias.from);
        const targetVariable = this.createdVariables.get(alias.to);

        if (!sourceVariable || !targetVariable) {
          console.warn(`Cannot resolve alias ${alias.from} -> ${alias.to}: variables not found`);
          continue;
        }

        // Create the source variable if it doesn't exist yet
        if (!this.createdVariables.has(alias.from)) {
          const sourceToken = this.tokensRegistry.variables[alias.from];
          if (sourceToken) {
            await this.createSingleVariable(sourceToken, alias.from);
          }
        }

        // Set alias relationship
        const collection = sourceVariable.variableCollectionId;
        const figmaCollection = this.findCollectionById(collection);
        
        if (figmaCollection) {
          const defaultMode = figmaCollection.modes[0];
          if (defaultMode) {
            // Create variable alias
            const aliasValue = figma.variables.createVariableAlias(targetVariable);
            sourceVariable.setValueForMode(defaultMode.modeId, aliasValue);
            
            console.log(`🔗 Created alias: ${sourceVariable.name} -> ${targetVariable.name}`);
          }
        }
      } catch (error) {
        console.warn(`Failed to resolve alias ${alias.from} -> ${alias.to}:`, error);
      }
    }
  }

  /**
   * Create a single variable (used for alias resolution)
   */
  private async createSingleVariable(token: DesignToken, tokenId: string): Promise<void> {
    const collection = this.getTokenCollection(token);
    if (!collection) return;

    try {
      const variable = figma.variables.createVariable(
        token.name,
        collection,
        this.mapTokenTypeToFigmaType(token.type)
      );

      const figmaScopes = this.mapTokenScopesToFigmaScopes(token.scopes);
      if (figmaScopes.length > 0) {
        variable.scopes = figmaScopes;
      }

      this.createdVariables.set(tokenId, variable);
    } catch (error) {
      console.warn(`Failed to create variable ${token.name}:`, error);
    }
  }

  /**
   * Find aliases that reference a specific token
   */
  private findAliasesForToken(tokenId: string): TokenAlias[] {
    return Object.values(this.tokensRegistry.aliases).filter(alias => 
      alias.from === tokenId || alias.to === tokenId
    );
  }

  /**
   * Get the Figma collection for a token
   */
  private getTokenCollection(token: DesignToken): VariableCollection | undefined {
    return this.variableCollections.get(token.collection);
  }

  /**
   * Find collection by Figma ID
   */
  private findCollectionById(id: string): VariableCollection | undefined {
    for (const collection of this.variableCollections.values()) {
      if (collection.id === id) {
        return collection;
      }
    }
    return undefined;
  }

  /**
   * Map token type to Figma variable type
   */
  private mapTokenTypeToFigmaType(tokenType: TokenType): VariableResolvedDataType {
    switch (tokenType) {
      case 'COLOR':
        return 'COLOR';
      case 'FLOAT':
        return 'FLOAT';
      case 'STRING':
        return 'STRING';
      case 'BOOLEAN':
        return 'BOOLEAN';
      default:
        return 'STRING';
    }
  }

  /**
   * Map token scopes to Figma variable scopes
   */
  private mapTokenScopesToFigmaScopes(tokenScopes: TokenScope[]): VariableScope[] {
    const figmaScopes: VariableScope[] = [];

    for (const scope of tokenScopes) {
      switch (scope) {
        case 'ALL_SCOPES':
          return ['ALL_SCOPES']; // Return early, don't add other scopes
        case 'TEXT_CONTENT':
        case 'TEXT_FILL':
          figmaScopes.push('TEXT_CONTENT');
          break;
        case 'CORNER_RADIUS':
          figmaScopes.push('CORNER_RADIUS');
          break;
        case 'WIDTH_HEIGHT':
          figmaScopes.push('WIDTH_HEIGHT');
          break;
        case 'GAP':
          figmaScopes.push('GAP');
          break;
        case 'STROKE_COLOR':
          figmaScopes.push('STROKE_COLOR');
          break;
        case 'EFFECT_COLOR':
          figmaScopes.push('EFFECT_COLOR');
          break;
        case 'ALL_FILLS':
        case 'FRAME_FILL':
        case 'SHAPE_FILL':
          figmaScopes.push('ALL_FILLS');
          break;
      }
    }

    // Remove duplicates
    return [...new Set(figmaScopes)];
  }

  /**
   * Convert token value to Figma-compatible value
   */
  private convertTokenValueToFigmaValue(tokenValue: TokenValue, tokenType: TokenType): any {
    switch (tokenValue.type) {
      case 'SOLID':
        return this.convertSolidValue(tokenValue.value, tokenType);
      case 'ALIAS':
      case 'VARIABLE_ALIAS':
        // These are handled in the alias resolution pass
        return undefined;
      default:
        return tokenValue.value;
    }
  }

  /**
   * Convert solid token value to appropriate Figma type
   */
  private convertSolidValue(value: any, tokenType: TokenType): any {
    switch (tokenType) {
      case 'COLOR':
        if (typeof value === 'object' && 'r' in value) {
          // Already RGBA format
          return value;
        } else if (typeof value === 'string') {
          // Parse color string
          return this.parseColorString(value);
        }
        break;
      case 'FLOAT':
        if (typeof value === 'string') {
          const parsed = parseFloat(value.replace(/px|em|rem|%/, ''));
          return isNaN(parsed) ? 0 : parsed;
        }
        return typeof value === 'number' ? value : 0;
      case 'STRING':
        return String(value);
      case 'BOOLEAN':
        return Boolean(value);
    }
    return value;
  }

  /**
   * Parse color string to RGBA format
   */
  private parseColorString(colorStr: string): { r: number; g: number; b: number; a: number } {
    // This is a simplified color parser - in practice you'd want more robust parsing
    if (colorStr.startsWith('#')) {
      return this.parseHexColor(colorStr);
    } else if (colorStr.startsWith('rgb')) {
      return this.parseRgbColor(colorStr);
    } else {
      // Fallback for named colors or other formats
      return { r: 0, g: 0, b: 0, a: 1 };
    }
  }

  /**
   * Parse hex color to RGBA
   */
  private parseHexColor(hex: string): { r: number; g: number; b: number; a: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
      return {
        r: parseInt(result[1], 16) / 255,
        g: parseInt(result[2], 16) / 255,
        b: parseInt(result[3], 16) / 255,
        a: 1
      };
    }
    return { r: 0, g: 0, b: 0, a: 1 };
  }

  /**
   * Parse RGB/RGBA color to RGBA
   */
  private parseRgbColor(rgb: string): { r: number; g: number; b: number; a: number } {
    const values = rgb.match(/[\d.]+/g);
    if (values && values.length >= 3) {
      return {
        r: parseInt(values[0]) / 255,
        g: parseInt(values[1]) / 255,
        b: parseInt(values[2]) / 255,
        a: values[3] ? parseFloat(values[3]) : 1
      };
    }
    return { r: 0, g: 0, b: 0, a: 1 };
  }

  /**
   * Get statistics about created variables
   */
  getStatistics() {
    const collections = Array.from(this.variableCollections.values());
    const variables = Array.from(this.createdVariables.values());
    
    const stats = {
      collections: collections.length,
      variables: variables.length,
      variablesByCollection: {} as Record<string, number>,
      variablesByType: {} as Record<string, number>,
      aliasesResolved: this.aliasQueue.length
    };

    // Count variables by collection
    for (const collection of collections) {
      const variablesInCollection = variables.filter(v => v.variableCollectionId === collection.id);
      stats.variablesByCollection[collection.name] = variablesInCollection.length;
    }

    // Count variables by type
    for (const variable of variables) {
      const type = variable.resolvedType;
      stats.variablesByType[type] = (stats.variablesByType[type] || 0) + 1;
    }

    return stats;
  }
}