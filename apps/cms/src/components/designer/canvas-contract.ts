import { readCmsSource } from "@three-acts/cms-schema";
import { componentDefinitions } from "@three-acts/design";
import type { CanvasNode, CanvasSelection, CanvasTreeStatus } from "./canvas-types";

const canvasCategories = new Set(["element", "component", "cms"]);
function validVisibility(value: unknown) {
  if (value === undefined) return true;
  if (!value || typeof value !== "object") return false;
  const visibility = value as { state?: unknown; reason?: unknown };
  return typeof visibility.state === "string" && ["visible", "hidden", "revealed"].includes(visibility.state) && (visibility.state === "visible" && visibility.reason === undefined || typeof visibility.reason === "string" && visibility.reason.length > 0 && visibility.reason.length <= 220);
}

export function readCanvasTreeStatus(value: unknown): CanvasTreeStatus | null {
  if (!value || typeof value !== "object") return null;
  const status = value as CanvasTreeStatus;
  return Number.isInteger(status.limit) && status.limit >= 400 && status.limit <= 5000 && status.maximum === 5000 && Number.isInteger(status.loaded) && status.loaded >= 1 && status.loaded <= 5100 && Number.isInteger(status.total) && status.total >= status.loaded && status.total <= 5100 && typeof status.hasMore === "boolean" && typeof status.capped === "boolean" ? status : null;
}

export function readCanvasNodes(value: unknown): CanvasNode[] {
  if (!Array.isArray(value)) return [];
  const selectors = new Set<string>();
  return value.slice(0, 5100).filter((node): node is CanvasNode => {
    if (!node || typeof node !== "object" || typeof node.selector !== "string" || !node.selector || selectors.has(node.selector) || typeof node.label !== "string" || typeof node.tag !== "string" || !canvasCategories.has(node.category) || !Number.isInteger(node.depth) || node.depth < 0 || node.depth > 100 || (node.parentSelector !== null && !selectors.has(node.parentSelector))) return false;
    if (!validVisibility(node.visibility)) return false;
    selectors.add(node.selector);
    return true;
  });
}

export function isCanvasSelection(value: unknown): value is CanvasSelection {
  if (!value || typeof value !== "object") return false;
  const selection = value as CanvasSelection;
  const validBinding = (binding: unknown) => Boolean(binding && typeof binding === "object" && "id" in binding && typeof binding.id === "string" && "path" in binding && typeof binding.path === "string");
  return typeof selection.selector === "string" && typeof selection.label === "string" && typeof selection.tag === "string" && typeof selection.editable === "boolean" && canvasCategories.has(selection.category)
    && validVisibility(selection.visibility)
    && (selection.cmsSource === undefined || readCmsSource(selection.cmsSource) !== null)
    && (selection.textState === undefined || ["editable", "unbound", "structured", "empty"].includes(selection.textState))
    && (selection.textField === undefined || (validBinding(selection.textField) && typeof selection.textField.value === "string"))
    && (selection.textFormat === undefined || selection.textFormat === "prose" && selection.textField !== undefined && selection.editable === false)
    && (selection.attributes === undefined || (Array.isArray(selection.attributes) && selection.attributes.length <= 6 && selection.attributes.every((attribute) => attribute && ["href", "src", "alt", "title", "target", "aria-label"].includes(attribute.name) && typeof attribute.value === "string" && (attribute.binding === undefined || validBinding(attribute.binding)))))
    && (selection.sourceClasses === undefined || (Array.isArray(selection.sourceClasses) && selection.sourceClasses.length <= 100 && selection.sourceClasses.every(value => typeof value === "string")))
    && (selection.editingComponent === undefined || (typeof selection.editingComponent === "string" && Object.hasOwn(componentDefinitions, selection.editingComponent)))
    && (selection.component === undefined || (selection.component !== null && typeof selection.component === "object" && typeof selection.component.name === "string" && Object.hasOwn(componentDefinitions, selection.component.name) && (selection.component.instanceId === undefined || typeof selection.component.instanceId === "string") && Boolean(selection.component.props && typeof selection.component.props === "object" && !Array.isArray(selection.component.props) && Object.keys(selection.component.props).length <= 30 && Object.values(selection.component.props).every(value => typeof value === "string")) && (selection.component.sourceProps === undefined || Boolean(selection.component.sourceProps && typeof selection.component.sourceProps === "object" && !Array.isArray(selection.component.sourceProps) && Object.values(selection.component.sourceProps).every(value => typeof value === "string"))) && Array.isArray(selection.component.fields) && selection.component.fields.length <= 100 && selection.component.fields.every(field => validBinding(field) && typeof field.label === "string" && typeof field.value === "string")))
    && (selection.designTarget === undefined || (selection.designTarget !== null && typeof selection.designTarget === "object" && (selection.designTarget.kind === "element" ? typeof selection.designTarget.id === "string" : selection.designTarget.kind === "component" && Object.hasOwn(componentDefinitions, selection.designTarget.component) && Object.hasOwn(componentDefinitions[selection.designTarget.component].parts, selection.designTarget.part))))
    && (selection.classNames === undefined || (Array.isArray(selection.classNames) && selection.classNames.length <= 100 && selection.classNames.every((className) => typeof className === "string")))
    && Array.isArray(selection.breadcrumbs) && selection.breadcrumbs.length <= 100 && selection.breadcrumbs.every((crumb) => crumb && typeof crumb.selector === "string" && typeof crumb.label === "string")
    && Boolean(selection.styles && typeof selection.styles === "object" && !Array.isArray(selection.styles) && Object.values(selection.styles).every((value) => typeof value === "string"));
}
