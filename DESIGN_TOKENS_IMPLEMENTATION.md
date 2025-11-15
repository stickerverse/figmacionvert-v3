# Design Token Conversion Implementation

## Overview

This implementation enhances the HTML to Figma converter to maintain design system continuity by converting CSS variables to Figma Variables API instead of flattening everything to literal values. This preserves the token relationships and aliases that exist in the original design system.

## Architecture

### 1. Enhanced Schema (`chrome-extension/src/types/schema.ts`)

**New interfaces added:**

```typescript
export interface DesignTokensRegistry {
  variables: Record<string, DesignToken>;
  collections: Record<string, TokenCollection>;
  aliases: Record<string, TokenAlias>;
  usage: Record<string, TokenUsage>;
}

export interface DesignToken {
  id: string;
  name: string;
  originalName: string; // Original CSS variable name (--color-primary)
  type: TokenType;
  value: TokenValue;
  scopes: TokenScope[];
  collection: string;
  description?: string;
  resolvedValue?: any;
  references?: string[];
  referencedBy?: string[];
}
```

**Key features:**
- Maintains original CSS variable names (`--color-primary`)
- Tracks variable relationships and aliases
- Maps to appropriate Figma scopes
- Groups variables into semantic collections

### 2. Design Token Extraction (`chrome-extension/src/utils/design-token-extractor.ts`)

**New comprehensive extraction system:**

```typescript
export class DesignTokenExtractor {
  async extractTokens(): Promise<DesignTokensRegistry>
}
```

**Enhanced capabilities:**
- Extracts CSS variables from `:root` and all scoped elements
- Detects variable aliases (`var(--primary-color)` → `var(--brand-blue)`)
- Tracks usage patterns across elements
- Infers semantic meaning from variable names
- Groups tokens into logical collections (Colors, Typography, Spacing, etc.)

**Semantic analysis:**
- Automatically detects color, typography, spacing, and sizing tokens
- Maps to appropriate Figma variable scopes
- Preserves variable cascade and inheritance

### 3. Figma Variables Integration (`figma-plugin/src/design-tokens-manager.ts`)

**New Figma Variables API integration:**

```typescript
export class DesignTokensManager {
  async createFigmaVariables(): Promise<void>
  getVariableByTokenId(tokenId: string): Variable | undefined
}
```

**Features:**
- Creates Figma variable collections for semantic grouping
- Converts CSS variable types to appropriate Figma types:
  - `COLOR` variables → Figma COLOR variables
  - Numeric values → Figma FLOAT variables
  - String values → Figma STRING variables
- Establishes alias relationships between variables
- Maps variable scopes (ALL_FILLS, TEXT_CONTENT, CORNER_RADIUS, etc.)

### 4. Enhanced Node Building

**Updated `figma-plugin/src/node-builder.ts`:**

- Modified `convertFillsAsync()` to bind colors to variables when available
- Enhanced `applyCornerRadius()` to support variable binding
- Added automatic color matching to find corresponding design tokens
- Backward compatibility with literal values when variables aren't available

**Updated `figma-plugin/src/style-manager.ts`:**

- Enhanced style creation to use variable binding
- Maintains both variable-bound and literal styles for flexibility

## Integration Points

### 1. Chrome Extension Flow

```
Page Load → Enhanced Extraction → CSS Variables Discovery →
Design Token Analysis → Variable Relationship Detection →
Schema Generation with DesignTokensRegistry
```

### 2. Figma Plugin Flow

```
Schema Import → Design Tokens Manager → Variable Collections Creation →
Variable Creation → Alias Resolution → Node Building with Variable Binding
```

## Usage

### 1. Chrome Extension

The enhanced design token extraction happens automatically during page capture:

```javascript
// Enhanced design token extraction
const designTokenExtractor = new DesignTokenExtractor();
const designTokensRegistry = await designTokenExtractor.extractTokens();

// Store in schema
schema.designTokensRegistry = designTokensRegistry;
```

### 2. Figma Plugin

Variables are created automatically when enhanced tokens are available:

```javascript
// Create design tokens/variables if available
if (this.designTokensManager) {
  await this.designTokensManager.createFigmaVariables();
  
  const tokenStats = this.designTokensManager.getStatistics();
  console.log('✅ Design tokens created:', tokenStats);
}
```

