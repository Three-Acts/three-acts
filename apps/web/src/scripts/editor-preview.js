import { createCanvasOutline } from "./canvas-outline.js";
import { normalizeCmsCollection, readCmsSource } from "@three-acts/cms-schema";
import { applyStyle, componentBaseClass, componentDefinitions, designCss, emptyDesign, resolveProperties, validateDesign } from "@three-acts/design";
import { isSafeContentUrl, isSafeMediaUrl } from "@three-acts/static-content";
import { cn, historyShortcut, parseProse, proseRuns } from "@three-acts/utils";

/* Enabled explicitly by the web app, and activated only by the configured editor origin. */
(() => {
  const config = document.getElementById('three-acts-editor-config');
  if (!config || window.parent === window) return;
  const { origin, documents } = JSON.parse(config.textContent);
  let design = validateDesign(documents.find(doc => doc.id === 'design')?.content ?? emptyDesign());
  let editingComponent = null;
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
  let previewCollection = null;
  let latestPreviewDocuments = null;
  let cmsRendering = false;
  let cmsSelectionAnchor = null;
  function add(id, path, element, node, attribute) {
    const key = `${id}.${path}`;
    const list = bindings.get(key) || [];
    if (!list.some(binding => binding.node === node && binding.attribute === attribute)) list.push({element, node, attribute});
    bindings.set(key, list);
  }
  function scanBindings(collectionId = previewCollection) {
    previewCollection = collectionId;
    bindings.clear();
    const currentDocuments = [...definitions.values()];
    const relevant = [...currentDocuments.filter(doc => doc.id !== 'shared' && doc.id !== 'design' && (previewCollection ? doc.collectionId === previewCollection : routeMatches(doc.route, route))), ...currentDocuments.filter(doc => doc.id === 'shared')];
    document.querySelectorAll('[data-static-field]').forEach(element => {
      if (element.closest('[data-cms-bound]')) return;
      const [id, ...path] = element.dataset.staticField.split('.');
      add(id, path.join('.'), element, element, element.dataset.staticAttribute || (element.dataset.staticFormat === 'prose' ? 'prose' : null));
    });
    // Media object markers bind alt independently of its current value, including
    // empty alt. Never infer alt from matching text elsewhere on the page.
    document.querySelectorAll('img[data-static-media]').forEach(element => {
      if (element.closest('[data-cms-bound]')) return;
      const [id, ...path] = element.dataset.staticMedia.split('.');
      const mediaPath = path.join('.');
      const media = path.reduce((value, part) => value && typeof value === 'object' ? value[part] : undefined, definitions.get(id)?.content);
      if (!media || typeof media.src !== 'string' || typeof media.alt !== 'string') return;
      add(id, `${mediaPath}.src`, element, element, 'src');
      add(id, `${mediaPath}.alt`, element, element, 'alt');
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
      if (element.closest('[data-cms-bound]') || element.hasAttribute('data-static-media')) continue;
      const value = element.getAttribute(attribute);
      const matches = relevant.flatMap(doc => fields(doc.content).map(field => ({id: doc.id, ...field}))).filter(field => field.value === value && /^(href|src)(_|$)/.test(field.path.split('.').at(-1)));
      const match = matches.length === 1 ? matches[0] : null;
      if (match) add(match.id, match.path, element, element, attribute);
    }
  }
  scanBindings();
  const frameSession = new URLSearchParams(window.location.search).get('session') || undefined;
  function send(data) { window.parent.postMessage({...data, ...(frameSession ? {session:frameSession} : {})}, origin); }
  function humanize(value) {
    return String(value || '').replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[._-]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/\b\w/g, char => char.toUpperCase());
  }
  const outline = createCanvasOutline({ safeElement, describe, keyFor });
  const selectorFor = outline.selectorFor;
  const styleProperties = ['display','flexDirection','justifyContent','alignItems','gap','paddingTop','paddingRight','paddingBottom','paddingLeft','marginTop','marginRight','marginBottom','marginLeft','width','height','minHeight','maxWidth','fontSize','fontWeight','lineHeight','color','backgroundColor','borderRadius'];
  const styleNames = Object.fromEntries(styleProperties.map(name => [name, name.replace(/[A-Z]/g, char => `-${char.toLowerCase()}`)]));
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
      const rawCollection = separator < 0 ? raw : raw.slice(0, separator);
      const collectionId = normalizeCmsCollection(rawCollection) || rawCollection;
      const path = separator < 0 ? '' : raw.slice(separator + 1);
      const owner = cms.closest('[data-cms-item-id],[data-record-id]');
      const ownerCollection = owner?.dataset.cmsCollection || owner?.dataset.cmsBound?.split('.')[0];
      const cmsSource = owner && normalizeCmsCollection(ownerCollection || '') === collectionId ? readCmsSource({ collectionId, recordId: owner.dataset.cmsItemId || owner.dataset.recordId, label: owner.dataset.cmsItemLabel, ...(path ? { field: path } : {}) }) : null;
      return { category: 'cms', element, ...(cmsSource ? { cmsSource } : {}), binding: { ...(cms.dataset.cmsItemId || cms.dataset.recordId ? {id: cms.dataset.cmsItemId || cms.dataset.recordId} : {}), path, collectionId, field: path || undefined }, label: explicitLabel || `${humanize(collectionId)}${path ? ` · ${humanize(path.split('.').at(-1))}` : ''}` };
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
    return {category: component ? 'component' : 'element', element, binding, label, selector: selectorFor(element)};
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
    send({ type: 'three-acts:canvas-tree', ...outline.snapshot(selectedCandidate?.element), route });
  }
  function refreshOutline() {
    if (selectedCandidate && !selectedCandidate.element.isConnected) {
      selectedCandidate = null;
      editingComponent = null;
      outline.restore();
      send({ type: 'three-acts:selection', selection: null });
    }
    buildTree();
    drawOverlay(hoverCandidate?.element?.isConnected ? hoverCandidate : selectedCandidate);
    if (selectedCandidate?.element?.isConnected) send({ type: 'three-acts:selection', ...selectionFor(selectedCandidate.element) });
  }
  function computedStyles(element) {
    const computed = getComputedStyle(element);
    return Object.fromEntries(styleProperties.map(property => [property, computed.getPropertyValue(styleNames[property]) || computed[property]]));
  }
  function componentRoot(element) {
    const root = element.closest('[data-editor-component]');
    return root && Object.hasOwn(componentDefinitions, root.dataset.editorComponent) ? root : null;
  }
  function componentDescriptor(root) {
    if (!root) return null;
    const name = root.dataset.editorComponent;
    const instanceId = root.dataset.editorInstance;
    let props = {};
    try { props = JSON.parse(root.dataset.editorSourceProps || '{}'); } catch { /* Invalid source metadata stays at defaults. */ }
    const resolvedProps = resolveProperties(design, name, instanceId, props);
    const fields = Array.from(root.querySelectorAll('[data-static-field]')).filter(element => !element.closest('[data-cms-bound]')).flatMap(element => {
      const binding = bindingFor(element);
      if (!binding || (!element.dataset.staticAttribute && !directTextField(element))) return [];
      const value = binding.path.split('.').reduce((value, part) => value && typeof value === 'object' ? value[part] : undefined, definitions.get(binding.id)?.content);
      return typeof value === 'string' ? [{ ...binding, label: element.dataset.staticAttribute || (name.startsWith('Button.') ? 'Text' : humanize(binding.path.split('.').at(-1).replace(/_\d+$/, ''))), value }] : [];
    });
    const ownBinding = bindingFor(root);
    if (ownBinding && root.dataset.staticAttribute) {
      const value = ownBinding.path.split('.').reduce((value, part) => value && typeof value === 'object' ? value[part] : undefined, definitions.get(ownBinding.id)?.content);
      if (typeof value === 'string') fields.unshift({ ...ownBinding, label: root.dataset.staticAttribute, value });
    }
    return { name, ...(instanceId ? { instanceId } : {}), sourceProps: { ...componentDefinitions[name].defaultVariants, ...props }, props: resolvedProps, fields: fields.filter((field, index) => fields.findIndex(candidate => candidate.id === field.id && candidate.path === field.path) === index).slice(0, 100) };
  }
  function editingTarget(element) {
    const root = componentRoot(element);
    if (editingComponent && root?.dataset.editorComponent === editingComponent.name) {
      const part = element.closest('[data-editor-part]');
      if (part && componentRoot(part) === root && Object.hasOwn(componentDefinitions[editingComponent.name].parts, part.dataset.editorPart)) {
        return { kind: 'component', component: editingComponent.name, part: part.dataset.editorPart };
      }
      return null;
    }
    if (editingComponent || (root && root !== element)) return null;
    return element.dataset.editorId ? { kind: 'element', id: element.dataset.editorId } : null;
  }
  function selectableTarget(element) {
    const root = componentRoot(element);
    if (!root || (element !== root && element.closest('[data-cms-bound]'))) return element;
    if (editingComponent?.name === root.dataset.editorComponent) return element.closest('[data-editor-part]') || element;
    if (!root.dataset.editorComponent.startsWith('Button.')) {
      const prose = element.closest('[data-static-format="prose"][data-static-field]');
      if (prose && formattedTextField(prose)) return prose;
      if (element.matches('img[data-static-media]') && bindingFor(element)) return element;
    }
    if (element !== root && element.hasAttribute('data-static-field') && !root.dataset.editorComponent.startsWith('Button.')) return element;
    return root;
  }
  function renderDesign(next) {
    design = validateDesign(next);
    document.querySelectorAll('[data-editor-id]:not([data-editor-component])').forEach(element => {
      element.setAttribute('class', applyStyle(element.dataset.editorBaseClass || '', design.elements[element.dataset.editorId]));
    });
    document.querySelectorAll('[data-editor-component]').forEach(root => {
      const name = root.dataset.editorComponent;
      if (!Object.hasOwn(componentDefinitions, name)) return;
      let sourceProps = {};
      try { sourceProps = JSON.parse(root.dataset.editorSourceProps || '{}'); } catch { return; }
      const props = resolveProperties(design, name, root.dataset.editorInstance, sourceProps);
      root.className = applyStyle(cn(componentBaseClass(name, props), root.dataset.editorCallerClass || ''), design.components[name]?.parts.root);
      root.querySelectorAll('[data-editor-part]').forEach(part => {
        if (componentRoot(part) !== root) return;
        part.className = applyStyle(part.dataset.editorBaseClass || '', design.components[name]?.parts[part.dataset.editorPart]);
      });
    });
    const sheet = document.getElementById('three-acts-design-css');
    if (sheet) sheet.textContent = designCss(design);
  }
  function selectionFor(element) {
    const info = describe(element);
    const root = componentRoot(element);
    const component = root === element ? componentDescriptor(root) : null;
    const designTarget = editingTarget(element);
    const mainPart = designTarget?.kind === 'component';
    const breadcrumbs = [];
    for (let current = element; current && current !== document.body; current = current.parentElement) {
      if (!safeElement(current)) continue;
      const description = describe(current);
      breadcrumbs.unshift({selector:selectorFor(current), label: description.label || humanize(current.tagName.toLowerCase())});
    }
    breadcrumbs.unshift({selector:'body', label:'Body'});
    const proseField = info.category === 'cms' ? null : formattedTextField(element);
    const textField = info.category === 'cms' ? null : proseField || directTextField(element);
    const attributes = elementAttributes(element, info.category === 'cms');
    const textState = proseField ? 'structured' : textField ? 'editable' : element.childElementCount ? 'structured' : normalize(element.textContent || '') ? 'unbound' : 'empty';
    return {selector:selectorFor(element), visibility:outline.visibilityFor(element), tag:element.tagName.toLowerCase(), label:info.label || humanize(element.tagName.toLowerCase()), ...(info.cmsSource ? {cmsSource:info.cmsSource} : {}), category:mainPart && info.category !== 'cms' ? 'element' : info.category, ...(component && !mainPart ? {component} : {}), ...(editingComponent ? {editingComponent:editingComponent.name} : {}), ...(designTarget ? {designTarget} : {}), sourceClasses:(element.dataset.editorBaseClass || (root === element ? cn(componentBaseClass(root.dataset.editorComponent, resolveProperties(design, root.dataset.editorComponent, root.dataset.editorInstance, JSON.parse(root.dataset.editorSourceProps || '{}'))), root.dataset.editorCallerClass || '') : '')).split(/\s+/).filter(Boolean), ...(info.binding ? {binding:info.binding} : {}), textState, ...(textField ? {textField} : {}), ...(proseField ? {textFormat:'prose'} : {}), ...(attributes.length ? {attributes} : {}), editable:isSafeEditable(element, info.binding), classNames:Array.from(element.classList), breadcrumbs, styles:computedStyles(element)};
  }
  const inspectableAttributes = ['href','src','alt','title','target','aria-label'];
  function formattedTextField(element) {
    if (element.dataset.staticFormat !== 'prose' || !element.dataset.staticField) return null;
    const [id, ...path] = element.dataset.staticField.split('.');
    const fieldPath = path.join('.');
    const candidates = (bindings.get(`${id}.${fieldPath}`) || []).filter(binding => binding.element === element);
    if (candidates.length !== 1 || candidates[0].attribute !== 'prose') return null;
    const value = path.reduce((value, part) => value && typeof value === 'object' ? value[part] : undefined, definitions.get(id)?.content);
    return typeof value === 'string' ? {id, path:fieldPath, value} : null;
  }
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
    if (editingComponent && componentRoot(element)?.dataset.editorComponent !== editingComponent.name) editingComponent = null;
    if (!element || !element.isConnected) return;
    outline.reveal(element);
    selectedCandidate = describe(element);
    const source = selectedCandidate.cmsSource;
    cmsSelectionAnchor = source ? { source, tag:element.tagName, ordinal:Math.max(0, cmsTargets(source, element.tagName).indexOf(element)) } : null;
    buildTree();
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
    if (!candidate?.element?.isConnected || outline.visibilityFor(candidate.element).state === 'hidden') { overlay.hidden = true; return; }
    const rect = candidate.element.getBoundingClientRect();
    if (!rect.width || !rect.height) { overlay.hidden = true; return; }
    const color = candidate.category === 'cms' ? '#9333ea' : candidate.category === 'component' ? '#16a34a' : '#305eee';
    overlay.hidden = false;
    overlay.style.setProperty('--editor-selection-color', color);
    overlay.style.left = `${rect.left}px`;
    overlay.style.top = `${rect.top}px`;
    overlay.style.width = `${rect.width}px`;
    overlay.style.height = `${rect.height}px`;
    const affordance = candidate.category === 'component' ? 'Properties' : isSafeEditable(candidate.element, candidate.binding) ? 'Edit text' : elementAttributes(candidate.element, candidate.category === 'cms').some(attribute => attribute.binding) ? candidate.element.tagName === 'IMG' ? 'Edit image' : 'Edit attributes' : '';
    overlay.dataset.label = candidate.label + (affordance ? ` · ${affordance}` : '');
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
    function appendText(element, text) {
      for (const run of proseRuns(text)) {
        if (!run.href) { element.append(document.createTextNode(run.text)); continue; }
        const link = document.createElement('a');
        link.href = run.href; link.textContent = run.text;
        link.className = 'text-ink underline decoration-1 underline-offset-2 hover:no-underline';
        if (run.href.startsWith('http')) { link.target = '_blank'; link.rel = 'noopener noreferrer'; }
        element.append(link);
      }
    }
    const blocks = parseProse(body).map(block => {
      const element = document.createElement(block.type === 'ul' ? 'ul' : block.type === 'h2' ? 'h2' : 'p');
      if (block.type === 'h2') { element.className = 'mt-2 text-h3 font-medium text-ink first:mt-0'; appendText(element, block.text); }
      else if (block.type === 'ul') {
        element.className = 'flex list-disc flex-col gap-2 pl-5 marker:text-ink';
        for (const item of block.items) { const li = document.createElement('li'); appendText(li, item); element.append(li); }
      } else block.lines.forEach((line, index) => { if (index) element.append(document.createElement('br')); appendText(element, line); });
      return element;
    });
    container.replaceChildren(...blocks);
  }
  function updateImageSource(element, value) {
    // A local image may already have an optimized <picture> source. Keep it
    // in sync or remove its candidate when the replacement is external.
    const source = element.parentElement?.tagName === 'PICTURE' ? element.parentElement.querySelector('source[data-image-avif]') : null;
    if (source) {
      if (value.startsWith('/') && /\.(png|jpe?g|webp)$/i.test(value)) source.setAttribute('srcset', value.replace(/\.(png|jpe?g|webp)$/i, '.avif'));
      else source.removeAttribute('srcset');
    }
  }
  function applyPreviewContent(previewDocuments) {
      Object.assign(brand, previewDocuments.find(doc => doc.id === 'shared')?.content.site ?? {});
      for (const doc of previewDocuments) {
        if (!definitions.has(doc.id)) continue;
        definitions.set(doc.id, {...definitions.get(doc.id), content:doc.content});
        for (const field of fields(doc.content)) for (const binding of bindings.get(`${doc.id}.${field.path}`) || []) {
          if (binding.element.isContentEditable) continue;
          if (binding.attribute === 'prose') {
            renderProse(binding.node, String(resolve(field.value)));
          } else if (binding.attribute) {
            const value = String(resolve(field.value));
            const safeUrl = value === '' || (binding.attribute === 'src' ? isSafeMediaUrl(value) : isSafeContentUrl(value));
            if (binding.attribute === 'href' || binding.attribute === 'src') {
              if (safeUrl) {
                if (binding.attribute === 'src' && binding.element.tagName === 'IMG') updateImageSource(binding.element, value);
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
  }
  function cmsTargets(source, tag) {
    const matches = [];
    const seen = new Set();
    for (const root of document.querySelectorAll('[data-cms-bound]')) {
      const current = describe(root).cmsSource;
      if (!current || current.collectionId !== source.collectionId || current.recordId !== source.recordId || current.field !== source.field) continue;
      for (const candidate of [root, ...root.querySelectorAll(tag)]) {
        if (candidate.tagName !== tag || seen.has(candidate)) continue;
        const own = describe(candidate).cmsSource;
        if (own?.collectionId === source.collectionId && own.recordId === source.recordId && own.field === source.field) { seen.add(candidate); matches.push(candidate); }
      }
    }
    return matches;
  }
  document.addEventListener('three-acts:cms-rendering', () => { cmsRendering = true; });
  document.addEventListener('three-acts:cms-rendered', event => {
    const collectionId = event.detail?.collectionId;
    if (!['products', 'articles', 'authors', 'product-categories', 'article-categories'].includes(collectionId)) return;
    cmsRendering = false;
    scanBindings(collectionId);
    if (!active) return;
    renderDesign(design);
    if (latestPreviewDocuments) applyPreviewContent(latestPreviewDocuments);
    if (cmsSelectionAnchor && !selectedCandidate?.element?.isConnected) {
      const matches = cmsTargets(cmsSelectionAnchor.source, cmsSelectionAnchor.tag);
      const source = cmsSelectionAnchor.source;
      const container = Array.from(document.querySelectorAll('[data-cms-bound]')).find(element => {
        const own = describe(element).cmsSource;
        return own?.collectionId === source.collectionId && own.recordId === source.recordId && own.field === source.field;
      });
      const restored = matches[Math.min(cmsSelectionAnchor.ordinal, matches.length - 1)] || container;
      if (restored) publishSelection(restored);
    }
    refreshOutline();
  });
  function validSelector(selector) {
    if (typeof selector !== 'string' || selector.length > 500) return null;
    const identified = outline.resolveSelector(selector);
    if (identified !== undefined) return identified;
    try { const matches = document.querySelectorAll(selector); return matches.length === 1 ? matches[0] : null; } catch { return null; }
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
      if (initialTarget instanceof Element && initialTarget.closest('[data-three-acts-editor-ui]')) return;
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
      publishSelection(selectableTarget(target));
    }, true);
    document.addEventListener('submit', event => { event.preventDefault(); event.stopPropagation(); }, true);
    document.addEventListener('pointerover', event => {
      if (mode !== 'design') { clearHover(); return; }
      const target = event.target?.nodeType === Node.TEXT_NODE ? event.target.parentElement : event.target;
      if (!(target instanceof Element) || !isVisible(target) || !safeElement(target)) { clearHover(); return; }
      const candidate = describe(selectableTarget(target));
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
      const root = componentRoot(target);
      if (root && !editingComponent && (target === root || root.dataset.editorComponent.startsWith('Button.'))) {
        editingComponent = { name: root.dataset.editorComponent, selector: selectorFor(root) };
        publishSelection(root);
        return;
      }
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
      const command = historyShortcut(event);
      if (command && mode === 'design' && !(event.target instanceof Element && event.target.closest('input,textarea,[contenteditable]'))) {
        event.preventDefault();
        send({type:'three-acts:history', command});
        return;
      }
      if (event.key !== 'Escape' || mode !== 'design' || document.activeElement?.isContentEditable) return;
      cmsSelectionAnchor = null;
      selectedCandidate = null;
      outline.restore();
      buildTree();
      document.querySelectorAll('[data-editor-selected]').forEach(element => element.removeAttribute('data-editor-selected'));
      if (overlay) overlay.hidden = true;
      send({type:'three-acts:clear-selection'});
      send({type:'three-acts:selection', selection:null});
    }, true);
    let outlineFrame = 0;
    new MutationObserver(records => {
      if (records.every(record => record.target instanceof Element && !safeElement(record.target))) return;
      if (outlineFrame) cancelAnimationFrame(outlineFrame);
      outlineFrame = requestAnimationFrame(() => { outlineFrame = 0; if (!activeEditor && !cmsRendering) refreshOutline(); });
    }).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['class', 'style', 'hidden', 'open', 'aria-hidden'] });
    window.addEventListener('scroll', () => drawOverlay(hoverCandidate || selectedCandidate), true);
    let resizeFrame = 0;
    window.addEventListener('resize', () => {
      if (resizeFrame) cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(() => {
        resizeFrame = 0;
        if (mode === 'design' && selectedCandidate?.element?.isConnected) outline.reveal(selectedCandidate.element);
        refreshOutline();
      });
    });
  }
    window.addEventListener('message', event => {
    if (event.source !== window.parent || event.origin !== origin || !event.data || typeof event.data !== 'object') return;
    if (frameSession ? event.data.session !== frameSession : event.data.session !== undefined) return;
    if (event.data.type === 'three-acts:mode' && ['design','preview','locked'].includes(event.data.mode)) {
      const nextMode = event.data.mode;
      if (activeEditor && nextMode !== mode) activeEditor.finish(nextMode === 'preview' && mode === 'design');
      if (nextMode === 'preview') { hoverCandidate = null; outline.restore(); }
      mode = event.data.mode;
      refreshOutline();
      if (overlay && mode !== 'design') overlay.hidden = true;
      else if (mode === 'design') drawOverlay(selectedCandidate);
      return;
    }
    if (event.data.type === 'three-acts:clear-selection') {
      cmsSelectionAnchor = null;
      editingComponent = null;
      selectedCandidate = null;
      outline.restore();
      buildTree();
      document.querySelectorAll('[data-editor-selected]').forEach(element => element.removeAttribute('data-editor-selected'));
      if (overlay) overlay.hidden = true;
      send({type:'three-acts:selection', selection:null});
      return;
    }
    if (event.data.type === 'three-acts:select-node' && typeof event.data.selector === 'string') {
      if (mode !== 'design') return;
      const element = validSelector(event.data.selector);
      if (!element || !safeElement(element)) return;
      document.querySelectorAll('[data-editor-selected]').forEach(node => node.removeAttribute('data-editor-selected'));
      publishSelection(element);
      if (outline.visibilityFor(element).state !== 'hidden') element.scrollIntoView({behavior:'smooth',block:'center'});
      return;
    }
    if (event.data.type === 'three-acts:tree-limit' && mode === 'design' && outline.loadMore(event.data.limit)) { buildTree(); return; }
    if (event.data.type === 'three-acts:enter-component') {
      const root = validSelector(event.data.selector);
      if (mode !== 'design' || !root || componentRoot(root) !== root) return;
      editingComponent = { name: root.dataset.editorComponent, selector: selectorFor(root) };
      publishSelection(root);
      return;
    }
    if (event.data.type === 'three-acts:exit-component') {
      const root = editingComponent ? validSelector(editingComponent.selector) : null;
      editingComponent = null;
      if (root) publishSelection(root);
      return;
    }
    if (event.data.type === 'three-acts:preview' && Array.isArray(event.data.documents)) {
      activate();
      const nextDesign = event.data.documents.find(doc => doc.id === 'design');
      if (nextDesign) { try { renderDesign(nextDesign.content); } catch { return; } }
      latestPreviewDocuments = event.data.documents;
      applyPreviewContent(event.data.documents);
      buildTree();
      drawOverlay(hoverCandidate || selectedCandidate);
      if (selectedCandidate?.element?.isConnected) send({type:'three-acts:selection', ...selectionFor(selectedCandidate.element)});
    }
    if (event.data.type === 'three-acts:focus' && typeof event.data.path === 'string') focus(`${event.data.id}.${event.data.path}`, true);
  });
  send({type:'three-acts:ready', route});
})();
