# .wtf File Format Specification
## Web To Figma Archive Format

### Overview
The .wtf format is a compressed archive containing all data needed to reconstruct a webpage in Figma with pixel-perfect accuracy.

### File Structure
```
webpage.wtf (ZIP archive)
├── manifest.json          # Metadata and schema version
├── screenshot.png         # Full-page screenshot for visual reference
├── schema.json           # Element tree and layout data
├── styles.json           # CSS computed styles registry
├── images/               # Original quality images
│   ├── {hash1}.png
│   ├── {hash2}.jpg
│   └── {hash3}.webp
├── fonts/                # Web fonts used on page
│   ├── inter-regular.woff2
│   └── roboto-bold.woff2
└── assets/               # Other assets
    ├── svgs/
    └── videos/
```

### Advantages Over JSON Handoff

#### 1. No Size Limits
- ZIP compression reduces file size by 60-80%
- Can handle enterprise sites with 1000+ images
- Binary image storage (not base64)

#### 2. Visual Accuracy Features
- **Reference Screenshot**: Side-by-side comparison in Figma
- **Original Quality Images**: No compression artifacts
- **Font Files**: Embed actual fonts, not approximations
- **Layout Hints**: Additional metadata for complex layouts

#### 3. Offline Workflow
- Download .wtf file from any page
- Import into Figma anytime
- Share files with team
- Version control friendly

#### 4. Advanced Features
- **Multi-viewport captures**: Mobile, tablet, desktop in one file
- **Interactive states**: Hover, focus, active states
- **Animations**: CSS animations and transitions data
- **Variants**: Component state variations

### manifest.json Schema
```json
{
  "version": "1.0.0",
  "generator": "Web To Figma Chrome Extension",
  "url": "https://example.com",
  "capturedAt": "2025-01-08T12:00:00Z",
  "viewport": {
    "width": 1440,
    "height": 900
  },
  "screenshot": {
    "file": "screenshot.png",
    "width": 1440,
    "height": 3200
  },
  "schema": {
    "file": "schema.json",
    "elementCount": 1247,
    "nodeCount": 1582
  },
  "images": {
    "count": 45,
    "totalSizeBytes": 8234567,
    "format": "original"
  },
  "fonts": [
    {
      "family": "Inter",
      "variants": ["regular", "bold"],
      "files": ["fonts/inter-regular.woff2", "fonts/inter-bold.woff2"]
    }
  ],
  "features": {
    "autoLayout": true,
    "components": true,
    "variants": true,
    "screenshots": true
  }
}
```

### schema.json Structure
Same as current WebToFigmaSchema but with optimizations:
- Image references use relative paths: `"imageRef": "images/abc123.png"`
- Font references use embedded fonts: `"fontRef": "fonts/inter-regular.woff2"`
- Screenshot overlay data for visual comparison

### Implementation Strategy

#### Phase 1: Basic .wtf Generation (Week 1)
- Chrome extension creates ZIP archive
- Include schema.json + screenshot.png
- Download .wtf file
- Figma plugin imports .wtf files

#### Phase 2: Image Optimization (Week 2)
- Extract images to /images/ folder
- Store original quality (not base64)
- Reference by hash in schema
- Smart compression options

#### Phase 3: Visual Comparison (Week 3)
- Screenshot overlay in Figma
- Side-by-side comparison view
- Pixel diff highlighting
- Accuracy score calculation

#### Phase 4: Advanced Features (Week 4)
- Multi-viewport support
- Embedded fonts
- Interactive state variants
- Animation data

### File Size Comparison

**Current JSON Handoff:**
```
schema.json with base64 images: 45 MB
Compression: None
Transfer: In-memory
Limit: ~200 MB
```

**Proposed .wtf Format:**
```
Uncompressed: 50 MB
  ├── schema.json: 2 MB
  ├── screenshot.png: 3 MB
  └── images/: 45 MB (original quality)

ZIP compressed: 12 MB (76% reduction)
Transfer: File download/upload
Limit: Unlimited
```

### Browser Extension Changes

**Capture Flow:**
```typescript
1. Extract page data → schema
2. Capture full screenshot → screenshot.png
3. Download images → images/{hash}.{ext}
4. Create ZIP archive → webpage.wtf
5. Trigger download
```

**Key APIs:**
- `JSZip` library for ZIP creation
- `chrome.downloads.download()` for file saving
- Blob/File API for binary data

### Figma Plugin Changes

**Import Flow:**
```typescript
1. User uploads .wtf file
2. Extract ZIP archive
3. Parse manifest.json
4. Load schema.json
5. Load images from /images/
6. Create Figma nodes
7. Overlay screenshot for comparison
```

**Key APIs:**
- `JSZip` for ZIP extraction
- `figma.createImage()` for image loading
- File reading APIs

### Migration Path

**Support Both Formats:**
- Keep current JSON handoff for simple pages
- Use .wtf for complex/large pages
- Auto-detect and suggest format
- User preference setting

**Detection Logic:**
```typescript
if (elementCount > 500 || imageCount > 20 || totalSizeKB > 5000) {
  suggestFormat = ".wtf file (better for complex pages)";
} else {
  suggestFormat = "Direct handoff (faster)";
}
```

### Security Considerations

1. **Sandboxing**: Validate all file contents
2. **Size limits**: Max 500 MB per .wtf file
3. **Content validation**: Verify ZIP structure
4. **XSS prevention**: Sanitize all user content
5. **CORS**: Same origin checks for images

### Future Enhancements

1. **Cloud sync**: Upload .wtf to cloud storage
2. **Collaboration**: Share .wtf files with team
3. **History**: Keep multiple captures of same page
4. **Diffing**: Compare .wtf files to see changes
5. **API**: Programmatic .wtf generation

### Visual Accuracy Improvements

With .wtf format, we can achieve >98% visual accuracy by:

1. **Screenshot Overlay** (like Figma's Inspect mode)
   - Overlay original screenshot on Figma design
   - Pixel-perfect comparison
   - Highlight differences

2. **Original Quality Images**
   - No compression artifacts
   - Full resolution preserved
   - Proper color profiles

3. **Embedded Fonts**
   - Include actual web fonts
   - No font substitution
   - Exact typography matching

4. **Layout Hints**
   - Flexbox/Grid metadata
   - Z-index relationships
   - Stacking context data

5. **Reference Data**
   - Computed dimensions
   - Actual rendered positions
   - Browser rendering hints

### Competitive Advantage

**vs html.to.design:**
- ✅ Open format (not proprietary)
- ✅ Better compression
- ✅ Screenshot comparison built-in
- ✅ Multi-viewport support
- ✅ Free and open source

**vs manual screenshots:**
- ✅ Fully editable in Figma
- ✅ Maintains structure
- ✅ Auto Layout preserved
- ✅ Text remains text
- ✅ Colors/styles extractable
