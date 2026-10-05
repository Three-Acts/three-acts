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
    style.textContent = '[data-editor-selected]{outline:2px solid #305eee!important;outline-offset:4px!important;border-radius:2px}[data-editor-hover]:not([data-editor-selected]){outline:1px dashed #7898ed!important;outline-offset:3px!important}[contenteditable=true]{cursor:text!important}';
    document.head.append(style);
    document.addEventListener('click', event => {
      event.preventDefault(); event.stopPropagation();
      const key = keyFor(event.target);
      if (key) { focus(key, false); const [id,...path] = key.split('.'); send({type:'three-acts:select',id,path:path.join('.')}); }
    }, true);
    document.addEventListener('submit', event => { event.preventDefault(); event.stopPropagation(); }, true);
    document.addEventListener('mouseover', event => { const key = keyFor(event.target); const binding = bindings.get(key)?.[0]; if (binding) binding.element.setAttribute('data-editor-hover',''); });
    document.addEventListener('mouseout', () => document.querySelectorAll('[data-editor-hover]').forEach(element => element.removeAttribute('data-editor-hover')));
    document.addEventListener('dblclick', event => {
      const key = keyFor(event.target);
      const binding = bindings.get(key)?.find(item => !item.attribute);
      if (!binding || binding.element.children.length || binding.element.tagName === 'BUTTON') return;
      const element = binding.element;
      element.contentEditable = 'true'; element.focus();
      const range = document.createRange(); range.selectNodeContents(element);
      window.getSelection().removeAllRanges(); window.getSelection().addRange(range);
      element.addEventListener('blur', () => {
        element.contentEditable = 'false';
        const [id, ...path] = key.split('.');
        send({type:'three-acts:edit', id, path:path.join('.'), value:element.textContent});
      }, {once:true});
    });
    document.addEventListener('paste', event => {
      if (event.target.isContentEditable) {
        event.preventDefault(); const selection = window.getSelection();
        if (!selection.rangeCount) return;
        const range = selection.getRangeAt(0); range.deleteContents();
        const text = document.createTextNode(event.clipboardData.getData('text/plain')); range.insertNode(text);range.setStartAfter(text);range.collapse(true);selection.removeAllRanges();selection.addRange(range);
      }
    });
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
