import { applyStyle, componentBaseClass, componentDefinitions, resolveProperties } from "@three-acts/design";
import { cn } from "@three-acts/utils";
const tags = { "Button.Root": "button", "Button.Link": "a", "Grid.Root": "div", "Section.Root": "section", "Section.Container": "div", "Typography.Display": "h1", "Typography.Title": "h2", "Typography.Lede": "p", "Typography.Eyebrow": "p" };
export function renderAddedElements(design) {
  document.querySelectorAll('[data-editor-added]').forEach(element => element.remove());
  function render(anchor, parent) {
    let previous = parent.tagName === "IMG" && parent.parentElement?.tagName === "PICTURE" ? parent.parentElement : parent;
    for (const [index, node] of (design.additions?.[anchor] ?? []).entries()) {
      const element = document.createElement(tags[node.type] ?? node.type);
      for (const [name, value] of Object.entries(node.attributes)) element.setAttribute(name, value);
      element.dataset.editorAdded = '';
      element.dataset.editorId = node.id;
      element.dataset.editorAddedPath = `additions.${anchor}.${index}`;
      element.dataset.staticField = `design.additions.${anchor}.${index}.text`;
      const component = componentDefinitions[node.type];
      const base = node.type === 'img' ? 'max-w-full' : '';
      element.dataset.editorBaseClass = base;
      if (component) {
        const sourceProps = component.defaultVariants;
        element.dataset.editorComponent = node.type;
        element.dataset.editorComponentLabel = component.label;
        element.dataset.editorInstance = node.id;
        element.dataset.editorSourceProps = JSON.stringify(sourceProps);
        element.dataset.editorCallerClass = base;
        element.dataset.editorPart = 'root';
        element.className = applyStyle(cn(componentBaseClass(node.type, resolveProperties(design, node.type, node.id, sourceProps)), base), design.components[node.type]?.parts.root);
      } else element.className = applyStyle(base, design.elements[node.id]);
      if (node.type.startsWith('Button.')) {
        const label = document.createElement('span');
        label.dataset.editorPart = 'label';
        label.dataset.staticField = element.dataset.staticField;
        label.className = applyStyle('', design.components[node.type]?.parts.label);
        label.textContent = node.text;
        element.append(label);
      } else if (node.type !== 'img') element.textContent = node.text;
      if (node.position === 'inside') parent.append(element);
      else { previous.after(element); previous = element; }
      render(node.id, element);
    }
  }
  // Snapshot original anchors: each added subtree is rendered exactly once.
  document.querySelectorAll('[data-editor-id]:not([data-editor-added])').forEach(element => {
    if (design.additions?.[element.dataset.editorId]) render(element.dataset.editorId, element);
  });
}
