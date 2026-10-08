import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { ChevronDown, ChevronRight, ChevronsDownUp, ChevronsUpDown, Eye, EyeOff, Layers, Search } from "lucide-react";
import { Button, PanelHeader, ScrollArea } from "../atoms";
import type { CanvasNode, CanvasTreeStatus } from "./canvas-types";
import { getElementPresentation } from "./element-presentation";

type NavigatorProps = {
  nodes: CanvasNode[];
  selected: string | null;
  selectionVersion?: number;
  onSelect: (selector: string) => void;
  disabled: boolean;
  treeStatus?: CanvasTreeStatus | null;
  onLoadMore?: (limit: number) => void;
  actions?: ReactNode;
  onMoveSection?: (id: string, delta: number) => void;
  onReorderSection?: (id: string, targetId: string) => void;
};

const categoryLabel = { element: "Element", component: "Component", cms: "CMS" } as const;

/** Read-only outline of the preview canvas. */
export function Navigator({ nodes, selected, selectionVersion = 0, onSelect, disabled, treeStatus, onLoadMore, actions, onMoveSection, onReorderSection }: NavigatorProps) {
  const [query, setQuery] = useState("");
  const [disclosureOverrides, setDisclosureOverrides] = useState<Map<string, boolean>>(() => new Map());
  const [lastDisclosureSelection, setLastDisclosureSelection] = useState(selected);
  const [lastDisclosureVersion, setLastDisclosureVersion] = useState(selectionVersion);
  const itemRefs = useRef(new Map<string, HTMLButtonElement>());
  const revealSelectedPath = selected !== lastDisclosureSelection || selectionVersion !== lastDisclosureVersion;

  const { visibleNodes, parentBySelector, childrenBySelector, selectedAncestors, bySelector } = useMemo(() => {
    const bySelector = new Map(nodes.map((node) => [node.selector, node]));
    const parents = new Map<string, string | null>();
    const children = new Map<string, CanvasNode[]>();
    for (const node of nodes) {
      const validParent = node.parentSelector !== node.selector && bySelector.has(node.parentSelector ?? "")
        ? node.parentSelector
        : null;
      parents.set(node.selector, validParent);
      if (validParent) {
        const siblings = children.get(validParent) ?? [];
        siblings.push(node);
        children.set(validParent, siblings);
      }
    }

    const normalizedQuery = query.trim().toLowerCase();
    const matches = new Set<string>();
    if (normalizedQuery) {
      for (const node of nodes) {
        const presentation = getElementPresentation(node.tag, node.category);
        if (`${node.label} ${node.tag} ${presentation.label} ${categoryLabel[node.category]}`.toLowerCase().includes(normalizedQuery)) {
          let current: CanvasNode | undefined = node;
          const visited = new Set<string>();
          while (current && !visited.has(current.selector)) {
            visited.add(current.selector);
            matches.add(current.selector);
            const parent = parents.get(current.selector);
            current = parent ? bySelector.get(parent) : undefined;
          }
        }
      }
    }

    const selectedParents = new Set<string>();
    let parent = selected ? parents.get(selected) ?? null : null;
    while (parent && !selectedParents.has(parent)) {
      selectedParents.add(parent);
      parent = parents.get(parent) ?? null;
    }

    const visible = nodes.filter((node) => {
      if (normalizedQuery && !matches.has(node.selector)) return false;
      let currentParent = parents.get(node.selector) ?? null;
      const visited = new Set<string>();
      while (currentParent && !visited.has(currentParent)) {
        visited.add(currentParent);
        const parentNode = bySelector.get(currentParent);
        const isCollapsed = disclosureOverrides.get(currentParent) ?? (parentNode ? parentNode.depth >= 3 : false);
        if (!normalizedQuery && isCollapsed && !(revealSelectedPath && selectedParents.has(currentParent))) return false;
        currentParent = parents.get(currentParent) ?? null;
      }
      return true;
    });
    return { visibleNodes: visible, parentBySelector: parents, childrenBySelector: children, selectedAncestors: selectedParents, bySelector };
  }, [nodes, query, disclosureOverrides, selected, revealSelectedPath]);

  // Canvas selection can move into a closed branch; keep that selected node in view.
  useEffect(() => {
    if (!selected) return;
    itemRefs.current.get(selected)?.scrollIntoView({ block: "nearest" });
  }, [selected, visibleNodes]);

  function toggle(selector: string, isCurrentlyCollapsed?: boolean) {
    setLastDisclosureSelection(selected);
    setLastDisclosureVersion(selectionVersion);
    if (selectedAncestors.has(selector)) onSelect(selector);
    setDisclosureOverrides((current) => {
      const next = new Map(current);
      if (revealSelectedPath) for (const ancestor of selectedAncestors) next.set(ancestor, false);
      const node = bySelector.get(selector);
      const currentlyCollapsed = isCurrentlyCollapsed ?? (current.get(selector) ?? (node ? node.depth >= 3 : false));
      next.set(selector, !currentlyCollapsed);
      return next;
    });
  }

  function handleTreeKeyDown(event: KeyboardEvent<HTMLButtonElement>, node: CanvasNode, hasChildren: boolean, isCollapsed: boolean) {
    if (!disabled && node.section && onMoveSection && event.altKey && ["ArrowUp", "ArrowDown"].includes(event.key)) {
      event.preventDefault(); onSelect(node.selector); onMoveSection(node.section.id, event.key === "ArrowUp" ? -1 : 1); return;
    }
    const tree = event.currentTarget.closest('[role="tree"]');
    if (!tree) return;
    const items = Array.from(tree.querySelectorAll<HTMLButtonElement>('[role="treeitem"]'));
    const index = items.indexOf(event.currentTarget);
    let nextIndex: number | undefined;
    if (event.key === "ArrowDown") nextIndex = Math.min(items.length - 1, index + 1);
    else if (event.key === "ArrowUp") nextIndex = Math.max(0, index - 1);
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = items.length - 1;
    else if (event.key === "ArrowRight" && hasChildren) {
      if (isCollapsed) toggle(node.selector, isCollapsed);
      else {
        const childIndex = visibleNodes.findIndex((candidate) => parentBySelector.get(candidate.selector) === node.selector);
        if (childIndex >= 0) nextIndex = childIndex;
      }
    } else if (event.key === "ArrowLeft") {
      if (hasChildren && !isCollapsed) toggle(node.selector, isCollapsed);
      else {
        const parentIndex = visibleNodes.findIndex((candidate) => candidate.selector === parentBySelector.get(node.selector));
        if (parentIndex >= 0) nextIndex = parentIndex;
      }
    } else return;

    event.preventDefault();
    if (nextIndex !== undefined && items[nextIndex]) items[nextIndex].focus();
  }

  const expandableNodes = nodes.filter((node) => (childrenBySelector.get(node.selector)?.length ?? 0) > 0);

  return (
    <aside aria-label="Navigator" className="flex min-h-0 w-full flex-1 flex-col bg-cms-bg">
      <PanelHeader className="h-8 shrink-0 gap-1.5 px-2">
        <Layers aria-hidden="true" size={14} className="text-cms-subtle" />
        <span className="text-ui font-semibold text-cms-text">Navigator</span>
        <div className="ml-auto flex items-center gap-0.5">
          {actions}
          <button
            type="button"
            aria-label="Collapse all elements"
            title="Collapse all elements"
            disabled={disabled || expandableNodes.length === 0}
            onClick={() => {
              setLastDisclosureSelection(selected);
              setLastDisclosureVersion(selectionVersion);
              setDisclosureOverrides(new Map(expandableNodes.map((node) => [node.selector, true])));
            }}
            className="grid size-6 place-items-center rounded text-cms-subtle hover:bg-cms-raised hover:text-cms-text disabled:opacity-40"
          ><ChevronsUpDown aria-hidden="true" size={13} /></button>
          <button
            type="button"
            aria-label="Expand all elements"
            title="Expand all elements"
            disabled={disabled || expandableNodes.length === 0}
            onClick={() => {
              setLastDisclosureSelection(selected);
              setLastDisclosureVersion(selectionVersion);
              setDisclosureOverrides(new Map(expandableNodes.map((node) => [node.selector, false])));
            }}
            className="grid size-6 place-items-center rounded text-cms-subtle hover:bg-cms-raised hover:text-cms-text disabled:opacity-40"
          ><ChevronsDownUp aria-hidden="true" size={13} /></button>
        </div>
      </PanelHeader>

      <div className="shrink-0 border-b border-cms-line px-2 py-1">
        <label className="relative block">
          <span className="sr-only">Search elements</span>
          <Search aria-hidden="true" size={12} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-cms-subtle" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Find an element…"
            className="h-7 w-full rounded-cms border border-cms-line bg-cms-surface pl-7 pr-2 text-ui text-cms-text placeholder:text-cms-subtle focus:border-cms-accent focus:outline-none"
          />
        </label>
      </div>

      <ScrollArea className="min-h-0 flex-1" viewportClassName="py-1">
        {nodes.length === 0 ? (
          <p className="m-0 px-3 py-4 text-ui leading-4 text-cms-subtle">Elements from the page preview will appear here.</p>
        ) : visibleNodes.length === 0 ? (
          <p className="m-0 px-3 py-4 text-ui leading-4 text-cms-subtle">{treeStatus?.hasMore ? "No loaded elements match your search. Load more to search the rest of the outline." : "No elements match your search."}</p>
        ) : (
          <ul role="tree" aria-label="Page elements" className="m-0 list-none p-0">
            {visibleNodes.map((node, visibleIndex) => {
              const presentation = getElementPresentation(node.tag, node.category);
              const hasChildren = (childrenBySelector.get(node.selector)?.length ?? 0) > 0;
              const isCollapsed = !query.trim() && (disclosureOverrides.get(node.selector) ?? node.depth >= 3) && !(revealSelectedPath && selectedAncestors.has(node.selector));
              const isSelected = node.selector === selected;
              const parent = parentBySelector.get(node.selector);
              return (
                <li
                  role="none"
                  key={node.selector}
                  className={`flex h-[26px] items-center rounded-sm pr-1 ${isSelected ? "bg-cms-accent/20" : "hover:bg-cms-surface"}`}
                >
                  <span aria-hidden="true" className="shrink-0" style={{ width: Math.max(0, node.depth) * 12 }} />
                  {hasChildren ? (
                    <button
                      type="button"
                      aria-label={`${isCollapsed ? "Expand" : "Collapse"} ${node.label}`}
                      aria-expanded={!isCollapsed}
                      tabIndex={-1}
                      disabled={disabled}
                      onClick={() => toggle(node.selector, isCollapsed)}
                      className="grid size-4 shrink-0 place-items-center rounded text-cms-subtle hover:text-cms-text disabled:opacity-50"
                    >
                      {isCollapsed ? <ChevronRight aria-hidden="true" size={12} /> : <ChevronDown aria-hidden="true" size={12} />}
                    </button>
                  ) : <span aria-hidden="true" className="w-4 shrink-0" />}
                  <button
                    type="button"
                    role="treeitem"
                    data-canvas-selector={node.selector}
                    aria-level={Math.max(1, node.depth + 1)}
                    aria-expanded={hasChildren ? !isCollapsed : undefined}
                    aria-selected={isSelected}
                    aria-description={node.visibility?.reason}
                    tabIndex={isSelected || (visibleIndex === 0 && !visibleNodes.some((item) => item.selector === selected)) ? 0 : -1}
                    aria-label={`${categoryLabel[node.category]}: ${node.label}, ${node.tag}${parent ? ", nested element" : ""}`}
                    title={`${presentation.label}: ${node.label}`}
                    disabled={disabled}
                    ref={(element) => {
                      if (element) itemRefs.current.set(node.selector, element);
                      else itemRefs.current.delete(node.selector);
                    }}
                    onClick={() => onSelect(node.selector)}
                    draggable={Boolean(node.section && onReorderSection && !disabled)}
                    onDragStart={event => { if (node.section && onReorderSection && !disabled) { event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("application/three-acts-section", node.section.id); } }}
                    onDragOver={event => { if (node.section && onReorderSection && !disabled && event.dataTransfer.types.includes("application/three-acts-section")) { event.preventDefault(); event.dataTransfer.dropEffect = "move"; } }}
                    onDrop={event => { if (node.section && onReorderSection && !disabled) { const id = event.dataTransfer.getData("application/three-acts-section"); if (id) { event.preventDefault(); onReorderSection(id, node.section.id); } } }}
                    onKeyDown={(event) => handleTreeKeyDown(event, node, hasChildren, isCollapsed)}
                    className={`flex h-full min-w-0 flex-1 items-center gap-1.5 rounded-sm px-1 text-left text-ui outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-cms-accent disabled:opacity-50 ${isSelected ? "text-cms-text" : node.category === "component" ? "text-emerald-400" : node.category === "cms" ? "text-violet-400" : "text-cms-muted"}`}
                  >
                    <presentation.Icon aria-hidden="true" size={13} className={`shrink-0 ${presentation.color}`} />
                    <span className="min-w-0 flex-1 truncate">{node.label}</span>
                    {node.visibility?.state === "hidden" && <EyeOff aria-label="Hidden element" size={11} className="shrink-0 text-cms-subtle"/>}
                    {node.visibility?.state === "revealed" && <Eye aria-label="Temporarily revealed element" size={11} className="shrink-0 text-cms-accent"/>}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </ScrollArea>
      {treeStatus?.hasMore && <div aria-label="Navigator completeness" className="grid shrink-0 gap-1 border-t border-cms-line px-2 py-2">
        <span className="text-[10px] leading-4 text-cms-subtle">Showing {treeStatus.loaded} of {treeStatus.capped ? "at least " : ""}{treeStatus.total} elements.</span>
        {treeStatus.limit < treeStatus.maximum && treeStatus.total > treeStatus.limit ? <Button variant="ghost" disabled={disabled} onClick={() => onLoadMore?.(Math.min(treeStatus.maximum, treeStatus.limit + 400))}>Load more elements</Button> : <span className="text-[10px] leading-4 text-cms-muted">Outline safety limit reached. Canvas selections still appear here.</span>}
      </div>}
    </aside>
  );
}
