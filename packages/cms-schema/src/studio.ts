import type { CmsCollection } from "./types";

/** A small client portfolio that exercises the same generic editor as production content. */
export const studioCollections: CmsCollection[] = [
  { id: "clients", label: "Clients", tableName: "clients", group: "Studio", titleField: "name", fields: [
    { key: "name", label: "Client name", type: "text", required: true },
    { key: "website", label: "Website", type: "link", helpText: "Public website for the client credit." }
  ], listColumns: [{ key: "name", label: "Client" }] },
  { id: "services", label: "Services", tableName: "services", group: "Studio", titleField: "name", fields: [
    { key: "name", label: "Service name", type: "text", required: true },
    { key: "description", label: "What we deliver", type: "textarea" }
  ], listColumns: [{ key: "name", label: "Service" }] },
  { id: "case-studies", label: "Case studies", tableName: "case_studies", group: "Studio", titleField: "title", fields: [
    { key: "title", label: "Project title", type: "text", required: true },
    { key: "slug", label: "URL slug", type: "slug", required: true },
    { key: "story", label: "Project story", type: "markdown", required: true, helpText: "Explain the challenge, approach, and outcome. Markdown is previewed below the source." },
    { key: "client", label: "Client", type: "reference", collectionId: "clients", required: true },
    { key: "services", label: "Services delivered", type: "reference", collectionId: "services", cardinality: "multiple", required: true, minItems: 1 },
    { key: "cover", label: "Project cover", type: "image", bucket: "cms-assets", accept: "image/*" },
    { key: "films", label: "Project films", type: "video", bucket: "cms-assets", accept: "video/*", cardinality: "multiple", itemRequired: true, maxItems: 4, helpText: "Upload the launch film and behind-the-scenes clips in playback order." },
    { key: "downloads", label: "Press downloads", type: "file", bucket: "cms-assets", cardinality: "multiple", itemRequired: true },
    { key: "launchedAt", label: "Launch date", type: "datetime" },
    { key: "duration", label: "Project duration (weeks)", type: "number" },
    { key: "featured", label: "Feature on homepage", type: "boolean" },
    { key: "sector", label: "Sector", type: "select", options: [{ label: "Hospitality", value: "hospitality" }, { label: "Community", value: "community" }] },
    { key: "website", label: "Visit project", type: "link" },
    { key: "testimonial", label: "Client testimonial", type: "object", fields: [
      { key: "name", label: "Name", type: "text", required: true },
      { key: "role", label: "Role", type: "text" },
      { key: "portrait", label: "Portrait", type: "image", bucket: "cms-assets", accept: "image/*" },
      { key: "quote", label: "Quote", type: "markdown", required: true },
      { key: "company", label: "Company website", type: "link" },
      { key: "featured", label: "Featured quote", type: "boolean" }
    ] },
    { key: "results", label: "Project results", type: "object", cardinality: "multiple", maxItems: 6, fields: [
      { key: "label", label: "Result", type: "text", required: true },
      { key: "value", label: "Measured improvement (%)", type: "number", required: true },
      { key: "detail", label: "Context", type: "textarea" }
    ] }
  ], listColumns: [{ key: "title", label: "Project" }, { key: "publishStatus", label: "Status", valueType: "status" }, { key: "launchedAt", label: "Launched", valueType: "datetime" }] }
];
