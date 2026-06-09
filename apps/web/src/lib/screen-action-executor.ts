import type { ScreenAction, ActionResult } from '@hrms/shared';

const DELAY_MS = 300;
const POST_CLICK_DELAY = 800;

function findElement(selector: string): HTMLElement | null {
  try {
    return document.querySelector<HTMLElement>(selector);
  } catch {
    return null;
  }
}

/**
 * True when the element is a legitimate target for AI screen actions — i.e. it
 * is NOT inside the sidebar nav (`aside`), the top bar (`header`), or the chat
 * widget itself. This stops the AI from clicking sidebar links (e.g. "Cold
 * Start") when it guesses a selector that happens to match one. Modals (which
 * render outside `main` in a portal) are still allowed.
 */
function isAllowedTarget(el: Element | null): boolean {
  if (!el) return false;
  return !el.closest('aside') && !el.closest('header') && !el.closest('[class*="ai-assistant"]');
}

/** Resolve a selector only if it points at an allowed (main-content/modal) element. */
function findAllowedElement(selector: string): HTMLElement | null {
  try {
    const matches = document.querySelectorAll<HTMLElement>(selector);
    for (const el of matches) {
      if (isAllowedTarget(el)) return el;
    }
  } catch {
    /* invalid selector */
  }
  return null;
}

/**
 * Fuzzy-find an input/textarea by matching the action description against
 * labels, placeholders, and names on the page. Used as fallback when the
 * AI-generated selector doesn't match (e.g., form appeared after a click).
 */
