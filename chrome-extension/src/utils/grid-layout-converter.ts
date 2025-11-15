/**
 * CSS Grid Layout Converter
 * 
 * Analyzes CSS Grid properties and converts them to nested Auto Layout frames
 * for optimal representation in Figma. Handles complex grid features like
 * fr units, minmax(), grid-template-areas, and grid item positioning.
 */

export interface GridLayoutData {
  isGrid: boolean;
  templateColumns: string;
  templateRows: string;
  templateAreas?: string[][];
  columnGap: number;
  rowGap: number;
  autoFlow?: string;
  autoColumns?: string;
  autoRows?: string;
  justifyItems?: string;
  alignItems?: string;
  justifyContent?: string;
  alignContent?: string;
  // Track size calculations
  computedColumnSizes: number[];
  computedRowSizes: number[];
  // Conversion metadata
  conversionStrategy: 'nested-auto-layout' | 'absolute-positioning' | 'hybrid';
  figmaAnnotations?: string[];
}

export interface GridChildData {
  columnStart?: string | number;
  columnEnd?: string | number;
  rowStart?: string | number;
  rowEnd?: string | number;
  columnSpan?: number;
  rowSpan?: number;
  gridArea?: string;
  justifySelf?: string;
  alignSelf?: string;
  // Computed positioning
  computedColumn: number;
  computedRow: number;
  computedColumnSpan: number;
  computedRowSpan: number;
}

export interface GridTrack {
  size: number;
  unit: 'px' | 'fr' | 'auto' | 'min-content' | 'max-content' | 'minmax';
  minSize?: number;
  maxSize?: number;
  isFlexible: boolean;
}

export interface GridConversionResult {
  mainContainer: {
    layoutMode: 'HORIZONTAL' | 'VERTICAL' | 'NONE';
    autoLayout?: any;
    gridMetadata: GridLayoutData;
  };
  childContainers: Array<{
    type: 'ROW' | 'COLUMN' | 'CELL';
    layoutMode: 'HORIZONTAL' | 'VERTICAL';
    autoLayout?: any;
    gridPosition: { row: number; column: number; rowSpan: number; columnSpan: number };
  }>;
  annotations: string[];
}

export class GridLayoutConverter {
  private containerElement: Element;
  private containerStyles: CSSStyleDeclaration;
  private containerRect: DOMRect;

  constructor(element: Element, styles: CSSStyleDeclaration, rect: DOMRect) {
    this.containerElement = element;
    this.containerStyles = styles;
    this.containerRect = rect;
  }

  /**
   * Main conversion method that analyzes grid layout and determines the best conversion strategy
   */
  public convertGridLayout(): GridConversionResult {
    const gridData = this.analyzeGridContainer();
    const strategy = this.determineConversionStrategy(gridData);
    
    gridData.conversionStrategy = strategy;

    switch (strategy) {
      case 'nested-auto-layout':
        return this.convertToNestedAutoLayout(gridData);
      case 'absolute-positioning':
        return this.convertToAbsolutePositioning(gridData);
      case 'hybrid':
        return this.convertToHybridLayout(gridData);
      default:
        return this.convertToNestedAutoLayout(gridData);
    }
  }

