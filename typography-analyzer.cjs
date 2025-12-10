/**
 * Typography Analyzer - Detect font scales and spacing systems
 * 
 * Features:
 * 1. Font size hierarchy detection (h1, h2, body, etc.)
 * 2. Spacing scale detection (4px, 8px, 16px systems)
 * 3. Line height analysis
 * 4. Font family grouping
 * 5. Typography token generation
 */

/**
 * Analyze typography from extracted DOM data
 * @param {Array<{fontSize: number, fontFamily: string, lineHeight: string, usage: number}>} fonts
 * @returns {TypographyAnalysis}
 */
function analyzeTypography(fonts) {
  // Group by font size
  const sizeGroups = groupByFontSize(fonts);
  
  // Detect type scale
  const typeScale = detectTypeScale(sizeGroups);
  
  // Detect font families
  const families = groupFontFamilies(fonts);
  
  // Generate typography tokens
  const tokens = generateTypographyTokens(typeScale, families);
  
  return {
    typeScale,
    families,
    tokens,
    css: generateTypographyCSS(tokens)
  };
}

/**
 * Group fonts by size and calculate usage
 */
function groupByFontSize(fonts) {
  const groups = new Map();
  
  for (const font of fonts) {
    const size = Math.round(font.fontSize);
    if (!groups.has(size)) {
      groups.set(size, { size, count: 0, samples: [] });
    }
    const group = groups.get(size);
    group.count += font.usage || 1;
    if (group.samples.length < 3) {
      group.samples.push(font);
    }
  }
  
  return Array.from(groups.values()).sort((a, b) => b.size - a.size);
}

/**
 * Detect common type scales (Major Third, Perfect Fourth, etc.)
 */
function detectTypeScale(sizeGroups) {
  if (sizeGroups.length < 3) {
    return { scale: 'custom', ratio: null, sizes: sizeGroups };
  }
  
  // Common type scale ratios
  const SCALES = [
    { name: 'minor-second', ratio: 1.067 },
    { name: 'major-second', ratio: 1.125 },
    { name: 'minor-third', ratio: 1.2 },
    { name: 'major-third', ratio: 1.25 },
    { name: 'perfect-fourth', ratio: 1.333 },
    { name: 'augmented-fourth', ratio: 1.414 },
    { name: 'perfect-fifth', ratio: 1.5 },
    { name: 'golden-ratio', ratio: 1.618 }
  ];
  
  // Find base size (most common)
  const baseSize = sizeGroups.reduce((a, b) => a.count > b.count ? a : b).size;
  
  // Calculate ratios between adjacent sizes
  const sizes = sizeGroups.map(g => g.size).sort((a, b) => a - b);
  const ratios = [];
  for (let i = 1; i < sizes.length; i++) {
    ratios.push(sizes[i] / sizes[i - 1]);
  }
  
  // Find average ratio
  const avgRatio = ratios.reduce((a, b) => a + b, 0) / ratios.length;
  
  // Match to closest known scale
  let bestMatch = { name: 'custom', ratio: avgRatio };
  let minDiff = Infinity;
  
  for (const scale of SCALES) {
    const diff = Math.abs(avgRatio - scale.ratio);
    if (diff < minDiff && diff < 0.1) {
      minDiff = diff;
      bestMatch = scale;
    }
  }
  
  // Classify sizes into semantic roles
  const roles = classifySizes(sizeGroups, baseSize);
  
  return {
    scale: bestMatch.name,
    ratio: bestMatch.ratio,
    baseSize,
    sizes: sizeGroups,
    roles
  };
}

/**
 * Classify font sizes into semantic roles
 */
