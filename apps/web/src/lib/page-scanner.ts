import type { PageSnapshot, PageSnapshotField, PageSnapshotButton, PageSnapshotTable } from '@hrms/shared';

function isVisible(el: HTMLElement): boolean {
  if (!el.offsetParent && el.tagName !== 'BODY') return false;
  const style = getComputedStyle(el);
  return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
}

/** Returns true if the element is inside the sidebar, header, or chat widget — should be excluded from scanning */
function isExcluded(el: HTMLElement): boolean {
  return !!(
    el.closest('aside') ||
    el.closest('header') ||
    el.closest('.ai-assistant-chat') ||
    el.closest('[class*="ai-assistant"]')
  );
}

function getSelector(el: HTMLElement): string {
  if (el.id) return `#${el.id}`;
  const name = el.getAttribute('name');
  if (name) return `[name="${name}"]`;
  // Build a path
  const parts: string[] = [];
  let current: HTMLElement | null = el;
  let depth = 0;
  while (current && current !== document.body && depth < 4) {
    let selector = current.tagName.toLowerCase();
    if (current.id) {
      parts.unshift(`#${current.id}`);
      break;
    }
    const parent: HTMLElement | null = current.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter((c: Element) => c.tagName === current!.tagName);
      if (siblings.length > 1) {
        const idx = siblings.indexOf(current) + 1;
        selector += `:nth-of-type(${idx})`;
      }
    }
    parts.unshift(selector);
    current = parent;
    depth++;
  }
  return parts.join(' > ');
}

function getLabel(el: HTMLElement): string {
  // Check for associated label
  const id = el.id;
  if (id) {
    const label = document.querySelector(`label[for="${id}"]`);
    if (label) return label.textContent?.trim() || '';
  }
  // Check parent label
  const parentLabel = el.closest('label');
  if (parentLabel) {
    const clone = parentLabel.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('input, select, textarea').forEach((c) => c.remove());
    return clone.textContent?.trim() || '';
  }
  // Check preceding label sibling or aria-label
  const ariaLabel = el.getAttribute('aria-label') || el.getAttribute('placeholder');
  if (ariaLabel) return ariaLabel;
  // Check previous sibling or parent text
  const prev = el.previousElementSibling;
  if (prev && (prev.tagName === 'LABEL' || prev.tagName === 'SPAN' || prev.tagName === 'P')) {
    return prev.textContent?.trim() || '';
  }
  return el.getAttribute('name') || '';
}

function scanFields(): PageSnapshotField[] {
  const fields: PageSnapshotField[] = [];
  const inputs = document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
    'input:not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea, select',
  );

  inputs.forEach((el) => {
    if (!isVisible(el as HTMLElement)) return;
    if (isExcluded(el as HTMLElement)) return;

    const field: PageSnapshotField = {
      label: getLabel(el as HTMLElement),
      type: el.tagName === 'SELECT' ? 'select' : (el as HTMLInputElement).type || 'text',
      selector: getSelector(el as HTMLElement),
      value: el.value || '',
      placeholder: el.getAttribute('placeholder') || undefined,
    };

    if (el.tagName === 'SELECT') {
      const options = Array.from((el as HTMLSelectElement).options)
        .map((o) => o.text)
        .filter((t) => t && t !== '');
      field.options = options.slice(0, 15); // Truncate long option lists
    }

    fields.push(field);
  });

  return fields.slice(0, 30); // Cap total fields
}

function scanButtons(): PageSnapshotButton[] {
  const buttons: PageSnapshotButton[] = [];
  const els = document.querySelectorAll<HTMLButtonElement>('button, [role="button"], input[type="submit"]');

  els.forEach((el) => {
    if (!isVisible(el)) return;
    if (isExcluded(el)) return;
    const text = el.textContent?.trim() || el.getAttribute('aria-label') || '';
    if (!text || text.length > 60) return;

    buttons.push({
      text,
      selector: getSelector(el),
      type: el.type || 'button',
      destructive: /delete|remove|reject|destroy/i.test(text) ||
        el.className.includes('red') || el.className.includes('destructive'),
    });
  });

  return buttons.slice(0, 20);
}

