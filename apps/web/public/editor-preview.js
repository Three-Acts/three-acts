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
    if (element.closest('[data-cms-bound]')) continue;
    const value = element.getAttribute(attribute);
    const matches = relevant.flatMap(doc => fields(doc.content).map(field => ({id: doc.id, ...field}))).filter(field => field.value === value && /^(href|src)(_|$)/.test(field.path.split('.').at(-1)));
    const match = matches.length === 1 ? matches[0] : null;
    if (match) add(match.id, match.path, element, element, attribute);
  }
  function send(data) { window.parent.postMessage(data, origin); }
  function humanize(value) {
    return String(value || '').replace(/[._-]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/\b\w/g, char => char.toUpperCase());
  }
  function selectorFor(element) {
    if (element === document.body) return 'body';
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
  const styleProperties = ['display','flexDirection','justifyContent','alignItems','gap','paddingTop','paddingRight','paddingBottom','paddingLeft','marginTop','marginRight','marginBottom','marginLeft','width','height','minHeight','maxWidth','fontSize','fontWeight','lineHeight','color','backgroundColor','borderRadius'];
  const styleNames = Object.fromEntries(styleProperties.map(name => [name, name.replace(/[A-Z]/g, char => `-${char.toLowerCase()}`)]));
  const originalInlineStyles = new Map();
  let mode = 'design';
  let activeEditor = null;
  function safeElement(element) {
    return element instanceof Element && !element.closest('script,style,link,meta,title,svg,[data-three-acts-editor-ui],#three-acts-editor-selection');
  }
  function isVisible(element) {
    if (!safeElement(element) || !element.getClientRects().length) return false;
    const style = getComputedStyle(element);
    return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
  }
  function describe(element) {
    const explicitLabel = element.dataset.editorLabel;
    const cms = element.closest('[data-cms-bound]');
    if (cms) {
      const raw = cms.dataset.cmsBound || '';
      const separator = raw.indexOf('.');
      const collectionId = separator < 0 ? raw : raw.slice(0, separator);
      const path = separator < 0 ? '' : raw.slice(separator + 1);
      return { category: 'cms', element, binding: { ...(cms.dataset.cmsItemId || cms.dataset.recordId ? {id: cms.dataset.cmsItemId || cms.dataset.recordId} : {}), path, collectionId, field: path || undefined }, label: explicitLabel || `${humanize(collectionId)}${path ? ` · ${humanize(path.split('.').at(-1))}` : ''}` };
    }
    const binding = bindingFor(element);
    const key = binding ? `${binding.id}.${binding.path}` : null;
    const component = element.matches('[data-editor-component],[data-static-component],[data-component]') ? element : null;
    const staticGroup = element.tagName === 'SECTION' ? staticGroupFor(element) : null;
    const label = explicitLabel || (component
      ? humanize(component.dataset.editorComponentLabel || component.dataset.staticComponent || component.dataset.component || 'Component')
      : staticGroup
        ? humanize(staticGroup.replace(/_/g, ' '))
        : staticFieldLabel(element, key) || semanticLabel(element));
    return {category: component || staticGroup ? 'component' : 'element', element, binding, label, selector: selectorFor(element)};
  }
  function bindingFor(element) {
    for (const [key, list] of bindings) if (list.some(binding => binding.element === element)) {
      const [id, ...path] = key.split('.');
      return {id, path:path.join('.')};
    }
    return undefined;
  }
  function semanticLabel(element) {
    const tag = element.tagName.toLowerCase();
    if (/^h[1-6]$/.test(tag)) return `Heading ${tag.slice(1)}`;
    if (tag === 'p') return 'Paragraph';
    if (tag === 'div') return /(^|\s)container(\s|$)|(^|\s)max-w[^\s]*/i.test(element.className?.toString() || '') ? 'Container' : 'Div Block';
    if (tag === 'a') {
      const text = normalize(element.textContent || '').slice(0,40);
      return text ? `Link · ${text}` : 'Link';
    }
    if (tag === 'img') {
      const alt = normalize(element.getAttribute('alt') || '').slice(0,50);
      return alt ? `Image · ${alt}` : 'Image';
    }
    if (tag === 'span') return 'Text';
    return humanize(tag);
  }
  function staticFieldLabel(element, key) {
    if (!key || !element.matches('[data-static-field]') || element.dataset.staticAttribute) return null;
    const [, ...path] = key.split('.');
    const clean = path.map(part => part.replace(/_\d+$/, '')).filter(part => part && !/^(root|href|p|h[1-6]|link)$/i.test(part));
    if (!clean.length) return null;
    const content = definitions.get(key.split('.')[0])?.content;
    const group = clean.length > 1 && content?.[clean[0]] && typeof content[clean[0]] === 'object' ? clean.shift() : null;
    const field = clean.at(-1);
    if (!field) return null;
    const groupLabel = group ? group.replace(/_section$/, '').replace(/_/g, ' ') : '';
    return humanize([groupLabel, field].filter(Boolean).join(' '));
  }
  function staticGroupFor(section) {
    const counts = new Map();
    for (const field of section.querySelectorAll('[data-static-field]')) {
      const [id, group] = field.dataset.staticField.split('.');
      const content = definitions.get(id)?.content;
      if (!group || !content?.[group] || typeof content[group] !== 'object') continue;
      counts.set(group, (counts.get(group) || 0) + 1);
    }
    return [...counts].sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  }
  function buildTree() {
    const nodes = [];
    const visit = (element, parentSelector = 'body', depth = 1) => {
      if (nodes.length >= 400 || !safeElement(element)) return;
      const visible = isVisible(element);
      if (!visible) return;
      const text = normalize(element.textContent || '').slice(0, 90);
      const marker = element.matches('[data-static-field],[data-cms-bound],[data-editor-label],[data-editor-component],[data-static-component],[data-component]');
      const semantic = /^(MAIN|HEADER|FOOTER|NAV|ASIDE|SECTION|ARTICLE|FORM|BUTTON|A|IMG|VIDEO|FIGURE|UL|OL|TABLE|H[1-6]|P|LI)$/.test(element.tagName);
      const tag = element.tagName.toLowerCase();
      const layout = tag === 'div' && (/(^|\s)container(\s|$)|(^|\s)max-w[^\s]*/i.test(element.className?.toString() || '') || ['flex','grid'].includes(getComputedStyle(element).display));
      const inlinePresentation = tag === 'span' && !marker && !keyFor(element) && element.parentElement && normalize(element.parentElement.textContent || '') === normalize(element.textContent || '');
      const keep = !inlinePresentation && (text || marker || semantic || layout);
      let nextParent = parentSelector;
      if (keep) {
        const selector = selectorFor(element);
        const info = describe(element);
        const node = {selector, parentSelector, tag, label: info.label || text || semanticLabel(element), category: info.category || 'element', ...(info.binding ? {binding: info.binding} : {}), depth};
        nodes.push(node); nextParent = selector;
      }
      for (const child of element.children) {
        if (nodes.length >= 400) break;
        visit(child, nextParent, keep ? depth + 1 : depth);
      }
    };
    nodes.push({selector:'body', parentSelector:null, tag:'body', label:'Body', category:'element', depth:0});
    for (const child of document.body.children) visit(child, 'body', 1);
    send({type:'three-acts:canvas-tree', nodes, route});
  }
  function computedStyles(element) {
    const computed = getComputedStyle(element);
    return Object.fromEntries(styleProperties.map(property => [property, computed.getPropertyValue(styleNames[property]) || computed[property]]));
  }
  function selectionFor(element) {
    const info = describe(element);
    const breadcrumbs = [];
    for (let current = element; current && current !== document.body; current = current.parentElement) {
      if (!safeElement(current)) continue;
      const description = describe(current);
      breadcrumbs.unshift({selector:selectorFor(current), label: description.label || humanize(current.tagName.toLowerCase())});
    }
    breadcrumbs.unshift({selector:'body', label:'Body'});
    const textField = info.category === 'cms' ? null : directTextField(element);
    const attributes = elementAttributes(element, info.category === 'cms');
    const textState = textField ? 'editable' : element.childElementCount ? 'structured' : normalize(element.textContent || '') ? 'unbound' : 'empty';
    return {selector:selectorFor(element), tag:element.tagName.toLowerCase(), label:info.label || humanize(element.tagName.toLowerCase()), category:info.category, ...(info.binding ? {binding:info.binding} : {}), textState, ...(textField ? {textField} : {}), ...(attributes.length ? {attributes} : {}), editable:isSafeEditable(element, info.binding), classNames:Array.from(element.classList), breadcrumbs, styles:computedStyles(element)};
  }
  const inspectableAttributes = ['href','src','alt','title','target','aria-label'];
  function directTextField(element) {
    if (element.childElementCount || element.childNodes.length > 1 || (element.firstChild && element.firstChild.nodeType !== Node.TEXT_NODE)) return null;
    const candidates = [];
    for (const [key, list] of bindings) for (const binding of list) {
      if (binding.element === element && binding.attribute == null && (binding.node === element.firstChild || binding.node === element)) candidates.push({key});
    }
    if (candidates.length !== 1) return null;
    const [id, ...path] = candidates[0].key.split('.');
    const fieldPath = path.join('.');
    const value = fieldPath.split('.').filter(Boolean).reduce((current, part) => current && typeof current === 'object' ? current[part] : undefined, definitions.get(id)?.content);
    return typeof value === 'string' ? {id, path:fieldPath, value} : null;
  }
  function elementAttributes(element, readOnly = false) {
    return inspectableAttributes.flatMap(name => {
      const value = element.getAttribute(name);
      const matches = [];
      for (const [key, list] of bindings) for (const binding of list) {
        if (binding.element === element && binding.attribute === name) matches.push(key);
      }
      const unique = [...new Set(matches)];
      if (value == null && unique.length === 0) return [];
      if (readOnly || unique.length !== 1) return [{name, value:value ?? ''}];
      const [id, ...path] = unique[0].split('.');
      return [{name, value:value ?? '', binding:{id, path:path.join('.')}}];
    });
  }
  function isSafeEditable(element, binding) {
    if (!binding || element.matches('a,img,input,textarea,select,button') || element.querySelector('*')) return false;
    const key = `${binding.id}.${binding.path}`;
    const candidates = bindings.get(key) || [];
    const definition = definitions.get(binding.id)?.content;
    const value = binding.path.split('.').filter(Boolean).reduce((current, part) => current && typeof current === 'object' ? current[part] : undefined, definition);
    if (typeof value !== 'string' || candidates.length !== 1 || candidates[0].attribute != null || candidates[0].element !== element) return false;
    const node = candidates[0].node;
    return node === element || (node?.nodeType === Node.TEXT_NODE && node.parentElement === element && element.childNodes.length === 1);
  }
  function publishSelection(element) {
    if (!element || !element.isConnected) return;
    selectedCandidate = describe(element);
    drawOverlay(selectedCandidate);
    element.setAttribute('data-editor-selected','');
    send({type:'three-acts:selection', ...selectionFor(element)});
    const info = describe(element);
    if (info.category === 'cms') send({type:'three-acts:select-cms', category:'cms', binding:info.binding, label:info.label});
    else if (info.binding) send({type:'three-acts:select', id:info.binding.id, path:info.binding.path});
  }
  let overlay;
  let hoverCandidate = null;
  let selectedCandidate = null;
  function drawOverlay(candidate) {
    if (!overlay) return;
    if (mode !== 'design') { overlay.hidden = true; return; }
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
  function focus(key, scroll) {
    document.querySelectorAll('[data-editor-selected]').forEach(element => element.removeAttribute('data-editor-selected'));
    const binding = bindings.get(key)?.[0];
    if (!binding) return;
    binding.element.setAttribute('data-editor-selected', '');
    if (scroll) binding.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    selectedCandidate = describe(binding.element);
    drawOverlay(selectedCandidate);
    send({type:'three-acts:selection', ...selectionFor(binding.element)});
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
  function validSelector(selector) {
    if (typeof selector !== 'string' || selector.length > 500) return null;
    try { return document.querySelector(selector); } catch { return null; }
  }
  function stylesChanged() {
    send({type:'three-acts:styles-changed', hasChanges:originalInlineStyles.size > 0});
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
    buildTree();
    document.addEventListener('click', event => {
      const initialTarget = event.target?.nodeType === Node.TEXT_NODE ? event.target.parentElement : event.target;
      if (activeEditor && initialTarget instanceof Node && (initialTarget === activeEditor.target || activeEditor.target.contains(initialTarget))) return;
      if (mode === 'preview') {
        const target = initialTarget;
        const anchor = target instanceof Element ? target.closest('a[href]') : null;
        if (!anchor) return;
        let destination;
        try { destination = new URL(anchor.href, window.location.href); } catch { event.preventDefault(); event.stopPropagation(); return; }
        if (destination.origin !== window.location.origin) {
          // External destinations are opened from the parent editor's site preview.
          event.preventDefault(); event.stopPropagation();
          return;
        }
        if (destination.pathname !== window.location.pathname) {
          // Keep editor state alive; the parent resolves static and CMS routes.
          event.preventDefault(); event.stopPropagation();
          send({type:'three-acts:navigate', href:destination.href});
        }
        return;
      }
      event.preventDefault(); event.stopPropagation();
      if (mode === 'locked') return;
      const target = event.target?.nodeType === Node.TEXT_NODE ? event.target.parentElement : event.target;
      if (!(target instanceof Element) || !isVisible(target) || !safeElement(target)) return;
      document.querySelectorAll('[data-editor-selected]').forEach(element => element.removeAttribute('data-editor-selected'));
      hoverCandidate = null;
      publishSelection(target);
    }, true);
    document.addEventListener('submit', event => { event.preventDefault(); event.stopPropagation(); }, true);
    document.addEventListener('pointerover', event => {
      if (mode !== 'design') { clearHover(); return; }
      const target = event.target?.nodeType === Node.TEXT_NODE ? event.target.parentElement : event.target;
      if (!(target instanceof Element) || !isVisible(target) || !safeElement(target)) { clearHover(); return; }
      const candidate = describe(target);
      if (target === hoverCandidate?.element && candidate.category === hoverCandidate?.category) return;
      hoverCandidate = candidate;
      drawOverlay(candidate);
    }, true);
    document.addEventListener('pointerout', event => {
      if (event.relatedTarget instanceof Node && event.target instanceof Element && event.target.contains(event.relatedTarget)) return;
      const next = event.relatedTarget instanceof Element && safeElement(event.relatedTarget) ? describe(event.relatedTarget) : null;
      if (next?.element === hoverCandidate?.element) return;
      clearHover();
    }, true);
    document.addEventListener('dblclick', event => {
      if (mode === 'preview') return;
      const editTarget = event.target?.nodeType === Node.TEXT_NODE ? event.target.parentElement : event.target;
      if (activeEditor && editTarget instanceof Node && (editTarget === activeEditor.target || activeEditor.target.contains(editTarget))) return;
      event.preventDefault(); event.stopPropagation();
      if (mode === 'locked') return;
      const target = editTarget;
      if (!(target instanceof Element)) return;
      const info = describe(target);
      if (!isSafeEditable(target, info.binding)) return;
      const key = `${info.binding.id}.${info.binding.path}`;
      const binding = bindings.get(key)?.[0];
      const original = target.textContent || '';
      const hadContentEditable = target.hasAttribute('contenteditable');
      const originalContentEditable = target.getAttribute('contenteditable');
      let cancelled = false;
      let finished = false;
      target.contentEditable = 'true';
      target.focus();
      const paste = pasteEvent => {
        pasteEvent.preventDefault();
        const text = pasteEvent.clipboardData?.getData('text/plain') || '';
        const selection = window.getSelection();
        if (selection?.rangeCount && target.contains(selection.anchorNode) && target.contains(selection.focusNode)) {
          const range = selection.getRangeAt(0);
          range.deleteContents();
          const textNode = document.createTextNode(text);
          range.insertNode(textNode);
          range.setStartAfter(textNode);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
        } else if (text) target.append(document.createTextNode(text));
      };
      const keydown = keyEvent => {
        if (keyEvent.key === 'Enter') { keyEvent.preventDefault(); target.blur(); }
        if (keyEvent.key === 'Escape') { keyEvent.preventDefault(); cancelled = true; target.textContent = original; target.blur(); }
      };
      const finish = (commit = mode === 'design') => {
        if (finished) return;
        finished = true;
        if (!commit) target.textContent = original;
        if (document.activeElement === target) target.blur();
        target.removeEventListener('paste', paste);
        target.removeEventListener('keydown', keydown);
        target.removeEventListener('blur', finish);
        if (hadContentEditable) target.setAttribute('contenteditable', originalContentEditable ?? '');
        else target.removeAttribute('contenteditable');
        target.normalize();
        if (commit && !cancelled && target.textContent !== original) send({type:'three-acts:edit', id:info.binding.id, path:info.binding.path, value:normalize(target.textContent || '')});
        if (binding) {
          if (binding.node === target) binding.node = target;
          else {
            if (!target.firstChild) target.append(document.createTextNode(''));
            binding.node = target.firstChild;
          }
        }
        if (activeEditor?.finish === finish) activeEditor = null;
        buildTree();
      };
      activeEditor = {finish, target};
      target.addEventListener('paste', paste);
      target.addEventListener('keydown', keydown);
      target.addEventListener('blur', finish);
    }, true);
    document.addEventListener('keydown', event => {
      if (event.key !== 'Escape' || mode !== 'design' || document.activeElement?.isContentEditable) return;
      selectedCandidate = null;
      document.querySelectorAll('[data-editor-selected]').forEach(element => element.removeAttribute('data-editor-selected'));
      if (overlay) overlay.hidden = true;
      send({type:'three-acts:clear-selection'});
      send({type:'three-acts:selection', selection:null});
    }, true);
    window.addEventListener('scroll', () => drawOverlay(hoverCandidate || selectedCandidate), true);
    let resizeFrame = 0;
    window.addEventListener('resize', () => {
      if (resizeFrame) cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(() => {
        resizeFrame = 0;
        buildTree();
        drawOverlay(hoverCandidate || selectedCandidate);
        if (selectedCandidate?.element?.isConnected) send({type:'three-acts:selection', ...selectionFor(selectedCandidate.element)});
      });
    });
  }
    window.addEventListener('message', event => {
    if (event.source !== window.parent || event.origin !== origin || !event.data || typeof event.data !== 'object') return;
    if (event.data.type === 'three-acts:mode' && ['design','preview','locked'].includes(event.data.mode)) {
      const nextMode = event.data.mode;
      if (activeEditor && nextMode !== mode) activeEditor.finish(nextMode === 'preview' && mode === 'design');
      if (nextMode === 'preview') hoverCandidate = null;
      mode = event.data.mode;
      if (overlay && mode !== 'design') overlay.hidden = true;
      else if (mode === 'design') drawOverlay(selectedCandidate);
      return;
    }
    if (event.data.type === 'three-acts:clear-selection') {
      selectedCandidate = null;
      document.querySelectorAll('[data-editor-selected]').forEach(element => element.removeAttribute('data-editor-selected'));
      if (overlay) overlay.hidden = true;
      send({type:'three-acts:selection', selection:null});
      return;
    }
    if (event.data.type === 'three-acts:select-node' && typeof event.data.selector === 'string') {
      if (mode !== 'design') return;
      const element = validSelector(event.data.selector);
      if (!element || !isVisible(element) || !safeElement(element)) return;
      document.querySelectorAll('[data-editor-selected]').forEach(node => node.removeAttribute('data-editor-selected'));
      element.scrollIntoView({behavior:'smooth',block:'center'});
      publishSelection(element);
      return;
    }
    if (event.data.type === 'three-acts:style' && typeof event.data.selector === 'string' && typeof event.data.property === 'string' && typeof event.data.value === 'string') {
      if (mode !== 'design') return;
      const property = event.data.property;
      const value = event.data.value.trim();
      const element = validSelector(event.data.selector);
      if (!styleProperties.includes(property) || !element || !safeElement(element) || !value || value.length > 100 || /url\s*\(|var\s*\(|expression\s*\(|javascript\s*:|[;{}]|!important|@import/i.test(value) || !CSS.supports(styleNames[property], value)) return;
      if (!originalInlineStyles.has(element)) originalInlineStyles.set(element, {hadStyle:element.hasAttribute('style'), style:element.getAttribute('style')});
      element.style.setProperty(styleNames[property], value);
      stylesChanged();
      if (selectedCandidate?.element === element) send({type:'three-acts:selection', ...selectionFor(element)});
      return;
    }
    if (event.data.type === 'three-acts:reset-styles') {
      if (mode !== 'design') return;
      for (const [element, original] of originalInlineStyles) {
        if (!element.isConnected) continue;
        if (original.hadStyle) element.setAttribute('style', original.style ?? '');
        else element.removeAttribute('style');
      }
      originalInlineStyles.clear();
      stylesChanged();
      if (selectedCandidate?.element?.isConnected) send({type:'three-acts:selection', ...selectionFor(selectedCandidate.element)});
      return;
    }
    if (event.data.type === 'three-acts:preview' && Array.isArray(event.data.documents)) {
      activate();
      Object.assign(brand, event.data.documents.find(doc => doc.id === 'shared')?.content.site ?? {});
      for (const doc of event.data.documents) {
        if (!definitions.has(doc.id)) continue;
        definitions.set(doc.id, {...definitions.get(doc.id), content:doc.content});
        for (const field of fields(doc.content)) for (const binding of bindings.get(`${doc.id}.${field.path}`) || []) {
          if (binding.element.isContentEditable) continue;
          if (binding.attribute === 'prose') {
            renderProse(binding.node, String(resolve(field.value)));
          } else if (binding.attribute) {
            const value = String(resolve(field.value));
            const safeUrl = value === '' || (/^(\/(?!\/)|#[a-z0-9_-]+$|https?:\/\/|mailto:|tel:)/i.test(value) && !Array.from(value).some(char => char.charCodeAt(0) <= 32 || char.charCodeAt(0) === 127 || char === '\\'));
            if (binding.attribute === 'href' || binding.attribute === 'src') {
              if (safeUrl) {
                if (value) binding.element.setAttribute(binding.attribute, value);
                else binding.element.removeAttribute(binding.attribute);
              }
            } else if (inspectableAttributes.includes(binding.attribute)) binding.element.setAttribute(binding.attribute, value);
          } else {
            // A text marker on a container must never flatten its child elements.
            if (binding.node === binding.element && binding.element.childElementCount) continue;
            if (!binding.node.isConnected && binding.element.isConnected) binding.node = binding.element;
            binding.node.textContent = String(resolve(field.value));
          }
        }
      }
      buildTree();
      if (selectedCandidate?.element?.isConnected) send({type:'three-acts:selection', ...selectionFor(selectedCandidate.element)});
    }
    if (event.data.type === 'three-acts:focus' && typeof event.data.path === 'string') focus(`${event.data.id}.${event.data.path}`, true);
  });
  send({type:'three-acts:ready', route});
})();