function fuzzyFindInput(description: string): HTMLInputElement | HTMLTextAreaElement | null {
  // Extract likely field name from description like "Fill in 'Adi' as the employee name"
  const keywords = description
    .toLowerCase()
    .replace(/fill\s*(in)?\s*/i, '')
    .replace(/['"]/g, '')
    .split(/\s+as\s+|\s+for\s+|\s+into\s+|\s+the\s+|\s+field\s+|\s+input\s+/i);

  const fieldHint = keywords[keywords.length - 1]?.trim() || '';

  const inputs = Array.from(
    document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
      'input:not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea',
    ),
  ).filter((el) => isAllowedTarget(el));

  for (const el of inputs) {
    if (!el.offsetParent) continue;
    const placeholder = (el.placeholder || '').toLowerCase();
    const name = (el.name || '').toLowerCase();
    const label = getAssociatedLabel(el).toLowerCase();

    if (
      fieldHint &&
      (placeholder.includes(fieldHint) ||
        name.includes(fieldHint) ||
        label.includes(fieldHint) ||
        fieldHint.includes(name) ||
        fieldHint.includes(placeholder))
    ) {
      return el;
    }
  }

  // Second pass: try matching any keyword
  for (const kw of keywords) {
    const clean = kw.trim();
    if (clean.length < 3) continue;
    for (const el of inputs) {
      if (!el.offsetParent) continue;
      const placeholder = (el.placeholder || '').toLowerCase();
      const name = (el.name || '').toLowerCase();
      const label = getAssociatedLabel(el).toLowerCase();
      if (placeholder.includes(clean) || name.includes(clean) || label.includes(clean)) {
        return el;
      }
    }
  }

  return null;
}

function getAssociatedLabel(el: HTMLElement): string {
  if (el.id) {
    const label = document.querySelector(`label[for="${el.id}"]`);
    if (label) return label.textContent?.trim() || '';
  }
  const parent = el.closest('label');
  if (parent) {
    const clone = parent.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('input, select, textarea').forEach((c) => c.remove());
    return clone.textContent?.trim() || '';
  }
  const prev = el.previousElementSibling;
  if (prev && (prev.tagName === 'LABEL' || prev.tagName === 'SPAN' || prev.tagName === 'P')) {
    return prev.textContent?.trim() || '';
  }
  // Check parent's preceding sibling or child label/span
  const parentDiv = el.parentElement;
  if (parentDiv) {
    const labelEl = parentDiv.querySelector('label, span.text-sm');
    if (labelEl && labelEl !== el) return labelEl.textContent?.trim() || '';
    const prevSib = parentDiv.previousElementSibling;
    if (prevSib) return prevSib.textContent?.trim() || '';
  }
  return el.getAttribute('aria-label') || el.getAttribute('placeholder') || '';
}

function highlightElement(el: HTMLElement, color = '#2563eb') {
  const prev = el.style.outline;
  el.style.outline = `2px solid ${color}`;
  el.style.outlineOffset = '2px';
  setTimeout(() => {
    el.style.outline = prev;
    el.style.outlineOffset = '';
  }, 800);
}

function setReactValue(el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, value: string) {
  const proto = el instanceof HTMLSelectElement
    ? HTMLSelectElement.prototype
    : el instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;

  const nativeSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  if (nativeSetter) {
    nativeSetter.call(el, value);
  } else {
    el.value = value;
  }

  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

async function executeFill(selector: string, value: string, description: string): Promise<ActionResult> {
  const resolve = (): HTMLInputElement | HTMLTextAreaElement | null => {
    const direct = findAllowedElement(selector) as HTMLInputElement | HTMLTextAreaElement | null;
    if (direct && (direct.tagName === 'INPUT' || direct.tagName === 'TEXTAREA' || direct.tagName === 'SELECT')) {
      return direct;
    }
    // Fallback: fuzzy-find by description (label/placeholder/name), scoped to allowed targets.
    return fuzzyFindInput(description);
  };

  let el = resolve();

  // The form may have just rendered after a click — re-scan once after a short wait.
  if (!el) {
    await new Promise((r) => setTimeout(r, 400));
    el = resolve();
  }

  if (!el) return { success: false, error: 'not_found', message: `Field not found: ${description}` };

  const actualSelector = el.id ? `#${el.id}` : (el.name ? `[name="${el.name}"]` : selector);
  const prevValue = el.value;
  setReactValue(el, value);
  highlightElement(el);
  el.classList.add('ai-filled');

  return { success: true, data: { prevValue, newValue: value, selector: actualSelector }, message: `Set "${value}"` };
}

async function executeClick(selector: string, description: string): Promise<ActionResult> {
  // Only accept a selector match that is in the main content / a modal — never
  // the sidebar nav, top bar, or chat widget.
  let el = findAllowedElement(selector);

  // Fallback: find a button by its text content from the description, again only
  // among allowed targets.
  if (!el) {
    const btnText = description.replace(/^click\s*(on)?\s*/i, '').replace(/['"]/g, '').replace(/\s*button\s*/i, '').trim();
    if (btnText) {
      const buttons = document.querySelectorAll<HTMLButtonElement>('button, [role="button"], input[type="submit"]');
      for (const btn of buttons) {
        if (!isAllowedTarget(btn)) continue;
        if (btn.textContent?.trim().toLowerCase().includes(btnText.toLowerCase())) {
          el = btn;
          break;
        }
      }
    }
  }

  if (!el) return { success: false, error: 'not_found', message: `Button not found: ${description}` };

  highlightElement(el);
  await new Promise((r) => setTimeout(r, 200));
  el.click();

  return { success: true, message: `Clicked "${el.textContent?.trim() || selector}"` };
}

async function executeSelectTab(selector: string): Promise<ActionResult> {
  const el = findAllowedElement(selector);
  if (!el) return { success: false, error: 'not_found', message: `Tab not found: ${selector}` };

  highlightElement(el);
  await new Promise((r) => setTimeout(r, 200));
  el.click();

  return { success: true, message: `Switched to tab "${el.textContent?.trim()}"` };
}

async function executeSelectOption(selector: string, value: string): Promise<ActionResult> {
  const el = findAllowedElement(selector) as HTMLSelectElement | null;
  if (!el) return { success: false, error: 'not_found', message: `Select not found: ${selector}` };

  const option = Array.from(el.options).find(
    (o) => o.text.toLowerCase() === value.toLowerCase() || o.value.toLowerCase() === value.toLowerCase(),
  );
  if (!option) return { success: false, error: 'option_not_found', message: `Option "${value}" not found` };

  setReactValue(el, option.value);
  highlightElement(el);
  el.classList.add('ai-filled');

  return { success: true, data: { selector, value: option.value }, message: `Selected "${option.text}"` };
}

async function executeScrollTo(selector: string): Promise<ActionResult> {
  const el = findElement(selector);
  if (!el) return { success: false, error: 'not_found', message: `Element not found: ${selector}` };

  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  highlightElement(el, '#059669');

  return { success: true, message: 'Scrolled to element' };
}

async function executeRead(selector: string): Promise<ActionResult> {
  const el = findElement(selector);
  if (!el) return { success: false, error: 'not_found', message: `Element not found: ${selector}` };

  const text = el.textContent?.trim() || '';
  return { success: true, data: { text: text.slice(0, 2000) }, message: text.slice(0, 200) };
}

export async function executeScreenActions(actions: ScreenAction[]): Promise<{
  results: ActionResult[];
  filledFields: { selector: string; prevValue: string; newValue: string }[];
}> {
  const results: ActionResult[] = [];
  const filledFields: { selector: string; prevValue: string; newValue: string }[] = [];
  let lastWasClick = false;

  for (const action of actions) {
    // After a click, wait longer for DOM to update (new forms/modals appearing)
    if (lastWasClick) {
      await new Promise((r) => setTimeout(r, POST_CLICK_DELAY));
      lastWasClick = false;
    }

    let result: ActionResult;

    switch (action.type) {
      case 'fill':
        result = await executeFill(action.selector, action.value || '', action.description);
        if (result.success && result.data) {
          filledFields.push({
            selector: result.data.selector,
            prevValue: result.data.prevValue,
            newValue: result.data.newValue,
          });
        }
        break;
      case 'click':
        result = await executeClick(action.selector, action.description);
        lastWasClick = result.success;
        break;
      case 'select_tab':
        result = await executeSelectTab(action.selector);
        lastWasClick = result.success;
        break;
      case 'select_option':
        result = await executeSelectOption(action.selector, action.value || '');
        break;
      case 'scroll_to':
        result = await executeScrollTo(action.selector);
        break;
      case 'read':
        result = await executeRead(action.selector);
        break;
      default:
        result = { success: false, error: 'unknown_type', message: `Unknown action type: ${action.type}` };
    }

    results.push(result);
    await new Promise((r) => setTimeout(r, DELAY_MS));
  }

  return { results, filledFields };
}

export function undoFills(filledFields: { selector: string; prevValue: string }[]) {
  filledFields.forEach(({ selector, prevValue }) => {
    const el = findElement(selector) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null;
    if (el) {
      setReactValue(el, prevValue);
      el.classList.remove('ai-filled');
    }
  });
}

export function clearAiFilledHighlights() {
  document.querySelectorAll('.ai-filled').forEach((el) => el.classList.remove('ai-filled'));
}