function classifySizes(sizeGroups, baseSize) {
  const sorted = [...sizeGroups].sort((a, b) => b.size - a.size);
  const roles = {};
  
  // Assign roles based on relative size
  for (let i = 0; i < sorted.length; i++) {
    const { size, count } = sorted[i];
    const ratio = size / baseSize;
    
    if (ratio >= 2.5 && !roles.h1) {
      roles.h1 = size;
    } else if (ratio >= 2 && !roles.h2) {
      roles.h2 = size;
    } else if (ratio >= 1.5 && !roles.h3) {
      roles.h3 = size;
    } else if (ratio >= 1.25 && !roles.h4) {
      roles.h4 = size;
    } else if (ratio >= 1.1 && !roles.h5) {
      roles.h5 = size;
    } else if (Math.abs(ratio - 1) < 0.1 && !roles.body) {
      roles.body = size;
    } else if (ratio < 1 && ratio >= 0.85 && !roles.small) {
      roles.small = size;
    } else if (ratio < 0.85 && !roles.caption) {
      roles.caption = size;
    }
  }
  
  return roles;
}

/**
 * Group and rank font families
 */
function groupFontFamilies(fonts) {
  const familyMap = new Map();
  
  for (const font of fonts) {
    const family = normalizeFontFamily(font.fontFamily);
    if (!familyMap.has(family)) {
      familyMap.set(family, { family, usage: 0, weights: new Set() });
    }
    const entry = familyMap.get(family);
    entry.usage += font.usage || 1;
    if (font.fontWeight) {
      entry.weights.add(font.fontWeight);
    }
  }
  
  return Array.from(familyMap.values())
    .map(f => ({ ...f, weights: Array.from(f.weights).sort() }))
    .sort((a, b) => b.usage - a.usage);
}

/**
 * Normalize font family name
 */
function normalizeFontFamily(family) {
  if (!family) return 'system-ui';
  // Take first font in stack
  const first = family.split(',')[0].trim();
  // Remove quotes
  return first.replace(/["']/g, '');
}

/**
 * Analyze spacing values to detect spacing scale
 */
function analyzeSpacing(spacings) {
  // Common spacing scales
  const COMMON_SCALES = [4, 8]; // 4px or 8px base
  
  // Count spacing values
  const counts = new Map();
  for (const spacing of spacings) {
    const value = Math.round(spacing);
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  
  // Find most likely base
  let bestBase = 8;
  let bestScore = 0;
  
  for (const base of COMMON_SCALES) {
    let score = 0;
    for (const [value, count] of counts) {
      if (value % base === 0) {
        score += count;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestBase = base;
    }
  }
  
  // Generate scale
  const scale = [];
  for (let i = 1; i <= 16; i++) {
    scale.push(bestBase * i);
  }
  
  return {
    base: bestBase,
    scale: scale.slice(0, 10),
    detected: Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([value, count]) => ({ value, count }))
  };
}

/**
 * Generate typography tokens
 */
function generateTypographyTokens(typeScale, families) {
  const tokens = {};
  
  // Font families
  if (families.length > 0) {
    tokens['font-sans'] = families[0].family;
    if (families.length > 1) {
      tokens['font-serif'] = families.find(f => 
        f.family.toLowerCase().includes('serif') ||
        f.family.toLowerCase().includes('georgia') ||
        f.family.toLowerCase().includes('times')
      )?.family || families[1].family;
    }
    tokens['font-mono'] = families.find(f =>
      f.family.toLowerCase().includes('mono') ||
      f.family.toLowerCase().includes('code') ||
      f.family.toLowerCase().includes('consolas')
    )?.family || 'monospace';
  }
  
  // Font sizes
  if (typeScale.roles) {
    for (const [role, size] of Object.entries(typeScale.roles)) {
      tokens[`text-${role}`] = `${size}px`;
    }
  }
  
  // Scale ratio
  if (typeScale.ratio) {
    tokens['scale-ratio'] = typeScale.ratio.toFixed(3);
  }
  
  return tokens;
}

/**
 * Generate CSS for typography tokens
 */
function generateTypographyCSS(tokens) {
  return Object.entries(tokens)
    .map(([name, value]) => `--${name}: ${value};`)
    .join('\n');
}

module.exports = {
  analyzeTypography,
  analyzeSpacing,
  detectTypeScale,
  groupFontFamilies,
  generateTypographyTokens
};
