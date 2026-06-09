/**
 * Captures a screenshot of the main content area (excluding sidebar and chat widget)
 * and returns it as a base64 JPEG string, sized for GPT-4o vision.
 */
export async function captureScreenshot(): Promise<string | null> {
  try {
    const html2canvas = (await import('html2canvas')).default;

    // Target the main content area, skip the sidebar
    const mainEl = document.querySelector('main') || document.querySelector('.flex-1.ml-64') || document.body;

    const canvas = await html2canvas(mainEl as HTMLElement, {
      scale: 1, // 1x resolution is enough for GPT-4o vision
      useCORS: true,
      logging: false,
      backgroundColor: '#f5f5f0',
      // Exclude chat widget and floating elements
      ignoreElements: (el) => {
        const cls = el.className?.toString() || '';
        return (
          cls.includes('ai-assistant') ||
          cls.includes('chat-bubble') ||
          el.tagName === 'ASIDE' ||
          (el.classList?.contains('fixed') && el.classList?.contains('z-50'))
        );
      },
    });

    // Convert to JPEG at 70% quality to keep size manageable (~50-150KB)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.7);

    // Strip the data URL prefix to get raw base64
    return dataUrl.split(',')[1] || null;
  } catch (err) {
    console.warn('[AI Chat] Screenshot capture failed:', err);
    return null;
  }
}
