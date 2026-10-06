/* Enabled explicitly by the web app, and activated only by the configured editor origin. */
(() => {
  const config = document.getElementById('three-acts-editor-config');
  if (!config || window.parent === window) return;
  const { origin, documents } = JSON.parse(config.textContent);
  const brand = documents.find(doc => doc.id === 'shared')?.content.site ?? {};
  const resolve = value => typeof value === 'string' ? value.replace(/\{\{site\.(name|email)\}\}/g, (match,key) => brand[key] ?? match) : value;
  const definitions = new Map(documents.map(doc => [doc.id, doc]));
  const bindings = new Map();
  const normalize = value => value.replace(/\s+/g, ' ').trim();
  let active = false;
  function fields(value, path = []) {
    if (value && typeof value === 'object') return Object.entries(value).flatMap(([key, child]) => fields(child, [...path, key]));
    return [{ path: path.join('.'), value }];
  }
  const route = window.location.pathname.replace(/\/$/, '') || '/';
  function routeMatches(template, pathname) {
    if (typeof template !== 'string') return false;
    const templateParts = template.split('/').filter(Boolean);
    const pathParts = pathname.split('/').filter(Boolean);
    return templateParts.length === pathParts.length && templateParts.every((part, index) => {
      const pathPart = pathParts[index];
      return /^\[[^/]+\]$/.test(part) ? Boolean(pathPart) : part === pathPart;
    });
  }
  const relevant = [...documents.filter(doc => doc.id !== 'shared' && routeMatches(doc.route, route)), ...documents.filter(doc => doc.id === 'shared')];
  function add(id, path, element, node, attribute) {
    const key = `${id}.${path}`;
    const list = bindings.get(key) || [];
    if (!list.some(binding => binding.node === node && binding.attribute === attribute)) list.push({element, node, attribute});
    bindings.set(key, list);
  }
  document.querySelectorAll('[data-static-field]').forEach(element => {
    if (element.closest('[data-cms-bound]')) return;
    const [id, ...path] = element.dataset.staticField.split('.');
    add(id, path.join('.'), element, element, element.dataset.staticAttribute || (element.dataset.staticFormat === 'prose' ? 'prose' : null));
  });
  // Bind structured titles, body paragraphs, array items and navigation labels
  // without changing the layout component's public prop contracts.
  const lookup = new Map();
  for (const doc of relevant) for (const field of fields(doc.content)) {
    if (typeof field.value !== 'string' || !field.value.trim()) continue;
    const text = normalize(resolve(field.value));
    if (!lookup.has(text)) lookup.set(text, {id: doc.id, path: field.path});
    else lookup.set(text, null);
  }
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    const element = node.parentElement;
    if (!element || element.closest('script,style,[data-static-field],[data-cms-bound]')) continue;
    const match = lookup.get(normalize(node.textContent));
    if (match) add(match.id, match.path, element, node, null);
  }
  // Prose splits body fields into paragraphs and lists. Bind the container so
  // the whole plain-text field stays selectable and edits retain paragraph order.
  for (const doc of relevant) for (const field of fields(doc.content)) {
    if (typeof field.value !== 'string' || !field.value.includes('\n')) continue;
    const firstParagraph = normalize(resolve(field.value).split('\n\n')[0]);
    for (const element of document.querySelectorAll('p')) {
      if (!element.closest('[data-cms-bound]') && normalize(element.textContent) === firstParagraph && element.parentElement?.children.length > 1) {
        add(doc.id, field.path, element.parentElement, element.parentElement, 'prose');
      }
    }
  }
  for (const element of document.querySelectorAll('a[href],img[src]')) {
    const attribute = element.tagName === 'A' ? 'href' : 'src';
    if (element.dataset.staticField || element.closest('[data-cms-bound]')) continue;
    const value = element.getAttribute(attribute);
    const matches = relevant.flatMap(doc => fields(doc.content).map(field => ({id: doc.id, ...field}))).filter(field => field.value === value && /^(href|src)(_|$)/.test(field.path.split('.').at(-1)));
    const match = matches.length === 1 ? matches[0] : null;
    if (match) add(match.id, match.path, element, element, attribute);
  }
  function send(data) { window.parent.postMessage(data, origin); }
  function humanize(value) {
    return String(value || '').replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[._-]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/\b\w/g, char => char.toUpperCase());
  }
  function visibleText(element) {
    return Boolean(element && normalize(element.textContent || '') && element.getClientRects().length);
  }
  function selectorFor(element) {
    if (element.id && document.querySelectorAll(`#${CSS.escape(element.id)}`).length === 1) return `#${CSS.escape(element.id)}`;
    const parts = [];
    for (let current = element; current && current !== document.body; current = current.parentElement) {
      let part = current.tagName.toLowerCase();
      if (current.id && document.querySelectorAll(`#${CSS.escape(current.id)}`).length === 1) {
        parts.unshift(`#${CSS.escape(current.id)}`);
        break;
      }
      const parent = current.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter(sibling => sibling.tagName === current.tagName);
        if (siblings.length > 1) part += `:nth-of-type(${siblings.indexOf(current) + 1})`;
      }
      parts.unshift(part);
    }
    return parts.join(' > ');
  }
  function textElementFor(target) {
    const eligible = element => visibleText(element)
      && (/^(P|H[1-6]|LI|SPAN|STRONG|EM|LABEL|BLOCKQUOTE|DT|DD|FIGCAPTION)$/.test(element.tagName)
        || (element.tagName === 'DIV' && !Array.from(element.children).some(child => visibleText(child))))
      && !element.closest('script,style,svg,button,input,textarea,select,option,nav,[aria-hidden="true"]');
    for (let current = target?.nodeType === Node.TEXT_NODE ? target.parentElement : target; current && current !== document.body; current = current.parentElement) {
      if (eligible(current)) return current;
    }
    return null;
  }
  function candidateFor(target) {
    const start = target?.nodeType === Node.TEXT_NODE ? target.parentElement : target;
    if (!(start instanceof Element)) return null;

    // A CMS marker always wins over static text matching, including when the
    // marker wraps a component or a statically annotated child.
    const cms = start.closest('[data-cms-bound]');
    if (cms) {
      const raw = cms.dataset.cmsBound || '';
      const separator = raw.indexOf('.');
      const collectionId = separator < 0 ? raw : raw.slice(0, separator);
      const field = separator < 0 ? '' : raw.slice(separator + 1);
      const label = field ? humanize(field.split('.').at(-1)) : humanize(collectionId);
      return { category: 'cms', element: cms, binding: {
        ...(cms.dataset.cmsItemId || cms.dataset.recordId ? { id: cms.dataset.cmsItemId || cms.dataset.recordId } : {}),
        path: field,
        collectionId,
        field: field || undefined,
      }, label: `${humanize(collectionId)} · ${label}`, details: {
        tag: cms.tagName.toLowerCase(),
        text: normalize(cms.textContent || '').slice(0, 4000),
      } };
    }

    const key = keyFor(start);
    if (key) {
      const binding = bindingFor(start, key);
      const source = binding?.element || start;
      const component = start.closest('[data-editor-component],[data-static-component],[data-component]') || source.closest('[data-editor-component],[data-static-component],[data-component]');
      const textBlock = /^(SPAN|STRONG|EM)$/.test(source.tagName) && !source.closest('a,button')
        ? source.closest('p,h1,h2,h3,h4,h5,h6,li,blockquote,figcaption')
        : null;
      const highlight = component || textBlock || source;
      const category = component || key ? 'component' : 'element';
      const [id, ...path] = key.split('.');
      const label = component
        ? (component.dataset.editorComponentLabel || component.dataset.staticComponent || component.dataset.component || 'Component')
        : (source.dataset.editorLabel || highlight.tagName.toLowerCase().replace(/^h([1-6])$/, 'Heading $1').replace(/^p$/, 'Paragraph'));
      return { category, element: highlight, bindingElement: source, binding: { id, path: path.join('.') }, label: humanize(label) };
    }

    const element = textElementFor(start);
    if (!element) return null;
    const component = element.closest('[data-editor-component],[data-static-component],[data-component]');
    return {
      category: component ? 'component' : 'element',
      element: component || element,
      label: component
        ? humanize(component.dataset.editorComponentLabel || component.dataset.staticComponent || component.dataset.component || 'Component')
        : humanize(element.dataset.editorLabel || element.tagName.toLowerCase().replace(/^h([1-6])$/, 'Heading $1').replace(/^p$/, 'Paragraph')),
      selector: selectorFor(element),
      details: { tag: element.tagName.toLowerCase(), text: normalize(element.textContent || '').slice(0, 180) },
    };
  }
  let overlay;
  let hoverCandidate = null;
  let selectedCandidate = null;
  function drawOverlay(candidate) {
    if (!overlay) return;
    if (!candidate?.element?.isConnected) { overlay.hidden = true; return; }
    const rect = candidate.element.getBoundingClientRect();
    if (!rect.width || !rect.height) { overlay.hidden = true; return; }
    const color = candidate.category === 'cms' ? '#9333ea' : candidate.category === 'component' ? '#16a34a' : '#305eee';
    overlay.hidden = false;
    overlay.style.setProperty('--editor-selection-color', color);
    overlay.style.left = `${rect.left}px`;
    overlay.style.top = `${rect.top}px`;
    overlay.style.width = `${rect.width}px`;
    overlay.style.height = `${rect.height}px`;
    overlay.dataset.label = candidate.label;
    overlay.dataset.category = candidate.category;
  }
  function clearHover() {
    if (!hoverCandidate) return;
    hoverCandidate = null;
    drawOverlay(selectedCandidate);
  }
  function keyFor(element) {
    if (element.closest('[data-cms-bound]')) return null;
    for (let current = element; current && current !== document.body; current = current.parentElement) {
      for (const [key, list] of bindings) if (list.some(binding => binding.element === current && (!binding.attribute || binding.attribute === 'prose'))) return key;
      for (const [key, list] of bindings) if (list.some(binding => binding.element === current)) return key;
    }
    return null;
  }
  function bindingFor(element, key) {
    const list = bindings.get(key) || [];
    for (let current = element; current && current !== document.body; current = current.parentElement) {
      const binding = list.find(candidate => candidate.element === current);
      if (binding) return binding;
    }
    return list.find(candidate => candidate.element.getClientRects().length) || list[0];
  }
  function focus(key, scroll, preferredElement) {
    document.querySelectorAll('[data-editor-selected]').forEach(element => element.removeAttribute('data-editor-selected'));
    const list = bindings.get(key) || [];
    const binding = list.find(candidate => candidate.element === preferredElement) || list.find(candidate => candidate.element.getClientRects().length) || list[0];
    if (!binding) return;
    binding.element.setAttribute('data-editor-selected', '');
    if (scroll) binding.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  function renderProse(container, body) {
    const blocks = []; let lines = []; let list = [];
    function flush() {
      if (lines.length) {const p = document.createElement('p');lines.forEach((line,index) => {if(index) p.append(document.createElement('br'));p.append(document.createTextNode(line));});blocks.push(p);lines=[];}
      if (list.length) {const ul = document.createElement('ul');ul.className='flex list-disc flex-col gap-2 pl-5 marker:text-ink';for (const item of list){const li=document.createElement('li');li.textContent=item;ul.append(li);}blocks.push(ul);list=[];}
    }
    for (const raw of body.split('\n')) {
      const line=raw.trim();
      if (!line) {flush();continue;}
      if (line.startsWith('## ')) {flush();const h=document.createElement('h2');h.className='mt-2 text-h3 font-medium text-ink first:mt-0';h.textContent=line.slice(3);blocks.push(h);}
      else if (line.startsWith('- ')) {if(lines.length)flush();list.push(line.slice(2));}
      else {if(list.length)flush();lines.push(line);}
    }
    flush();container.replaceChildren(...blocks);
  }
  function activate() {
    if (active) return;
    active = true;
    const style = document.createElement('style');
    style.textContent = '#three-acts-editor-selection{position:fixed;z-index:2147483647;pointer-events:none;box-sizing:border-box;border:2px solid var(--editor-selection-color);background:color-mix(in srgb,var(--editor-selection-color) 13%,transparent);border-radius:2px}#three-acts-editor-selection::before{content:attr(data-label);position:absolute;left:-2px;top:-23px;max-width:min(260px,70vw);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:3px 7px;background:var(--editor-selection-color);color:#fff;font:500 11px/16px system-ui,sans-serif;letter-spacing:.01em;border-radius:3px 3px 0 0}#three-acts-editor-selection[data-category="cms"]{border-style:solid}';
    document.head.append(style);
    overlay = document.createElement('div');
    overlay.id = 'three-acts-editor-selection';
    overlay.hidden = true;
    document.body.append(overlay);
    document.addEventListener('click', event => {
      event.preventDefault(); event.stopPropagation();
      const candidate = candidateFor(event.target);
      if (!candidate) return;
      hoverCandidate = candidate;
      selectedCandidate = candidate;
      drawOverlay(candidate);
      document.querySelectorAll('[data-editor-selected]').forEach(element => element.removeAttribute('data-editor-selected'));
      candidate.element.setAttribute('data-editor-selected', '');
      if (candidate.category === 'cms') {
        send({ type: 'three-acts:select-cms', category: 'cms', binding: candidate.binding, label: candidate.label, value: candidate.details?.text || '' });
      } else if (candidate.binding) {
        const { id, path } = candidate.binding;
        focus(`${id}.${path}`, false, candidate.bindingElement || candidate.element);
        send({ type: 'three-acts:select', id, path, category: candidate.category, label: candidate.label });
      } else {
        send({ type: 'three-acts:select-element', category: candidate.category, selector: candidate.selector, element: candidate.details, label: candidate.label });
      }
    }, true);
    document.addEventListener('submit', event => { event.preventDefault(); event.stopPropagation(); }, true);
    document.addEventListener('pointerover', event => {
      const candidate = candidateFor(event.target);
      if (!candidate) { clearHover(); return; }
      if (candidate.element === hoverCandidate?.element && candidate.category === hoverCandidate?.category) return;
      hoverCandidate = candidate;
      drawOverlay(candidate);
      send({ type: 'three-acts:hover', category: candidate.category, ...(candidate.binding ? { binding: candidate.binding } : {}), ...(candidate.selector ? { selector: candidate.selector, element: candidate.details } : {}), label: candidate.label });
    }, true);
    document.addEventListener('pointerout', event => {
      if (event.relatedTarget instanceof Node && event.target instanceof Element && event.target.contains(event.relatedTarget)) return;
      const next = event.relatedTarget instanceof Element ? candidateFor(event.relatedTarget) : null;
      if (next?.element === hoverCandidate?.element) return;
      clearHover();
    }, true);
    document.addEventListener('dblclick', event => { event.preventDefault(); event.stopPropagation(); }, true);
    window.addEventListener('scroll', () => drawOverlay(hoverCandidate), true);
    window.addEventListener('resize', () => drawOverlay(hoverCandidate));
  }
  window.addEventListener('message', event => {
    if (event.source !== window.parent || event.origin !== origin || !event.data || typeof event.data !== 'object') return;
    if (event.data.type === 'three-acts:preview' && Array.isArray(event.data.documents)) {
      activate();
      Object.assign(brand, event.data.documents.find(doc => doc.id === 'shared')?.content.site ?? {});
      for (const doc of event.data.documents) {
        if (!definitions.has(doc.id)) continue;
        for (const field of fields(doc.content)) for (const binding of bindings.get(`${doc.id}.${field.path}`) || []) {
          if (binding.element.isContentEditable) continue;
          if (binding.attribute === 'prose') {
            renderProse(binding.node, String(resolve(field.value)));
          } else if (binding.attribute) {
            const value = String(resolve(field.value));
            if (/^(\/(?!\/)|#[a-z0-9_-]+$|https?:\/\/|mailto:|tel:)/i.test(value) && !Array.from(value).some(char => char.charCodeAt(0) <= 32 || char.charCodeAt(0) === 127 || char === '\\')) binding.element.setAttribute(binding.attribute, value);
          } else {
            if (!binding.node.isConnected && binding.element.isConnected) binding.node = binding.element;
            binding.node.textContent = String(resolve(field.value));
          }
        }
      }
    }
    if (event.data.type === 'three-acts:focus' && typeof event.data.path === 'string') focus(`${event.data.id}.${event.data.path}`, true);
  });
  send({type:'three-acts:ready'});
})();
