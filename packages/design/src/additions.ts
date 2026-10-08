export const basicElements = { div: "Div", section: "Section", h1: "Heading 1", h2: "Heading 2", h3: "Heading 3", p: "Paragraph", span: "Text", a: "Link", img: "Image", ul: "List", li: "List item" } as const;
export const insertableComponents = ["Button.Root", "Button.Link", "Grid.Root", "Section.Root", "Section.Container", "Typography.Display", "Typography.Title", "Typography.Lede", "Typography.Eyebrow"] as const;
export type AddedElement = { id: string; type: string; position: "inside" | "after"; text: string; attributes: Record<string, string> };
const identity = /^[a-zA-Z][a-zA-Z0-9_.:-]{0,179}$/;
export function validateAdditions(input: unknown): Record<string, AddedElement[]> {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Added elements must have source anchors.");
  const next: Record<string, AddedElement[]> = {}, ids = new Set<string>();
  let count = 0;
  for (const [anchor, nodes] of Object.entries(input)) {
    if (!identity.test(anchor) || ["__proto__", "constructor", "prototype"].includes(anchor) || !Array.isArray(nodes) || !nodes.length) throw new Error("Invalid element source anchor.");
    next[anchor] = nodes.map(value => {
      if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).some(key => !["id", "type", "position", "text", "attributes"].includes(key))) throw new Error("Invalid added element.");
      const { id, type, position, text, attributes } = value;
      if (typeof id !== "string" || !/^added-[a-zA-Z0-9_-]{1,80}$/.test(id) || ids.has(id) || id === anchor || ++count > 100) throw new Error("Use at most 100 distinct added elements.");
      ids.add(id);
      if (typeof type !== "string" || !Object.hasOwn(basicElements, type) && !(insertableComponents as readonly string[]).includes(type) || !["inside", "after"].includes(position) || typeof text !== "string" || text.length > 10000) throw new Error("Choose a supported element or component.");
      if (!attributes || typeof attributes !== "object" || Array.isArray(attributes) || Object.entries(attributes).some(([key, value]) => !["href", "src", "alt", "title", "aria-label"].includes(key) || typeof value !== "string" || value.length > 2000 || ["href", "src"].includes(key) && !/^(?:\/(?!\/)|#|https?:\/\/|mailto:|tel:)/i.test(value))) throw new Error("Invalid element attributes.");
      return { id, type, position, text, attributes: { ...attributes } } as AddedElement;
    });
  }
  function visit(anchor: string, parents = new Set<string>()) {
    if (parents.has(anchor) || parents.size > 12) throw new Error("Added elements cannot cycle or exceed 12 levels.");
    const path = new Set([...parents, anchor]);
    for (const node of next[anchor] ?? []) visit(node.id, path);
  }
  for (const nodes of Object.values(next)) for (const node of nodes) {
    if (node.type === "img" && next[node.id]?.some(child => child.position === "inside")) throw new Error("Images cannot contain elements.");
  }
  Object.keys(next).forEach(anchor => visit(anchor));
  return next;
}

export function additionLocation(additions: Record<string, AddedElement[]>, id: string): { anchor: string; index: number; node: AddedElement } | null {
  for (const [anchor, nodes] of Object.entries(additions)) {
    const index = nodes.findIndex(node => node.id === id);
    if (index >= 0) return { anchor, index, node: nodes[index] };
  }
  return null;
}
export function insertAddition(additions: Record<string, AddedElement[]>, anchor: string, node: AddedElement): void {
  const sibling = node.position === "after" ? additionLocation(additions, anchor) : null;
  if (sibling) additions[sibling.anchor].splice(sibling.index + 1, 0, { ...node, position: sibling.node.position });
  else (additions[anchor] ??= []).push(node);
}
export function moveAddition(additions: Record<string, AddedElement[]>, id: string, delta: number): void {
  const location = additionLocation(additions, id);
  if (!location) throw new Error("The element no longer exists.");
  const nodes = additions[location.anchor];
  const peers = nodes.map((node, index) => ({node,index})).filter(entry => entry.node.position === location.node.position);
  const target = peers[peers.findIndex(entry => entry.node.id === id) + delta]?.index;
  if (target === undefined) return;
  nodes.splice(location.index, 1); nodes.splice(target, 0, location.node);
}
export function removeAddition(additions: Record<string, AddedElement[]>, id: string): string[] {
  const location = additionLocation(additions, id);
  if (!location) return [];
  const removed = [id];
  const children = additions[id] ?? [];
  const following = children.filter(node => node.position === "after").map(node => ({...node,position:location.node.position}));
  for (const child of children.filter(node => node.position === "inside")) removed.push(...removeAddition(additions, child.id));
  additions[location.anchor].splice(location.index, 1, ...following);
  if (!additions[location.anchor].length) delete additions[location.anchor];
  delete additions[id];
  return removed;
}