  /**
   * Analyze CSS Grid container properties and compute track sizes
   */
  private analyzeGridContainer(): GridLayoutData {
    const templateColumns = this.containerStyles.gridTemplateColumns || 'none';
    const templateRows = this.containerStyles.gridTemplateRows || 'none';
    const templateAreas = this.parseGridTemplateAreas(this.containerStyles.gridTemplateAreas);
    
    const columnTracks = this.parseGridTemplate(templateColumns, this.containerRect.width);
    const rowTracks = this.parseGridTemplate(templateRows, this.containerRect.height);

    const computedColumnSizes = this.computeTrackSizes(columnTracks, this.containerRect.width, 'column');
    const computedRowSizes = this.computeTrackSizes(rowTracks, this.containerRect.height, 'row');

    const annotations: string[] = [];

    // Add annotations for complex features that can't be directly converted
    if (this.hasComplexGridFeatures(templateColumns, templateRows)) {
      annotations.push('Complex grid features detected');
      
      if (templateColumns.includes('minmax(')) {
        annotations.push('minmax() functions simplified to computed values');
      }
      
      if (templateColumns.includes('repeat(')) {
        annotations.push('repeat() functions expanded');
      }
      
      if (templateAreas) {
        annotations.push(`Grid template areas: ${templateAreas.length} regions`);
      }
    }

    return {
      isGrid: true,
      templateColumns,
      templateRows,
      templateAreas,
      columnGap: this.parseGapValue(this.containerStyles.columnGap || this.containerStyles.gridColumnGap || '0'),
      rowGap: this.parseGapValue(this.containerStyles.rowGap || this.containerStyles.gridRowGap || '0'),
      autoFlow: this.containerStyles.gridAutoFlow,
      autoColumns: this.containerStyles.gridAutoColumns,
      autoRows: this.containerStyles.gridAutoRows,
      justifyItems: this.containerStyles.justifyItems,
      alignItems: this.containerStyles.alignItems,
      justifyContent: this.containerStyles.justifyContent,
      alignContent: this.containerStyles.alignContent,
      computedColumnSizes,
      computedRowSizes,
      conversionStrategy: 'nested-auto-layout', // Will be set by conversion logic
      figmaAnnotations: annotations
    };
  }

