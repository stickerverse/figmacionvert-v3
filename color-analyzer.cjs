/**
 * Color Analyzer - Extract color palettes and design tokens from screenshots
 * 
 * Features:
 * 1. Dominant color extraction using node-vibrant
 * 2. Color palette generation
 * 3. Dark mode vs light mode detection
 * 4. Contrast ratio calculation for accessibility
 * 5. Color token generation for Figma
 */

const { Vibrant } = require('node-vibrant/node');
const chroma = require('chroma-js');

/**
 * Extract color palette from an image
 * @param {Buffer|string} image - Image buffer or file path
 * @returns {Promise<ColorPalette>}
 */
async function extractColorPalette(image) {
  try {
    const palette = await Vibrant.from(image).getPalette();
    
    const colors = {
      vibrant: palette.Vibrant ? colorToToken(palette.Vibrant) : null,
      darkVibrant: palette.DarkVibrant ? colorToToken(palette.DarkVibrant) : null,
      lightVibrant: palette.LightVibrant ? colorToToken(palette.LightVibrant) : null,
      muted: palette.Muted ? colorToToken(palette.Muted) : null,
      darkMuted: palette.DarkMuted ? colorToToken(palette.DarkMuted) : null,
      lightMuted: palette.LightMuted ? colorToToken(palette.LightMuted) : null
    };
    
    // Filter out null values
    const validColors = Object.fromEntries(
      Object.entries(colors).filter(([_, v]) => v !== null)
    );
    
    // Detect theme (dark vs light mode)
    const theme = detectTheme(validColors);
    
    // Generate design tokens
    const tokens = generateColorTokens(validColors, theme);
    
    return {
      palette: validColors,
      theme,
      tokens,
      css: generateCSSVariables(tokens)
    };
  } catch (error) {
    console.error('[color] Palette extraction failed:', error.message);
    return {
      palette: {},
      theme: 'unknown',
      tokens: {},
      css: '',
      error: error.message
    };
  }
}

/**
 * Convert Vibrant swatch to color token
 */
function colorToToken(swatch) {
  if (!swatch) return null;
  
  const hex = swatch.hex;
  const rgb = swatch.rgb;
  const hsl = chroma(hex).hsl();
  
  return {
    hex,
    rgb: { r: rgb[0], g: rgb[1], b: rgb[2] },
    hsl: { h: hsl[0] || 0, s: hsl[1] || 0, l: hsl[2] || 0 },
    population: swatch.population,
    // Figma-compatible format (0-1 range)
    figma: {
      r: rgb[0] / 255,
      g: rgb[1] / 255,
      b: rgb[2] / 255
    }
  };
}

/**
 * Detect if the page is dark mode or light mode
 */
function detectTheme(colors) {
  // Calculate average lightness
  const lightnesses = Object.values(colors)
    .filter(c => c !== null)
    .map(c => c.hsl.l);
  
  if (lightnesses.length === 0) return 'unknown';
  
  const avgLightness = lightnesses.reduce((a, b) => a + b, 0) / lightnesses.length;
  
  if (avgLightness < 0.3) return 'dark';
  if (avgLightness > 0.7) return 'light';
  return 'mixed';
}

/**
 * Generate design tokens from extracted colors
 */
function generateColorTokens(colors, theme) {
  const tokens = {};
  
  // Primary color (most vibrant)
  if (colors.vibrant) {
    tokens.primary = colors.vibrant.hex;
    tokens['primary-rgb'] = `${colors.vibrant.rgb.r}, ${colors.vibrant.rgb.g}, ${colors.vibrant.rgb.b}`;
  }
  
  // Secondary color (muted variant)
  if (colors.muted) {
    tokens.secondary = colors.muted.hex;
  }
  
  // Accent color (dark vibrant)
  if (colors.darkVibrant) {
    tokens.accent = colors.darkVibrant.hex;
  }
  
  // Background and foreground based on theme
  if (theme === 'dark') {
    tokens.background = colors.darkMuted?.hex || '#1a1a1a';
    tokens.foreground = colors.lightVibrant?.hex || '#ffffff';
  } else {
    tokens.background = colors.lightMuted?.hex || '#ffffff';
    tokens.foreground = colors.darkVibrant?.hex || '#1a1a1a';
  }
  
  // Generate color scale for primary
  if (colors.vibrant) {
    const scale = generateColorScale(colors.vibrant.hex);
    tokens['primary-50'] = scale[0];
    tokens['primary-100'] = scale[1];
    tokens['primary-200'] = scale[2];
    tokens['primary-300'] = scale[3];
    tokens['primary-400'] = scale[4];
    tokens['primary-500'] = scale[5];
    tokens['primary-600'] = scale[6];
    tokens['primary-700'] = scale[7];
    tokens['primary-800'] = scale[8];
    tokens['primary-900'] = scale[9];
  }
  
  return tokens;
}

