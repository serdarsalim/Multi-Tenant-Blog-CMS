// src/lib/contentProcessor.ts

/**
 * Process HTML content with theme-specific adjustments
 */
export function processContent(content: string, isDarkMode: boolean = false): string {
    if (!content) return '';
    
    let processedContent = content;
    
    // Check if content is likely a CSV
    const isCsvContent = (
      (content.match(/,/g) || []).length > 20 &&
      (content.match(/<div class="ql-code-block"/g) || []).length > 15 &&
      content.includes(",") &&
      !content.includes("<h1") &&
      !content.includes("<h2") &&
      !content.includes("<h3")
    );
  
    if (isCsvContent) {
      return `<div class="csv-content" style="overflow-x:auto;max-width:100%;">${content}</div>`;
    }
    
    // Handle paragraph breaks
    processedContent = processedContent.replace(
      /(?<!<p[^>]*>)(<br\s*\/?>\s*){2,}(?![^<]*<\/p>)/g,
      '<div class="double-break"></div>'
    );
  
    // Process image tags
    processedContent = processedContent.replace(/<img[^>]*>/gi, (match) => {
      // Extract src and other attributes
      const srcMatch = match.match(/src=["']([^"']*)["']/i);
      const src = srcMatch ? srcMatch[1] : "";
      const classMatch = match.match(/class=["']([^"']*)["']/i);
      const classAttr = classMatch ? ` class="${classMatch[1]}"` : "";
      const altMatch = match.match(/alt=["']([^"']*)["']/i);
      const alt = altMatch ? ` alt="${altMatch[1]}"` : "";
  
      // Preserve other attributes but override style
      let otherAttrs = match
        .replace(/src=["'][^"']*["']/i, "")
        .replace(/style=["'][^"']*["']/i, "")
        .replace(/class=["'][^"']*["']/i, "")
        .replace(/alt=["'][^"']*["']/i, "")
        .replace(/<img\s/i, "")
        .replace(/>$/, "");
  
      // Create new image tag with responsive styling
      return `<img src="${src}"${classAttr}${alt} style="max-width:100%;height:auto;object-fit:contain;" loading="lazy" ${otherAttrs}>`;
    });
  
    // Process code blocks
    processedContent = processedContent.replace(
      /<div class="ql-code-block"[^>]*>([\s\S]*?)<\/div>/gi,
      '<div style="font-family:monospace;font-size:0.875rem;line-height:1.5;color:#e5e7eb;white-space:pre-wrap;display:block;padding:0;margin:0;">$1</div>'
    );
  
    processedContent = processedContent.replace(
      /<div class="ql-code-block-container"[^>]*>([\s\S]*?)<\/div>/gi,
      `<div style="background-color:${isDarkMode ? '#0f172a' : '#1e293b'};border-radius:0.5rem;margin:1.5rem 0;padding:1rem;overflow-x:auto;display:block;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1),0 2px 4px -1px rgba(0,0,0,0.06);">$1</div>`
    );
  
    // Update YouTube embeds
    processedContent = processedContent.replace(
      /<iframe(.*?)src="https:\/\/www\.youtube\.com\/embed\/(.*?)"(.*?)><\/iframe>/g,
      '<div class="video-container" style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;max-width:100%"><iframe$1src="https://www.youtube.com/embed/$2?enablejsapi=1&playsinline=1&rel=0"$3 style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>'
    );
  
    // Backup YouTube regex for different formats
    processedContent = processedContent.replace(
      /<iframe(?:.*?)src="(?:(?:https?:)?\/\/)?(?:www\.)?youtube\.com\/embed\/([^"]+)"(?:.*?)><\/iframe>/gi,
      '<div class="video-container" style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;max-width:100%"><iframe src="https://www.youtube.com/embed/$1?enablejsapi=1&playsinline=1&rel=0" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>'
    );
  
    // Fix aspect ratio for images by adding specific styles
    processedContent = processedContent.replace(
      /<img(.*?)style="([^"]*?)(width|height):[^"]*?(width|height):[^"]*?"(.*?)>/gi,
      '<img$1style="max-width:100%;height:auto;object-fit:contain;"$5 loading="lazy">'
    );
  
    // Handle images with style but no width/height
    processedContent = processedContent.replace(
      /<img(.*?)style="(?!.*?(width|height))[^"]*?"(.*?)>/gi,
      '<img$1style="max-width:100%;height:auto;object-fit:contain;"$3 loading="lazy">'
    );
  
    // Handle images with no style
    processedContent = processedContent.replace(
      /<img(?![^>]*?style=)(.*?)>/gi,
      '<img style="max-width:100%;height:auto;object-fit:contain;"$1 loading="lazy">'
    );
  
    // Process font sizes
    processedContent = processedContent.replace(
      /style="([^"]*)font-size:\s*(\d+)px([^"]*)"/g,
      (match, before, size, after) => {
        let scaledValue = parseInt(size, 10);
        scaledValue = Math.round(scaledValue * 1.7);
        return `style="${before}font-size: ${scaledValue}px${after}"`;
      }
      
      
    );
  // Convert empty headings to paragraphs with no spacing
processedContent = processedContent.replace(
  /<h([1-6])(?:\s[^>]*)?>([\s\n]*|&nbsp;|<br\s*\/?>)*<\/h\1>/g,
  (match, level, innerContent) => {
    // Use empty div with minimal styling instead of paragraph
    return `<div class="empty-heading-converted" style="margin:0;padding:0;height:0;min-height:0;overflow:hidden"></div>`;
  }
);
    
    // Add IDs to headings for TOC (your existing code)
    processedContent = processedContent.replace(
      /<h([2-3])(?:\s[^>]*)?>(.*?)<\/h\1>/g,
      (match, level, content) => {
        const plainText = content.replace(/<[^>]*>/g, "");
        const id = plainText.toLowerCase().replace(/[^\w]+/g, "-");
        return `<h${level} id="${id}">${content}</h${level}>`;
      }
    );


    // FONT TAG COLOR TRANSFORMATION - Only if in dark mode
    if (isDarkMode) {
      processedContent = processedContent.replace(
        /<font\s+color="(#[0-9a-f]{3,6})"([^>]*)>/gi,
        (match, color, rest) => {
          try {
            // Parse the hex color
            const hexValue = color.toLowerCase();
            const r = parseInt(hexValue.slice(1, 3) || hexValue.slice(1, 2).repeat(2), 16);
            const g = parseInt(hexValue.slice(3, 5) || hexValue.slice(2, 3).repeat(2), 16);
            const b = parseInt(hexValue.slice(5, 7) || hexValue.slice(3, 4).repeat(2), 16);
  
            // Special case for black or very dark colors
            if (
              (r < 30 && g < 30 && b < 30) ||
              hexValue === "#000000" ||
              hexValue === "#000"
            ) {
              // Use light gray instead of trying to brighten black
              return `<font color="#CCCCCC"${rest}>`;
            }
  
            // Color transformation logic
            let brightR, brightG, brightB;
            const isReddish = r > 180 && g < 100;
            const isYellowish = r > 180 && g > 180;
  
            if (isReddish) {
              // Less intense adjustment for red
              brightR = Math.min(255, Math.round(r * 1.2));
              brightG = Math.min(255, Math.round(g * 1.8));
              brightB = Math.min(255, Math.round(b * 2.2));
            } else if (isYellowish) {
              // Modest adjustment for yellow to prevent washing out
              brightR = Math.min(255, Math.round(r * 1.1));
              brightG = Math.min(255, Math.round(g * 1.1));
              brightB = Math.min(255, Math.round(b * 2.5));
            } else {
              // Default adjustment for other colors
              brightR = Math.min(255, Math.round(r * 2.2));
              brightG = Math.min(255, Math.round(g * 2.2));
              brightB = Math.min(255, Math.round(b * 2.5));
            }
  
            // Create new hex color
            const newColor = `#${brightR.toString(16).padStart(2, "0")}${brightG
              .toString(16)
              .padStart(2, "0")}${brightB.toString(16).padStart(2, "0")}`;
  
            return `<font color="${newColor}"${rest}>`;
          } catch (error) {
            // If color parsing fails, return the original
            return match;
          }
        }
      );
    }
  
    
    
    // Add IDs to headings for TOC
    processedContent = processedContent.replace(
      /<h([2-3])(?:\s[^>]*)?>(.*?)<\/h\1>/g,
      (match, level, content) => {
        const plainText = content.replace(/<[^>]*>/g, "");
        const id = plainText.toLowerCase().replace(/[^\w]+/g, "-");
        return `<h${level} id="${id}">${content}</h${level}>`;
      }
    );
  
    // Add punctuation to consecutive numbered sections, preserving their existing anchor IDs.
    // Requiring a sequence starting at 1 leaves numeric headings such as years alone.
    const numberedHeading = /(<h[23]\b[^>]*>(?:\s*<(?:span|strong|b|em|i)\b[^>]*>)*\s*)(\d{1,2})(?:\s|&nbsp;)+(?=[^\s<\d])/gi;
    const numberedSections = [...processedContent.matchAll(numberedHeading)];
    if (numberedSections.length > 1 && numberedSections.every((heading, index) => Number(heading[2]) === index + 1)) {
      processedContent = processedContent.replace(numberedHeading, "$1$2. ");
    }

    return processedContent;
  }

  
  
  /**
   * Extract table of contents from HTML content
   */
  export function extractTableOfContents(content: string) {
    if (!content) return [];
    
    const headings = [];
    const regex = /<h([2-3])[^>]*>(.*?)<\/h\1>/g;
    let match;
    
    while ((match = regex.exec(content)) !== null) {
      const level = match[1];
      const text = match[2].replace(/<[^>]*>/g, "");
      const id = text.toLowerCase().replace(/[^\w]+/g, "-");
      headings.push({ id, text, level });
    }
    
    return headings;
  }
  
  /**
   * Calculate reading time based on word count
   */
  export function calculateReadingTime(content: string): number {
    if (!content) return 1;
    
    // Strip HTML tags and count words
    const plainText = content.replace(/<[^>]*>/g, ' ');
    const wordCount = plainText.split(/\s+/).filter(Boolean).length;
    
    // Average reading speed: 200 words per minute
    return Math.max(1, Math.ceil(wordCount / 200));
  }