  /**
   * Parse grid-template-areas into a 2D array
   */
  private parseGridTemplateAreas(templateAreas?: string): string[][] | undefined {
    if (!templateAreas || templateAreas === 'none') return undefined;

    return templateAreas
      .split(/\s*["']\s*/)
      .filter(line => line.trim())
      .map(line => line.trim().split(/\s+/));
  }

  /**
   * Parse grid template (columns/rows) into tracks
   */
  private parseGridTemplate(template: string, availableSize: number): GridTrack[] {
    if (!template || template === 'none') {
      return [];
    }

    const tracks: GridTrack[] = [];
    
    // Handle repeat() functions
    const expandedTemplate = this.expandRepeatFunctions(template);
    
    // Split by whitespace, handling minmax() and other functions
    const values = this.parseGridTemplateValues(expandedTemplate);

    for (const value of values) {
      const track = this.parseGridTrackSize(value, availableSize);
      tracks.push(track);
    }

    return tracks;
  }

  /**
   * Expand repeat() functions in grid template
   */
  private expandRepeatFunctions(template: string): string {
    return template.replace(/repeat\(\s*(\d+)\s*,\s*(.+?)\)/g, (match, count, pattern) => {
      const repeatCount = parseInt(count);
      const patterns = [];
      
      for (let i = 0; i < repeatCount; i++) {
        patterns.push(pattern.trim());
      }
      
      return patterns.join(' ');
    });
  }

  /**
   * Parse grid template values, handling parentheses in functions
   */
  private parseGridTemplateValues(template: string): string[] {
    const values: string[] = [];
    let current = '';
    let parenLevel = 0;
    let i = 0;

    while (i < template.length) {
      const char = template[i];
      
      if (char === '(') {
        parenLevel++;
        current += char;
      } else if (char === ')') {
        parenLevel--;
        current += char;
      } else if (char === ' ' && parenLevel === 0) {
        if (current.trim()) {
          values.push(current.trim());
          current = '';
        }
      } else {
        current += char;
      }
      
      i++;
    }
    
    if (current.trim()) {
      values.push(current.trim());
    }

    return values;
  }

  /**
   * Parse individual grid track size
   */
  private parseGridTrackSize(value: string, availableSize: number): GridTrack {
    const trimmed = value.trim();

    // Handle minmax()
    if (trimmed.startsWith('minmax(')) {
      const minmaxMatch = trimmed.match(/minmax\(\s*([^,]+)\s*,\s*([^)]+)\s*\)/);
      if (minmaxMatch) {
        const minValue = this.parseTrackUnit(minmaxMatch[1].trim(), availableSize);
        const maxValue = this.parseTrackUnit(minmaxMatch[2].trim(), availableSize);
        
        return {
          size: Math.max(minValue.size, maxValue.size * 0.5), // Use a reasonable middle value
          unit: 'minmax',
          minSize: minValue.size,
          maxSize: maxValue.size,
          isFlexible: maxValue.unit === 'fr' || minValue.unit === 'fr'
        };
      }
    }

    // Handle regular values
    return this.parseTrackUnit(trimmed, availableSize);
  }

  /**
   * Parse track unit (px, fr, auto, etc.)
   */
  private parseTrackUnit(value: string, availableSize: number): GridTrack {
    const trimmed = value.trim();

    if (trimmed === 'auto') {
      return {
        size: availableSize * 0.1, // Estimate for auto sizing
        unit: 'auto',
        isFlexible: true
      };
    }

    if (trimmed === 'min-content') {
      return {
        size: 50, // Minimum reasonable size
        unit: 'min-content',
        isFlexible: false
      };
    }

    if (trimmed === 'max-content') {
      return {
        size: availableSize * 0.2, // Estimate for max-content
        unit: 'max-content',
        isFlexible: true
      };
    }

    if (trimmed.endsWith('fr')) {
      const frValue = parseFloat(trimmed);
      return {
        size: frValue,
        unit: 'fr',
        isFlexible: true
      };
    }

    if (trimmed.endsWith('px')) {
      const pxValue = parseFloat(trimmed);
      return {
        size: pxValue,
        unit: 'px',
        isFlexible: false
      };
    }

    if (trimmed.endsWith('%')) {
      const percentValue = parseFloat(trimmed) / 100;
      return {
        size: availableSize * percentValue,
        unit: 'px',
        isFlexible: false
      };
    }

    if (trimmed.endsWith('em') || trimmed.endsWith('rem')) {
      const emValue = parseFloat(trimmed);
      const fontSize = parseFloat(this.containerStyles.fontSize) || 16;
      return {
        size: emValue * fontSize,
        unit: 'px',
        isFlexible: false
      };
    }

    // Try to parse as a number (assumed px)
    const numValue = parseFloat(trimmed);
    if (!isNaN(numValue)) {
      return {
        size: numValue,
        unit: 'px',
        isFlexible: false
      };
    }

    // Fallback
    return {
      size: 100,
      unit: 'auto',
      isFlexible: true
    };
  }

  /**
   * Compute actual track sizes based on available space and fr units
   */
  private computeTrackSizes(tracks: GridTrack[], availableSize: number, direction: 'column' | 'row'): number[] {
    if (tracks.length === 0) return [];

    const gap = direction === 'column' 
      ? this.parseGapValue(this.containerStyles.columnGap || this.containerStyles.gridColumnGap || '0')
      : this.parseGapValue(this.containerStyles.rowGap || this.containerStyles.gridRowGap || '0');

    const totalGapSize = Math.max(0, (tracks.length - 1) * gap);
    const remainingSize = Math.max(0, availableSize - totalGapSize);

    // Calculate fixed sizes first
    let fixedSize = 0;
    let totalFrUnits = 0;
    const sizes: number[] = new Array(tracks.length);

    tracks.forEach((track, index) => {
      if (track.unit === 'fr') {
        totalFrUnits += track.size;
      } else {
        sizes[index] = track.size;
        fixedSize += track.size;
      }
    });

    // Distribute remaining space to fr units
    const remainingForFr = Math.max(0, remainingSize - fixedSize);
    const frUnitSize = totalFrUnits > 0 ? remainingForFr / totalFrUnits : 0;

    tracks.forEach((track, index) => {
      if (track.unit === 'fr') {
        sizes[index] = track.size * frUnitSize;
      }
    });

    return sizes;
  }

  /**
   * Parse gap value to pixels
   */
  private parseGapValue(gap: string): number {
    if (!gap || gap === 'normal') return 0;

    if (gap.endsWith('px')) {
      return parseFloat(gap);
    }

    if (gap.endsWith('%')) {
      const percent = parseFloat(gap) / 100;
      return Math.min(this.containerRect.width, this.containerRect.height) * percent;
    }

    if (gap.endsWith('em') || gap.endsWith('rem')) {
      const emValue = parseFloat(gap);
      const fontSize = parseFloat(this.containerStyles.fontSize) || 16;
      return emValue * fontSize;
    }

    const numValue = parseFloat(gap);
    if (!isNaN(numValue)) {
      return numValue;
    }

    return 0;
  }

  /**
   * Check for complex grid features that require special handling
   */
  private hasComplexGridFeatures(templateColumns: string, templateRows: string): boolean {
    const complexFeatures = [
      'minmax(',
      'repeat(',
      'fit-content(',
      'min-content',
      'max-content'
    ];

    return complexFeatures.some(feature => 
      templateColumns.includes(feature) || templateRows.includes(feature)
    );
  }

  /**
   * Determine the best conversion strategy based on grid complexity
   */
  private determineConversionStrategy(gridData: GridLayoutData): 'nested-auto-layout' | 'absolute-positioning' | 'hybrid' {
    // Simple grids with uniform tracks work well with nested Auto Layout
    if (this.isSimpleUniformGrid(gridData)) {
      return 'nested-auto-layout';
    }

    // Grids with complex positioning or overlapping items need absolute positioning
    if (this.hasComplexPositioning(gridData)) {
      return 'absolute-positioning';
    }

    // Mixed complexity benefits from hybrid approach
    return 'hybrid';
  }

  /**
   * Check if grid is simple and uniform (good for Auto Layout)
   */
  private isSimpleUniformGrid(gridData: GridLayoutData): boolean {
    // Check if all tracks are similar sizes or simple fr units
    const columnVariation = this.calculateSizeVariation(gridData.computedColumnSizes);
    const rowVariation = this.calculateSizeVariation(gridData.computedRowSizes);

    const isUniform = columnVariation < 0.2 && rowVariation < 0.2; // Less than 20% variation
    const isSimpleTemplate = !gridData.templateAreas && 
                            !gridData.templateColumns.includes('minmax(') &&
                            !gridData.templateRows.includes('minmax(');

    return isUniform && isSimpleTemplate;
  }

  /**
   * Check for complex positioning patterns
   */
  private hasComplexPositioning(gridData: GridLayoutData): boolean {
    // Grid template areas indicate complex positioning
    if (gridData.templateAreas && gridData.templateAreas.length > 0) {
      return true;
    }

    // Check if grid children have complex positioning
    const gridChildren = Array.from(this.containerElement.children);
    return gridChildren.some(child => {
      const styles = window.getComputedStyle(child);
      const gridArea = styles.gridArea;
      const gridColumn = styles.gridColumn;
      const gridRow = styles.gridRow;

      // Complex if using named areas or span > 1
      return gridArea !== 'auto' || 
             gridColumn.includes('span') || 
             gridRow.includes('span') ||
             gridColumn.includes('/') ||
             gridRow.includes('/');
    });
  }

  /**
   * Calculate size variation coefficient
   */
  private calculateSizeVariation(sizes: number[]): number {
    if (sizes.length <= 1) return 0;

    const mean = sizes.reduce((sum, size) => sum + size, 0) / sizes.length;
    const variance = sizes.reduce((sum, size) => sum + Math.pow(size - mean, 2), 0) / sizes.length;
    const standardDeviation = Math.sqrt(variance);

    return mean > 0 ? standardDeviation / mean : 0;
  }

  /**
   * Convert to nested Auto Layout frames (best for simple grids)
   */
  private convertToNestedAutoLayout(gridData: GridLayoutData): GridConversionResult {
    const annotations: string[] = [...(gridData.figmaAnnotations || [])];
    
    // Determine primary direction based on grid structure
    const isRowMajor = gridData.computedRowSizes.length <= gridData.computedColumnSizes.length;
    const mainDirection: 'HORIZONTAL' | 'VERTICAL' = isRowMajor ? 'VERTICAL' : 'HORIZONTAL';

    const mainContainer = {
      layoutMode: mainDirection,
      autoLayout: {
        layoutMode: mainDirection,
        primaryAxisAlignItems: this.mapAlignmentProperty(gridData.alignContent || gridData.justifyContent),
        counterAxisAlignItems: this.mapAlignmentProperty(gridData.justifyContent || gridData.alignContent),
        paddingTop: 0,
        paddingRight: 0,
        paddingBottom: 0,
        paddingLeft: 0,
        itemSpacing: isRowMajor ? gridData.rowGap : gridData.columnGap
      },
      gridMetadata: gridData
    };

    const childContainers = [];

    // Create row or column containers
    if (isRowMajor) {
      // Create row containers
      for (let row = 0; row < gridData.computedRowSizes.length; row++) {
        childContainers.push({
          type: 'ROW' as const,
          layoutMode: 'HORIZONTAL' as const,
          autoLayout: {
            layoutMode: 'HORIZONTAL',
            primaryAxisAlignItems: this.mapAlignmentProperty(gridData.justifyContent),
            counterAxisAlignItems: this.mapAlignmentProperty(gridData.alignItems),
            paddingTop: 0,
            paddingRight: 0,
            paddingBottom: 0,
            paddingLeft: 0,
            itemSpacing: gridData.columnGap
          },
          gridPosition: { row, column: 0, rowSpan: 1, columnSpan: gridData.computedColumnSizes.length }
        });
      }
    } else {
      // Create column containers
      for (let col = 0; col < gridData.computedColumnSizes.length; col++) {
        childContainers.push({
          type: 'COLUMN' as const,
          layoutMode: 'VERTICAL' as const,
          autoLayout: {
            layoutMode: 'VERTICAL',
            primaryAxisAlignItems: this.mapAlignmentProperty(gridData.alignContent),
            counterAxisAlignItems: this.mapAlignmentProperty(gridData.alignItems),
            paddingTop: 0,
            paddingRight: 0,
            paddingBottom: 0,
            paddingLeft: 0,
            itemSpacing: gridData.rowGap
          },
          gridPosition: { row: 0, column: col, rowSpan: gridData.computedRowSizes.length, columnSpan: 1 }
        });
      }
    }

    annotations.push(`Converted to ${isRowMajor ? 'row-based' : 'column-based'} Auto Layout`);
    annotations.push(`${gridData.computedColumnSizes.length} columns × ${gridData.computedRowSizes.length} rows`);

    return {
      mainContainer,
      childContainers,
      annotations
    };
  }

  /**
   * Convert to absolute positioning (for complex grids)
   */
  private convertToAbsolutePositioning(gridData: GridLayoutData): GridConversionResult {
    const annotations: string[] = [...(gridData.figmaAnnotations || [])];
    
    const mainContainer = {
      layoutMode: 'NONE' as const,
      gridMetadata: gridData
    };

    const childContainers: any[] = [];
    annotations.push('Converted to absolute positioning due to grid complexity');
    annotations.push('Grid items positioned manually based on computed grid positions');

    return {
      mainContainer,
      childContainers,
      annotations
    };
  }

  /**
   * Convert to hybrid layout (combines Auto Layout and absolute positioning)
   */
  private convertToHybridLayout(gridData: GridLayoutData): GridConversionResult {
    const annotations: string[] = [...(gridData.figmaAnnotations || [])];
    
    // Use Auto Layout for the main structure, absolute positioning for complex items
    const result = this.convertToNestedAutoLayout(gridData);
    
    annotations.push('Hybrid conversion: Auto Layout structure with absolute positioning for complex grid items');
    
    return {
      ...result,
      annotations
    };
  }

  /**
   * Map CSS alignment properties to Figma Auto Layout properties
   */
  private mapAlignmentProperty(cssAlignment?: string): 'MIN' | 'CENTER' | 'MAX' | 'SPACE_BETWEEN' {
    switch (cssAlignment) {
      case 'start':
      case 'flex-start':
        return 'MIN';
      case 'center':
        return 'CENTER';
      case 'end':
      case 'flex-end':
        return 'MAX';
      case 'space-between':
        return 'SPACE_BETWEEN';
      default:
        return 'MIN';
    }
  }

  /**
   * Analyze grid child positioning
   */
  public static analyzeGridChild(element: Element, styles: CSSStyleDeclaration): GridChildData {
    const gridArea = styles.gridArea;
    const gridColumn = styles.gridColumn;
    const gridRow = styles.gridRow;
    const gridColumnStart = styles.gridColumnStart;
    const gridColumnEnd = styles.gridColumnEnd;
    const gridRowStart = styles.gridRowStart;
    const gridRowEnd = styles.gridRowEnd;

    // Parse positioning values
    const columnStart = GridLayoutConverter.parseGridLineValue(gridColumnStart || gridColumn.split('/')[0]);
    const columnEnd = GridLayoutConverter.parseGridLineValue(gridColumnEnd || gridColumn.split('/')[1]);
    const rowStart = GridLayoutConverter.parseGridLineValue(gridRowStart || gridRow.split('/')[0]);
    const rowEnd = GridLayoutConverter.parseGridLineValue(gridRowEnd || gridRow.split('/')[1]);

    // Calculate spans
    const columnSpan = columnEnd && columnStart ? 
      (typeof columnEnd === 'number' && typeof columnStart === 'number' ? columnEnd - columnStart : 1) : 1;
    const rowSpan = rowEnd && rowStart ? 
      (typeof rowEnd === 'number' && typeof rowStart === 'number' ? rowEnd - rowStart : 1) : 1;

    return {
      columnStart,
      columnEnd,
      rowStart,
      rowEnd,
      columnSpan,
      rowSpan,
      gridArea: gridArea !== 'auto' ? gridArea : undefined,
      justifySelf: styles.justifySelf,
      alignSelf: styles.alignSelf,
      // Computed values (to be filled by grid container analysis)
      computedColumn: typeof columnStart === 'number' ? columnStart - 1 : 0,
      computedRow: typeof rowStart === 'number' ? rowStart - 1 : 0,
      computedColumnSpan: columnSpan,
      computedRowSpan: rowSpan
    };
  }

  /**
   * Parse grid line values (numbers, span, named lines)
   */
  private static parseGridLineValue(value?: string): string | number | undefined {
    if (!value || value === 'auto') return undefined;

    // Handle span notation
    if (value.includes('span')) {
      return value;
    }

    // Try to parse as number
    const numValue = parseInt(value);
    if (!isNaN(numValue)) {
      return numValue;
    }

    // Return as string for named lines
    return value;
  }
}

/**
 * Utility function to detect if an element uses CSS Grid layout
 */
export function isGridContainer(styles: CSSStyleDeclaration): boolean {
  return styles.display === 'grid' || styles.display === 'inline-grid';
}

/**
 * Enhanced grid layout extraction that integrates with the existing DOM extractor
 */
export function extractGridLayoutData(
  element: Element, 
  styles: CSSStyleDeclaration, 
  rect: DOMRect
): { gridLayout?: GridLayoutData; gridChild?: GridChildData } {
  const result: { gridLayout?: GridLayoutData; gridChild?: GridChildData } = {};

  // Check if this element is a grid container
  if (isGridContainer(styles)) {
    const converter = new GridLayoutConverter(element, styles, rect);
    const conversionResult = converter.convertGridLayout();
    result.gridLayout = conversionResult.mainContainer.gridMetadata;
  }

  // Check if this element is a grid child
  const parent = element.parentElement;
  if (parent) {
    const parentStyles = window.getComputedStyle(parent);
    if (isGridContainer(parentStyles)) {
      result.gridChild = GridLayoutConverter.analyzeGridChild(element, styles);
    }
  }

  return result;
}