/**
 * Generate a 10-step color scale from a base color
 */
function generateColorScale(baseColor) {
  return chroma
    .scale(['white', baseColor, 'black'])
    .mode('lab')
    .colors(11)
    .slice(1, 11); // Skip pure white, get 10 shades
}

/**
 * Generate CSS custom properties from tokens
 */
function generateCSSVariables(tokens) {
  return Object.entries(tokens)
    .map(([name, value]) => `--color-${name}: ${value};`)
    .join('\n');
}

/**
 * Calculate contrast ratio between two colors (WCAG)
 */
function calculateContrastRatio(color1, color2) {
  const l1 = chroma(color1).luminance();
  const l2 = chroma(color2).luminance();
  
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if colors meet WCAG accessibility standards
 */
function checkAccessibility(foreground, background) {
  const ratio = calculateContrastRatio(foreground, background);
  
  return {
    ratio: ratio.toFixed(2),
    AA_normal: ratio >= 4.5,   // Normal text
    AA_large: ratio >= 3,      // Large text (18pt+)
    AAA_normal: ratio >= 7,    // Enhanced normal text
    AAA_large: ratio >= 4.5    // Enhanced large text
  };
}

/**
 * Analyze colors from DOM-extracted styles
 * @param {Array<{color: string, usage: number}>} colors - Colors with usage counts
 */
function analyzeExtractedColors(colors) {
  // Cluster similar colors
  const clusters = clusterColors(colors);
  
  // Rank by usage and vibrancy
  const ranked = clusters.sort((a, b) => {
    const aScore = a.usage * (chroma(a.color).saturate().luminance() + 0.1);
    const bScore = b.usage * (chroma(b.color).saturate().luminance() + 0.1);
    return bScore - aScore;
  });
  
  return {
    dominant: ranked.slice(0, 5),
    background: findLikelyBackground(ranked),
    text: findLikelyTextColor(ranked),
    accent: findLikelyAccent(ranked)
  };
}

/**
 * Cluster similar colors together
 */
function clusterColors(colors, threshold = 25) {
  const clusters = [];
  
  for (const { color, usage } of colors) {
    try {
      const chromaColor = chroma(color);
      let found = false;
      
      for (const cluster of clusters) {
        const distance = chroma.deltaE(chromaColor, chroma(cluster.color));
        if (distance < threshold) {
          cluster.usage += usage;
          cluster.variants.push(color);
          found = true;
          break;
        }
      }
      
      if (!found) {
        clusters.push({
          color: chromaColor.hex(),
          usage,
          variants: [color]
        });
      }
    } catch (e) {
      // Skip invalid colors
    }
  }
  
  return clusters;
}

/**
 * Find likely background color (high lightness, high usage)
 */
function findLikelyBackground(colors) {
  for (const { color, usage } of colors) {
    const l = chroma(color).luminance();
    if (l > 0.9 && usage > 5) return color; // Light background
    if (l < 0.1 && usage > 5) return color; // Dark background
  }
  return colors[0]?.color || '#ffffff';
}

/**
 * Find likely text color (opposite of background)
 */
function findLikelyTextColor(colors) {
  const bgCandidate = findLikelyBackground(colors);
  const bgLuminance = chroma(bgCandidate).luminance();
  
  // Find a color with good contrast
  for (const { color } of colors) {
    const ratio = calculateContrastRatio(color, bgCandidate);
    if (ratio >= 4.5) return color;
  }
  
  return bgLuminance > 0.5 ? '#000000' : '#ffffff';
}

/**
 * Find likely accent color (saturated, moderate usage)
 */
function findLikelyAccent(colors) {
  for (const { color } of colors) {
    const sat = chroma(color).saturate();
    const hsl = chroma(color).hsl();
    if (hsl[1] > 0.5 && hsl[2] > 0.3 && hsl[2] < 0.7) {
      return color;
    }
  }
  return colors[0]?.color || '#3b82f6';
}

module.exports = {
  extractColorPalette,
  analyzeExtractedColors,
  calculateContrastRatio,
  checkAccessibility,
  generateColorScale,
  generateCSSVariables,
  detectTheme
};
