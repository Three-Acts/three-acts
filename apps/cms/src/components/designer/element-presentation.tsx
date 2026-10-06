import {
  Box,
  Database,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Heading5,
  Heading6,
  Image,
  Link2,
  List,
  PanelsTopLeft,
  PanelTop,
  Pilcrow,
  RectangleHorizontal,
  Square,
  SquareDashed,
  Type,
  Video,
  type LucideIcon
} from "lucide-react";

export type ElementCategory = "element" | "component" | "cms";

export type ElementPresentation = {
  Icon: LucideIcon;
  label: string;
  color: string;
};

const elementTypes: Record<string, Pick<ElementPresentation, "Icon" | "label">> = {
  a: { Icon: Link2, label: "Link" },
  article: { Icon: PanelTop, label: "Article" },
  aside: { Icon: PanelTop, label: "Aside" },
  blockquote: { Icon: Pilcrow, label: "Blockquote" },
  body: { Icon: Square, label: "Body" },
  button: { Icon: RectangleHorizontal, label: "Button" },
  div: { Icon: SquareDashed, label: "Div Block" },
  footer: { Icon: PanelTop, label: "Footer" },
  form: { Icon: RectangleHorizontal, label: "Form" },
  header: { Icon: PanelTop, label: "Header" },
  h1: { Icon: Heading1, label: "Heading 1" },
  h2: { Icon: Heading2, label: "Heading 2" },
  h3: { Icon: Heading3, label: "Heading 3" },
  h4: { Icon: Heading4, label: "Heading 4" },
  h5: { Icon: Heading5, label: "Heading 5" },
  h6: { Icon: Heading6, label: "Heading 6" },
  img: { Icon: Image, label: "Image" },
  li: { Icon: List, label: "List Item" },
  main: { Icon: PanelsTopLeft, label: "Main" },
  nav: { Icon: PanelTop, label: "Navigation" },
  ol: { Icon: List, label: "Ordered List" },
  p: { Icon: Pilcrow, label: "Paragraph" },
  section: { Icon: PanelTop, label: "Section" },
  span: { Icon: Type, label: "Text" },
  ul: { Icon: List, label: "List" },
  video: { Icon: Video, label: "Video" }
};

/** Returns a consistent icon, accessible type name, and accent for a canvas node. */
export function getElementPresentation(tag: string, category: ElementCategory): ElementPresentation {
  if (category === "component") return { Icon: Box, label: "Component", color: "text-emerald-400" };
  if (category === "cms") return { Icon: Database, label: "CMS item", color: "text-violet-400" };

  const key = tag.trim().toLowerCase();
  const type = elementTypes[key] ?? {
    Icon: SquareDashed,
    label: key ? key.charAt(0).toUpperCase() + key.slice(1) : "Element"
  };
  return { ...type, color: "text-cms-muted" };
}