function scanTabs(): { label: string; selector: string; active: boolean }[] {
  const tabs: { label: string; selector: string; active: boolean }[] = [];
  // HRMS tab pattern: buttons inside a border-b div
  const tabContainer = document.querySelector('.border-b.border-border');
  if (!tabContainer) return tabs;

  tabContainer.querySelectorAll('button').forEach((btn) => {
    const text = btn.textContent?.trim() || '';
    if (!text) return;
    const active = btn.className.includes('border-primary') || btn.className.includes('text-primary');
    tabs.push({ label: text, selector: getSelector(btn), active });
  });

  return tabs;
}

function scanTables(): PageSnapshotTable[] {
  const tables: PageSnapshotTable[] = [];
  document.querySelectorAll('table').forEach((table) => {
    if (!isVisible(table)) return;
    if (isExcluded(table)) return;
    const headers = Array.from(table.querySelectorAll('thead th, thead td'))
      .map((th) => th.textContent?.trim() || '')
      .filter(Boolean);
    const rowCount = table.querySelectorAll('tbody tr').length;
    if (headers.length === 0) return;

    tables.push({
      selector: getSelector(table),
      columns: headers.slice(0, 10),
      rowCount,
    });
  });

  return tables.slice(0, 5);
}

function scanStats(): { label: string; value: string }[] {
  const stats: { label: string; value: string }[] = [];
  // Stat cards pattern: look for small text (label) + large text (value) in card-like divs
  document.querySelectorAll('.bg-card, [class*="stat"], [class*="metric"]').forEach((card) => {
    if (!isVisible(card as HTMLElement)) return;
    const texts = Array.from(card.querySelectorAll('p, span, h3, h4, div'))
      .map((el) => el.textContent?.trim() || '')
      .filter((t) => t.length > 0 && t.length < 50);
    if (texts.length >= 2) {
      // Heuristic: shorter text is label, number-like text is value
      const valueIdx = texts.findIndex((t) => /^\d/.test(t) || /^\$/.test(t));
      if (valueIdx >= 0) {
        const labelIdx = valueIdx === 0 ? 1 : 0;
        stats.push({ label: texts[labelIdx], value: texts[valueIdx] });
      }
    }
  });

  return stats.slice(0, 10);
}

function scanModal(): { title: string; open: boolean } | null {
  const backdrop = document.querySelector('[class*="fixed"][class*="inset-0"][class*="bg-black"], [class*="fixed"][class*="inset-0"][class*="backdrop"]');
  if (!backdrop) return null;
  const modal = document.querySelector('[class*="fixed"][class*="z-50"]:not(.ai-assistant-chat)');
  if (!modal) return null;
  const title = modal.querySelector('h2, h3, [class*="title"]')?.textContent?.trim() || 'Dialog';
  return { title, open: true };
}

export function scanPage(): PageSnapshot {
  return {
    fields: scanFields(),
    buttons: scanButtons(),
    tabs: scanTabs(),
    tables: scanTables(),
    stats: scanStats(),
    modal: scanModal(),
  };
}

export function snapshotToPromptText(snapshot: PageSnapshot): string {
  const parts: string[] = [];

  if (snapshot.tabs.length > 0) {
    const tabList = snapshot.tabs.map((t) => `${t.label}${t.active ? ' (active)' : ''}`).join(', ');
    parts.push(`Tabs: ${tabList}`);
  }

  if (snapshot.fields.length > 0) {
    parts.push('Form fields:');
    snapshot.fields.forEach((f) => {
      let desc = `- "${f.label || f.placeholder || 'unnamed'}" (${f.type}, selector: ${f.selector}`;
      if (f.value) desc += `, value: "${f.value}"`;
      if (f.options) desc += `, options: [${f.options.slice(0, 8).join(', ')}${f.options.length > 8 ? '...' : ''}]`;
      desc += ')';
      parts.push(desc);
    });
  }

  if (snapshot.buttons.length > 0) {
    parts.push('Buttons:');
    snapshot.buttons.forEach((b) => {
      parts.push(`- "${b.text}" (${b.type}${b.destructive ? ', destructive' : ''}, selector: ${b.selector})`);
    });
  }

  if (snapshot.tables.length > 0) {
    parts.push('Tables:');
    snapshot.tables.forEach((t) => {
      parts.push(`- ${t.rowCount} rows, columns: [${t.columns.join(', ')}] (selector: ${t.selector})`);
    });
  }

  if (snapshot.stats.length > 0) {
    parts.push('Stats:');
    snapshot.stats.forEach((s) => parts.push(`- ${s.label}: ${s.value}`));
  }

  if (snapshot.modal) {
    parts.push(`Open modal: "${snapshot.modal.title}"`);
  }

  return parts.join('\n');
}
