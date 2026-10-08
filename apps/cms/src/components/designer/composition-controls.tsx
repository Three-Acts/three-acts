import { Menu } from "@base-ui-components/react/menu";
import { Plus, MoreHorizontal } from "lucide-react";
import { homeSections, type HomeSectionType } from "@three-acts/static-content";
import { basicElements, componentDefinitions, insertableComponents } from "@three-acts/design";
import { Tooltip } from "../atoms";
import { popupClass } from "../atoms/styles";

const itemClass = "flex cursor-default items-center gap-6 rounded-cms-sm px-2 py-1.5 text-ui outline-none data-disabled:pointer-events-none data-disabled:opacity-50 data-highlighted:bg-cms-raised";
const triggerClass = "grid size-6 shrink-0 place-items-center rounded-cms text-cms-muted hover:bg-cms-raised hover:text-cms-text disabled:opacity-40";
export function SectionActions({ disabled, hidden, first, last, onMove, onDuplicate, onToggle }: {
  disabled: boolean; hidden: boolean; first: boolean; last: boolean;
  onMove: (delta: number) => void; onDuplicate: () => void; onToggle: () => void;
}) {
  return <Menu.Root><Tooltip content="Section actions. Alt+↑/↓ reorders the selected section in Navigator."><Menu.Trigger className={triggerClass} disabled={disabled} aria-label="Section actions"><MoreHorizontal size={14}/></Menu.Trigger></Tooltip>
    <Menu.Portal><Menu.Positioner sideOffset={4} align="end" className="z-60 outline-none"><Menu.Popup aria-label="Section actions" className={`${popupClass} min-w-46 p-1`}>
      <Menu.Item className={itemClass} disabled={first} onClick={() => onMove(-1)}>Move up<span className="ml-auto text-cms-subtle">Alt ↑</span></Menu.Item>
      <Menu.Item className={itemClass} disabled={last} onClick={() => onMove(1)}>Move down<span className="ml-auto text-cms-subtle">Alt ↓</span></Menu.Item>
      <Menu.Item className={itemClass} onClick={onDuplicate}>Duplicate</Menu.Item>
      <Menu.Item className={itemClass} onClick={onToggle}>{hidden ? "Show section" : "Hide section"}</Menu.Item>
    </Menu.Popup></Menu.Positioner></Menu.Portal>
  </Menu.Root>;
}

export function InsertElement({ disabled, elementsDisabled, onInsert, onSection }: { disabled: boolean; elementsDisabled: boolean; onInsert: (type: string) => void; onSection?: (type: HomeSectionType) => void }) {
  return <Menu.Root><Tooltip content={disabled ? "Select an element in Navigator to add beside it or inside its container" : "Add inside the selected container or after the selected element"}><Menu.Trigger className={triggerClass} disabled={disabled} aria-label="Add element"><Plus size={13}/></Menu.Trigger></Tooltip>
    <Menu.Portal><Menu.Positioner sideOffset={4} align="end" className="z-60 outline-none"><Menu.Popup aria-label="Add elements" className={`${popupClass} max-h-96 min-w-46 overflow-auto p-1`}>
      <div className="px-2 py-1 text-[10px] text-cms-subtle">Basic elements</div>
      {Object.entries(basicElements).map(([type, label]) => <Menu.Item key={type} className={itemClass} disabled={elementsDisabled} onClick={() => onInsert(type)}>{label}</Menu.Item>)}
      <div className="mt-1 border-t border-cms-line px-2 py-1 text-[10px] text-cms-subtle">Components</div>
      {insertableComponents.map(type => <Menu.Item key={type} className={itemClass} disabled={elementsDisabled} onClick={() => onInsert(type)}>{componentDefinitions[type].label}</Menu.Item>)}
      {onSection && <><div className="mt-1 border-t border-cms-line px-2 py-1 text-[10px] text-cms-subtle">Page sections</div>{(Object.keys(homeSections) as HomeSectionType[]).map(type => <Menu.Item key={type} className={itemClass} onClick={() => onSection(type)}>{homeSections[type].label}</Menu.Item>)}</>}
    </Menu.Popup></Menu.Positioner></Menu.Portal>
  </Menu.Root>;
}

export function AddedElementActions({disabled,first,last,onAction}:{disabled:boolean;first:boolean;last:boolean;onAction:(action:"up"|"down"|"duplicate"|"remove")=>void}) {
  return <Menu.Root><Tooltip content="Move, duplicate or remove this added element"><Menu.Trigger className={triggerClass} disabled={disabled} aria-label="Element actions"><MoreHorizontal size={14}/></Menu.Trigger></Tooltip>
    <Menu.Portal><Menu.Positioner sideOffset={4} align="end" className="z-60 outline-none"><Menu.Popup aria-label="Element actions" className={`${popupClass} min-w-46 p-1`}>
      <Menu.Item className={itemClass} disabled={first} onClick={()=>onAction("up")}>Move up</Menu.Item>
      <Menu.Item className={itemClass} disabled={last} onClick={()=>onAction("down")}>Move down</Menu.Item>
      <Menu.Item className={itemClass} onClick={()=>onAction("duplicate")}>Duplicate</Menu.Item>
      <Menu.Item className={itemClass} onClick={()=>onAction("remove")}>Remove element</Menu.Item>
    </Menu.Popup></Menu.Positioner></Menu.Portal>
  </Menu.Root>;
}
