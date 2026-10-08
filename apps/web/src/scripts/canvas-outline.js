// Preview-only DOM identity, disclosure state and bounded outline snapshots.
// None of these values are source design/content changes.
export function createCanvasOutline({ safeElement, describe, keyFor }) {
  const identities = new WeakMap();
  const elements = new Map();
  const opened = new Set();
  const displaced = new Set();
  let nextIdentity = 0;
  let limit = 400;
  const maximum = 5000;

  function selectorFor(element) {
    if (element === document.body) return 'body';
    let identity = identities.get(element);
    if (!identity) { identity = `n${++nextIdentity}`; identities.set(element, identity); }
    elements.set(identity, new WeakRef(element));
    element.setAttribute('data-three-acts-node', identity);
    return `[data-three-acts-node="${identity}"]`;
  }
  function resolveSelector(selector) {
    const match = /^\[data-three-acts-node="(n\d+)"\]$/.exec(selector);
    if (!match) return undefined;
    const element = elements.get(match[1])?.deref();
    return element?.isConnected ? element : null;
  }
  function pathFor(element) {
    const path = [];
    for (let current = element; current && current !== document.body; current = current.parentElement) path.unshift(current);
    return path;
  }
  function inDisclosureContent(element, details) {
    const summary = Array.from(details.children).find(child => child.tagName === 'SUMMARY');
    return element !== details && !(summary && (element === summary || summary.contains(element)));
  }
  function cssHiddenReason(element) {
    for (let current = element; current; current = current.parentElement) {
      const style = getComputedStyle(current);
      if (current.dataset.layoutHidden === 'true') return 'Hidden in the page composition';
      if (current.hidden || style.display === 'none') return 'Hidden at this width or by display';
      if (style.visibility === 'hidden' || style.visibility === 'collapse') return 'Hidden by visibility';
      if (style.opacity === '0') return 'Hidden by opacity';
      if (style.getPropertyValue('clip') === 'rect(0px, 0px, 0px, 0px)' || style.clipPath === 'inset(50%)') return 'Visually hidden';
    }
    return null;
  }
  function visibilityFor(element) {
    const cssReason = cssHiddenReason(element);
    if (cssReason) return { state: 'hidden', reason: cssReason };
    for (const ancestor of pathFor(element)) {
      if (ancestor.tagName === 'DETAILS' && !ancestor.open && inDisclosureContent(element, ancestor)) return { state: 'hidden', reason: 'Inside a closed disclosure' };
    }
    if (!element.getClientRects().length && getComputedStyle(element).display !== 'contents') return { state: 'hidden', reason: 'No visible box' };
    for (const ancestor of opened) if (ancestor.isConnected && ancestor.contains(element) && inDisclosureContent(element, ancestor)) return { state: 'revealed', reason: 'Temporarily revealed for editing' };
    return { state: 'visible' };
  }
  function restore() {
    for (const details of opened) if (details.isConnected) details.open = false;
    opened.clear();
    for (const details of displaced) if (details.isConnected) details.open = true;
    displaced.clear();
  }
  function reveal(element) {
    restore();
    if (cssHiddenReason(element)) return;
    for (const ancestor of pathFor(element)) {
      if (ancestor.tagName === 'DETAILS' && !ancestor.open && inDisclosureContent(element, ancestor)) {
        // Native named accordions close their open peer when another member
        // opens. Preserve that peer as well as the disclosure we reveal.
        const name = ancestor.getAttribute('name');
        if (name) for (const peer of document.querySelectorAll('details[name]')) {
          if (peer !== ancestor && peer.getAttribute('name') === name && peer.open && !opened.has(peer)) displaced.add(peer);
        }
        opened.add(ancestor);
        ancestor.open = true;
      }
    }
  }
  function nodeFor(element, parentSelector, depth) {
    const info = describe(element);
    const label = info.cmsSource ? `${info.cmsSource.label} · ${info.label}` : info.label || element.tagName.toLowerCase();
    return { ...(info.section ? {section:info.section} : {}), selector: selectorFor(element), parentSelector, depth, tag: element.tagName.toLowerCase(), label, category: info.category || 'element', visibility: visibilityFor(element), ...(info.binding ? { binding: info.binding } : {}) };
  }
  function snapshot(selected) {
    for (const [identity, reference] of elements) if (!reference.deref()?.isConnected) elements.delete(identity);
    const all = [{ selector: 'body', parentSelector: null, tag: 'body', label: 'Body', category: 'element', depth: 0, visibility: { state: 'visible' } }];
    let scanned = 0;
    let capped = false;
    const visit = (element, parentSelector = 'body', depth = 1) => {
      if (capped || !safeElement(element)) return;
      if (++scanned > 20000 || all.length > maximum || depth > 95) { capped = true; return; }
      const text = (element.textContent || '').replace(/\s+/g, ' ').trim();
      const marker = element.matches('[data-static-field],[data-cms-bound],[data-editor-label],[data-editor-component],[data-static-component],[data-component]');
      const semantic = /^(MAIN|HEADER|FOOTER|NAV|ASIDE|SECTION|ARTICLE|FORM|BUTTON|A|IMG|VIDEO|FIGURE|UL|OL|TABLE|H[1-6]|P|LI|DETAILS|SUMMARY)$/.test(element.tagName);
      const tag = element.tagName.toLowerCase();
      const layout = tag === 'div' && (/(^|\s)(container|flex|grid)(\s|$)|(^|\s)max-w[^\s]*/i.test(element.className?.toString() || '') || ['flex', 'grid'].includes(getComputedStyle(element).display));
      const inlinePresentation = tag === 'span' && !marker && !keyFor(element) && element.parentElement && element.parentElement.textContent.trim() === element.textContent.trim();
      const keep = !inlinePresentation && (text || marker || semantic || layout);
      let nextParent = parentSelector;
      if (keep) { const node = nodeFor(element, parentSelector, depth); all.push(node); nextParent = node.selector; }
      for (const child of element.children) visit(child, nextParent, keep ? depth + 1 : depth);
    };
    for (const child of document.body.children) visit(child);
    const nodes = all.slice(0, limit);
    const included = new Map(nodes.map(node => [node.selector, node]));
    // A direct canvas selection can live beyond the current outline page.
    // Pin its ancestry rather than increasing the default page or changing identity.
    function pin(elementToPin) {
      if (!elementToPin?.isConnected || !safeElement(elementToPin)) return;
      let parent = nodes[0];
      for (const element of pathFor(elementToPin).slice(-95)) {
        const selector = selectorFor(element);
        const existing = included.get(selector);
        if (existing) parent = existing;
        else {
          if (nodes.length >= maximum + 100) { capped = true; break; }
          const node = nodeFor(element, parent.selector, parent.depth + 1);
          nodes.push(node); included.set(selector, node); parent = node;
        }
      }
    }
    pin(selected);
    // Approved root sections remain manageable when their descendants exceed
    // the current outline page. Keep the existing bounded snapshot contract.
    for (const section of Array.from(document.querySelectorAll('[data-layout-section]')).filter(element => describe(element).section).slice(0, 60)) pin(section);
    const collected = new Set(all.map(node => node.selector));
    const total = all.length + nodes.filter(node => !collected.has(node.selector)).length;
    return { nodes, treeStatus: { limit, maximum, loaded: nodes.length, total, capped, hasMore: capped || all.some(node => !included.has(node.selector)) } };
  }
  function loadMore(value) {
    if (!Number.isInteger(value) || value <= limit || value > maximum) return false;
    limit = value;
    return true;
  }
  return { selectorFor, resolveSelector, visibilityFor, restore, reveal, snapshot, loadMore };
}
