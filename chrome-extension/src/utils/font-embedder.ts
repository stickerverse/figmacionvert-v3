import { FontDefinition } from "../types/schema";

export class FontEmbedder {
  private embeddedFonts = new Map<string, string>();
  private processedUrls = new Set<string>();

  /**
   * Embeds fonts used in the page by fetching and converting them to base64
   */
  public async embedFonts(fonts: FontDefinition[]): Promise<FontDefinition[]> {
    console.log(`🔤 Starting font embedding for ${fonts.length} fonts...`);

    const embeddedDefinitions: FontDefinition[] = [];

    for (const font of fonts) {
      if (!font.url || this.processedUrls.has(font.url)) {
        embeddedDefinitions.push(font);
        continue;
      }

      try {
        // Only embed custom or google fonts, skip system fonts
        if (font.source === "system") {
          embeddedDefinitions.push(font);
          continue;
        }

        const base64 = await this.fetchFontAsBase64(font.url);
        if (base64) {
          this.embeddedFonts.set(font.url, base64);
          this.processedUrls.add(font.url);

          // Add data URI to the definition
          embeddedDefinitions.push({
            ...font,
            url: `data:font/woff2;base64,${base64}`, // Assuming woff2/woff, browser handles detection
          });
          console.log(`✅ Embedded font: ${font.family}`);
        } else {
          embeddedDefinitions.push(font);
        }
      } catch (error) {
        console.warn(`⚠️ Failed to embed font ${font.family}:`, error);
        embeddedDefinitions.push(font);
      }
    }

    return embeddedDefinitions;
  }

  private async fetchFontAsBase64(url: string): Promise<string | null> {
    try {
      const response = await fetch(url);
      if (!response.ok)
        throw new Error(`Failed to fetch font: ${response.statusText}`);

      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          // Remove data URL prefix (e.g. "data:font/woff2;base64,")
          const base64 = result.split(",")[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.warn(`Failed to fetch font from ${url}:`, error);
      return null;
    }
  }
}
