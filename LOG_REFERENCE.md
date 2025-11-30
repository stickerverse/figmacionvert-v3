# Quick Reference - What Each Log Means

## Console Log Legend

### 🎨 Applying common styles

**Appears for**: Every element being styled  
**Shows**: What data exists (backgrounds, fills, imageHash, effects, cornerRadius)  
**Example**:

```
🎨 Applying common styles to login-card: {
  hasBackgrounds: true,
  backgroundsCount: 1,
  hasFills: false,
  hasImageHash: false,
  hasEffects: true
}
```

### 🎨 Converting SOLID background

**Appears for**: Solid color fills  
**Shows**: RGB color values and opacity  
**Example**: `🎨 Converting SOLID background: { r: 0, g: 0.627, b: 1, opacity: 1 }`

### 🌈 Converting GRADIENT_LINEAR

**Appears for**: Linear gradient backgrounds  
**Shows**: Number of gradient stops  
**Example**: `🌈 Converting GRADIENT_LINEAR gradient with 2 stops`

### ✨ Applying X effects

**Appears for**: Elements with shadows/blur  
**Shows**: Number of effects, then details of converted effects  
**Example**:

```
✨ Applying 1 effects to login-card
✨ Converted effects: [{ type: 'DROP_SHADOW', visible: true }]
```

### 🔲 Applying corner radius

**Appears for**: Elements with border-radius  
**Shows**: Corner radius values  
**Example**: `🔲 Applying corner radius to login-card: { topLeft: 16, topRight: 16, bottomLeft: 16, bottomRight: 16 }`

### 📝 Created text node

**Appears for**: Text elements  
**Shows**: First 50 characters of text  
**Example**: `📝 Created text node: "Welcome Back"`

## Common Patterns to Look For

### ✅ Everything Working

```
🎨 Applying common styles to body: { hasBackgrounds: true, backgroundsCount: 1, ... }
  🌈 Converting GRADIENT_LINEAR gradient with 3 stops
  ✅ Converted 1 background layers

🎨 Applying common styles to login-card: { hasBackgrounds: true, ... }
  🎨 Converting SOLID background: { r: 1, g: 1, b: 1, opacity: 1 }
  ✅ Converted 1 background layers
  ✨ Applying 1 effects to login-card
  ✨ Converted effects: [{ type: 'DROP_SHADOW', visible: true }]
  🔲 Applying corner radius to login-card: { topLeft: 16, ... }
```

### ❌ Data Not Captured

```
🎨 Applying common styles to login-card: {
  hasBackgrounds: false,  // ← No background captured!
  hasFills: false,
  hasEffects: false        // ← No shadow captured!
}
  ⚪ No fills/backgrounds for login-card, setting transparent
```

### ⚠️ Partial Data

```
🎨 Applying common styles to button: { hasBackgrounds: true, ... }
  🎨 Converting SOLID background: { r: 0, g: 0.627, b: 1 }
  ✅ Converted 1 background layers
  // No effects log = no shadow captured
  // No corner radius log = no border-radius captured
```

## What to Do Next

1. **Look for gradient on body/background**  
   Search console for: "body" or "custom-container"  
   Should see: `🌈 Converting GRADIENT_LINEAR`

2. **Look for shadow on white card**  
   Search console for: "card" or "container"  
   Should see: `✨ Applying 1 effects`

3. **Look for rounded corners**  
   Search console for: "card" or "button"  
   Should see: `🔲 Applying corner radius`

4. **Look for button color**  
   Search console for: "button" or "log-in" or "btn"  
   Should see: `🎨 Converting SOLID background` with blue color

If you DON'T see these logs, it means the Chrome extension isn't capturing that property, and I need to fix the extraction code.
