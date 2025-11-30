export interface TestPage {
  id: string;
  name: string;
  url: string;
  description: string;
  viewport: {
    width: number;
    height: number;
    deviceScaleFactor: number;
  };
  elementsToValidate: string[]; // CSS selectors for key elements to validate
}

export const GOLDEN_TEST_PAGES: TestPage[] = [
  {
    id: 'sticker-shuttle',
    name: 'Sticker Shuttle Landing Page',
    url: 'https://www.stickershock.com/',
    description: 'Simple landing page with hero section and product grid',
    viewport: {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
    },
    elementsToValidate: [
      '.hero',
      '.product-grid',
      'header',
      'footer'
    ]
  },
  {
    id: 'marketing-page',
    name: 'Marketing Page Example',
    url: 'https://tailwindui.com/templates/maison-free',
    description: 'Marketing page with hero and card sections',
    viewport: {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
    },
    elementsToValidate: [
      'header',
      'section.hero',
      'section.features',
      'section.testimonials',
      'footer'
    ]
  },
  {
    id: 'complex-layout',
    name: 'Complex Layout Example',
    url: 'https://www.apple.com/macbook-pro/',
    description: 'Complex page with grids, modals, and overlays',
    viewport: {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
    },
    elementsToValidate: [
      '.section-hero',
      '.grid-container',
      '.modal',
      '.overlay',
      'nav'
    ]
  }
];

// Define what "pixel-perfect enough" means
export const VALIDATION_THRESHOLDS = {
  // Maximum allowed position difference in pixels for key elements
  positionTolerance: 2,
  
  // Maximum allowed size difference in pixels
  sizeTolerance: 2,
  
  // Minimum visual similarity score (0-1)
  minSimilarity: 0.98,
  
  // Elements that must be present in the output
  requiredElements: [
    'img',
    'h1, h2, h3',
    '.hero',
    'header',
    'footer'
  ]
};

// Helper function to take a screenshot of the current page
export async function takeScreenshot(
  page: any, // Puppeteer/Playwright page object
  options: {
    fullPage?: boolean;
    clip?: { x: number; y: number; width: number; height: number };
  } = { fullPage: true }
): Promise<Buffer> {
  return page.screenshot({
    type: 'png',
    fullPage: options.fullPage,
    clip: options.clip,
    omitBackground: true
  });
}

// Helper to compare two images and calculate similarity
export async function compareImages(
  image1: Buffer,
  image2: Buffer
): Promise<{ similarity: number; diffImage: Buffer }> {
  // This is a placeholder - in a real implementation, you'd use a library like pixelmatch
  // or SSIM to compare the images and calculate a similarity score
  
  // For now, we'll return a mock implementation
  return {
    similarity: 1.0, // 0-1 scale where 1 is identical
    diffImage: Buffer.from([]) // Would contain a visual diff
  };
}