## Key Benefits

### 1. Design System Continuity
- Preserves original CSS variable names and relationships
- Maintains semantic meaning of design tokens
- Enables design system maintenance in Figma

### 2. Variable Aliasing
- Detects and preserves `var(--alias)` relationships
- Creates proper Figma variable aliases
- Maintains design token hierarchy

### 3. Semantic Organization
- Groups variables into logical collections
- Maps to appropriate Figma scopes
- Infers purpose from variable names

### 4. Backward Compatibility
- Maintains legacy design token extraction
- Falls back to literal values when variables unavailable
- Supports existing workflows

## Implementation Details

### Variable Collection Strategy

Variables are automatically grouped into semantic collections:

- **Brand Colors**: Primary, secondary brand colors
- **Semantic Colors**: Status, feedback colors (success, error, warning)
- **Neutral Colors**: Grayscale and neutral tones
- **Typography**: Font sizes, weights, line heights
- **Spacing**: Margins, padding, gaps
- **Sizing**: Component dimensions
- **Corner Radius**: Border radius values
- **Shadows**: Drop shadows and elevation

### Scope Mapping

CSS properties are mapped to appropriate Figma variable scopes:

```typescript
// Color scopes
'background-color' → FRAME_FILL
'color' → TEXT_CONTENT
'border-color' → STROKE_COLOR
'box-shadow' → EFFECT_COLOR

// Numeric scopes  
'border-radius' → CORNER_RADIUS
'width', 'height' → WIDTH_HEIGHT
'gap' → GAP
```

### Alias Detection

The system detects various alias patterns:

```css
:root {
  --brand-blue: #0066cc;
  --primary-color: var(--brand-blue);  /* Detected as alias */
  --button-bg: var(--primary-color);   /* Detected as alias */
}
```

These create a chain of Figma variable aliases preserving the relationship.

## Error Handling

### 1. Graceful Degradation
- Falls back to literal values if variable creation fails
- Maintains backward compatibility with existing schemas
- Continues import process even if some variables fail

### 2. Color Matching Tolerance
- Allows small differences in computed vs declared colors
- Uses 0.01 tolerance for RGB matching
- Handles browser color computation variations

### 3. Variable Reference Resolution
- Handles circular reference detection
- Gracefully handles missing variable references
- Provides fallback values where appropriate

## Testing Strategy

### 1. Unit Tests
- Test design token extraction logic
- Validate variable relationship detection
- Verify semantic collection grouping

### 2. Integration Tests
- Test full extraction → import workflow
- Validate variable binding in Figma
- Verify alias relationship preservation

### 3. Edge Cases
- Circular variable references
- Missing variable declarations
- Complex nested variable aliases
- Large-scale design systems

## Performance Considerations

### 1. Extraction Efficiency
- Processes variables only once per element
- Uses Maps for efficient token lookup
- Minimizes DOM traversals

### 2. Variable Creation Batching
- Groups variable creation by collection
- Efficient alias resolution in separate pass
- Minimal Figma API calls

### 3. Memory Management
- Clears temporary extraction data
- Efficient token registry storage
- Garbage collection friendly

## Future Enhancements

### 1. Enhanced Variable Types
- Support for custom Figma variable types as they become available
- Advanced color space handling
- Complex expression evaluation

### 2. Design System Documentation
- Auto-generate design system documentation from tokens
- Variable usage tracking and analytics
- Design token deprecation warnings

### 3. Multi-Theme Support
- Extract theme variations (light/dark modes)
- Create multiple variable modes
- Theme-aware variable binding

## Migration Guide

### For Existing Projects

1. **Automatic Enhancement**: Existing projects automatically benefit from variable creation when available
2. **Backward Compatibility**: Legacy design token extraction continues to work
3. **Gradual Migration**: Can enable variable features incrementally

### For Design Systems

1. **CSS Variable Adoption**: Encourage use of CSS custom properties
2. **Semantic Naming**: Use descriptive variable names for better auto-classification
3. **Alias Patterns**: Establish consistent alias patterns for automatic detection

This implementation provides a robust foundation for maintaining design system continuity while preserving the flexibility and accuracy of the existing HTML to Figma conversion process.